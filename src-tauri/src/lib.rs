pub mod adapters;
pub mod commands;
pub mod core;

use adapters::db::SqliteDatabase;
use core::ports::{CloudStorageProvider, GameRepository, SnapshotRepository};
use core::services::retention::RetentionPolicy;
use core::services::shield::ShieldService;
use core::services::snapshot::SnapshotService;
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Setup app data paths
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| std::env::current_dir().unwrap().join(".memcard_data"));

            fs::create_dir_all(&app_data_dir).expect("Failed to create app data directory");

            let db_path = app_data_dir.join("memcard.db");
            let snapshots_dir = app_data_dir.join("snapshots");
            fs::create_dir_all(&snapshots_dir).expect("Failed to create snapshots directory");

            let db = Arc::new(
                SqliteDatabase::new(&db_path).expect("Failed to initialize SQLite database"),
            );

            let snapshot_service = Arc::new(SnapshotService::new(
                Arc::clone(&db),
                Arc::clone(&db),
                snapshots_dir.clone(),
                ShieldService::default(),
                RetentionPolicy::default(),
            ));

            let cloud_provider = Arc::new(adapters::cloud::GoogleDriveProvider::new(
                "memcard-client",
            ));

            let (watch_tx, mut watch_rx) = tokio::sync::mpsc::channel(100);
            let watcher = Arc::new(tokio::sync::Mutex::new(
                adapters::fs_watcher::FsWatcherService::new(
                    std::time::Duration::from_secs(3),
                    ShieldService::default(),
                    watch_tx,
                )
                .expect("Failed to initialize filesystem watcher service"),
            ));

            let notifications_enabled = Arc::new(AtomicBool::new(true));

            app.manage(commands::AppState {
                db: Arc::clone(&db),
                snapshot_service: Arc::clone(&snapshot_service),
                snapshots_dir: snapshots_dir.clone(),
                cloud_provider: Arc::clone(&cloud_provider),
                watcher: Arc::clone(&watcher),
                notifications_enabled: Arc::clone(&notifications_enabled),
            });

            // Enroll existing games from database into watcher
            let watcher_for_init = Arc::clone(&watcher);
            let db_for_init = Arc::clone(&db);
            tauri::async_runtime::spawn(async move {
                if let Ok(games) = db_for_init.find_all().await {
                    let mut watcher_guard = watcher_for_init.lock().await;
                    for game in games {
                        let _ = watcher_guard
                            .enroll_game(adapters::fs_watcher::EnrolledGameWatch {
                                game_id: game.id,
                                path: std::path::PathBuf::from(&game.save_path),
                                last_known_hash: Some(game.current_hash),
                                last_known_size: None,
                            })
                            .await;
                    }
                }
            });

            // Spawn background task to process watcher events and emit push notifications
            let app_handle = app.handle().clone();
            let snapshot_service_for_watcher = Arc::clone(&snapshot_service);
            let db_for_watcher = Arc::clone(&db);
            let cloud_provider_for_watcher = Arc::clone(&cloud_provider);
            let notifications_enabled_for_watcher = Arc::clone(&notifications_enabled);

            tauri::async_runtime::spawn(async move {
                while let Some(event) = watch_rx.recv().await {
                    match event {
                        adapters::fs_watcher::WatchEvent::SaveChanged {
                            game_id,
                            new_hash: _,
                            size_bytes: _,
                            is_directory: _,
                        } => {
                            match snapshot_service_for_watcher
                                .create_snapshot(game_id, Some("Auto-save snapshot".to_string()))
                                .await
                            {
                                Ok(snapshot) => {
                                    let payload = serde_json::json!({
                                        "gameId": game_id.to_string(),
                                        "newHash": snapshot.hash,
                                        "snapshotId": snapshot.id.to_string(),
                                        "timestamp": snapshot.timestamp.to_rfc3339(),
                                    });
                                    let _ = app_handle.emit("watcher:save-changed", payload);

                                    // Discrete OS notification if Gamer Mode notifications are enabled
                                    if notifications_enabled_for_watcher.load(Ordering::Relaxed) {
                                        let game_name = if let Ok(Some(g)) =
                                            db_for_watcher.find_by_id(game_id).await
                                        {
                                            g.name
                                        } else {
                                            "Game save".to_string()
                                        };
                                        let _ = app_handle
                                            .notification()
                                            .builder()
                                            .title("MemCard")
                                            .body(format!("Save protected for {}", game_name))
                                            .show();
                                    }

                                    // Automatic cloud sync loop if authenticated
                                    if cloud_provider_for_watcher.is_authenticated().await {
                                        let _ = app_handle.emit(
                                            "sync:status-changed",
                                            serde_json::json!({
                                                "gameId": game_id.to_string(),
                                                "status": "syncing"
                                            }),
                                        );

                                        let archive_path = snapshot_service_for_watcher
                                            .get_snapshot_archive_path(game_id, &snapshot);

                                        match tokio::fs::read(&archive_path).await {
                                            Ok(zip_bytes) => {
                                                if let Ok(Some(mut game)) =
                                                    db_for_watcher.find_by_id(game_id).await
                                                {
                                                    match cloud_provider_for_watcher
                                                        .upload_snapshot(&game, &snapshot, zip_bytes)
                                                        .await
                                                    {
                                                        Ok(_remote_id) => {
                                                            game.sync_status =
                                                                crate::core::domain::SyncStatus::Synced;
                                                            let _ = db_for_watcher.save_game(&game).await;
                                                            let _ = app_handle.emit(
                                                                "sync:status-changed",
                                                                serde_json::json!({
                                                                    "gameId": game_id.to_string(),
                                                                    "status": "synced"
                                                                }),
                                                            );
                                                        }
                                                        Err(err) => {
                                                            eprintln!(
                                                                "Cloud upload failed for game {}: {}",
                                                                game_id, err
                                                            );
                                                            game.sync_status =
                                                                crate::core::domain::SyncStatus::Error;
                                                            let _ = db_for_watcher.save_game(&game).await;
                                                            let _ = app_handle.emit(
                                                                "sync:status-changed",
                                                                serde_json::json!({
                                                                    "gameId": game_id.to_string(),
                                                                    "status": "error",
                                                                    "message": err.to_string()
                                                                }),
                                                            );
                                                        }
                                                    }
                                                }
                                            }
                                            Err(err) => {
                                                eprintln!(
                                                    "Failed to read snapshot archive for cloud upload: {}",
                                                    err
                                                );
                                            }
                                        }
                                    }
                                }
                                Err(err) => {
                                    eprintln!(
                                        "Failed to create auto-save snapshot for game {}: {}",
                                        game_id, err
                                    );
                                }
                            }
                        }
                        adapters::fs_watcher::WatchEvent::CorruptionDetected {
                            game_id,
                            reason,
                            detected_size_bytes,
                        } => {
                            let game_name =
                                if let Ok(Some(game)) = db_for_watcher.find_by_id(game_id).await {
                                    game.name
                                } else {
                                    "Unknown Game".to_string()
                                };

                            let reason_str = match reason {
                                core::services::shield::CorruptionReason::ZeroBytes => "zero_bytes",
                                core::services::shield::CorruptionReason::AbnormalShrink {
                                    ..
                                } => "abnormal_shrink",
                            };

                            let previous_size = db_for_watcher
                                .find_by_game_id(game_id)
                                .await
                                .ok()
                                .and_then(|snaps| snaps.first().map(|s| s.size_bytes))
                                .unwrap_or(0);

                            let payload = serde_json::json!({
                                "gameId": game_id.to_string(),
                                "gameName": game_name,
                                "detectedSizeBytes": detected_size_bytes,
                                "previousSizeBytes": previous_size,
                                "reason": reason_str,
                            });
                            let _ = app_handle.emit("shield:corruption-detected", payload);

                            // Discrete OS notification alert for save corruption
                            if notifications_enabled_for_watcher.load(Ordering::Relaxed) {
                                let _ = app_handle
                                    .notification()
                                    .builder()
                                    .title("MemCard Corruption Shield Alert")
                                    .body(format!(
                                        "Save blocked for {}: {}",
                                        game_name,
                                        if reason_str == "zero_bytes" {
                                            "Empty save (0 bytes) detected."
                                        } else {
                                            "Abrupt size reduction (>80%) detected."
                                        }
                                    ))
                                    .show();
                            }
                        }
                        adapters::fs_watcher::WatchEvent::Error { game_id, message } => {
                            eprintln!("Watcher error for game {:?}: {}", game_id, message);
                        }
                    }
                }
            });

            // Tray icon & context menu setup
            let quit_item = MenuItem::with_id(app, "quit", "Quit MemCard", true, None::<&str>)?;
            let show_item = MenuItem::with_id(app, "show", "Open MemCard", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("MemCard")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => {
                        app.exit(0);
                    }
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            // Window close interception: hide to tray instead of quitting
            if let Some(window) = app.get_webview_window("main") {
                let win_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = win_clone.hide();
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::ping,
            commands::games::add_game,
            commands::games::list_games,
            commands::games::remove_game,
            commands::snapshots::create_snapshot,
            commands::snapshots::list_snapshots,
            commands::snapshots::restore_snapshot,
            commands::snapshots::pin_snapshot,
            commands::cloud::get_sync_status,
            commands::cloud::login_cloud,
            commands::cloud::logout_cloud,
            commands::cloud::resolve_conflict,
            commands::get_notifications_enabled,
            commands::set_notifications_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running MemCard application");
}

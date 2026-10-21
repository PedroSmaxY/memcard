pub mod adapters;
pub mod commands;
pub mod core;

use adapters::db::SqliteDatabase;
use core::services::retention::RetentionPolicy;
use core::services::shield::ShieldService;
use core::services::snapshot::SnapshotService;
use std::fs;
use std::sync::Arc;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Manager;

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

            app.manage(commands::AppState {
                db,
                snapshot_service,
                snapshots_dir,
            });

            // Tray icon & context menu setup
            let quit_item = MenuItem::with_id(app, "quit", "Quit MemCard", true, None::<&str>)?;
            let show_item = MenuItem::with_id(app, "show", "Open MemCard", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("MemCard Cloud")
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running MemCard Cloud application");
}

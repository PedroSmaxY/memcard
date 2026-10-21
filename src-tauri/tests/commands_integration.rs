use anyhow::Result;
use memcard_cloud_lib::adapters::db::SqliteDatabase;
use memcard_cloud_lib::commands::cloud::{resolve_conflict_handler, ResolveConflictRequest};
use memcard_cloud_lib::commands::games::{
    add_game_handler, list_games_handler, remove_game_handler, AddGameRequest, RemoveGameRequest,
};
use memcard_cloud_lib::commands::snapshots::{
    create_snapshot_handler, list_snapshots_handler, pin_snapshot_handler,
    restore_snapshot_handler, CreateSnapshotRequest,
};
use memcard_cloud_lib::core::domain::Platform;
use memcard_cloud_lib::core::services::retention::RetentionPolicy;
use memcard_cloud_lib::core::services::shield::ShieldService;
use memcard_cloud_lib::core::services::snapshot::SnapshotService;
use std::fs;
use std::sync::Arc;
use tempfile::tempdir;
use uuid::Uuid;

async fn setup_command_env() -> Result<(
    tempfile::TempDir,
    Arc<SqliteDatabase>,
    Arc<SnapshotService<SqliteDatabase, SqliteDatabase>>,
    std::path::PathBuf,
)> {
    let dir = tempdir()?;
    let snapshots_dir = dir.path().join("snapshots");
    fs::create_dir_all(&snapshots_dir)?;

    let db = Arc::new(SqliteDatabase::new_in_memory()?);
    let snapshot_service = Arc::new(SnapshotService::new(
        Arc::clone(&db),
        Arc::clone(&db),
        snapshots_dir.clone(),
        ShieldService::default(),
        RetentionPolicy::new(5),
    ));

    Ok((dir, db, snapshot_service, snapshots_dir))
}

#[tokio::test]
async fn test_add_game_rejects_non_existent_path() -> Result<()> {
    let (_dir, db, snapshot_service, _snapshots_dir) = setup_command_env().await?;

    let req = AddGameRequest {
        name: "Phantom Game".to_string(),
        platform: Platform::Ps1,
        save_path: "/non/existent/path/save.mcd".to_string(),
        emulator_preset: Some("duckstation".to_string()),
    };

    let result = add_game_handler(&db, &snapshot_service, req).await;
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("does not exist on disk"));

    let games = list_games_handler(&db).await.unwrap();
    assert_eq!(games.len(), 0);

    Ok(())
}

#[tokio::test]
async fn test_add_game_rejects_zero_byte_save_and_rolls_back() -> Result<()> {
    let (dir, db, snapshot_service, _snapshots_dir) = setup_command_env().await?;

    let empty_save = dir.path().join("empty_save.srm");
    fs::write(&empty_save, b"")?; // 0 bytes!

    let req = AddGameRequest {
        name: "Zero Byte Game".to_string(),
        platform: Platform::Nintendo,
        save_path: empty_save.to_string_lossy().to_string(),
        emulator_preset: Some("snes9x".to_string()),
    };

    let result = add_game_handler(&db, &snapshot_service, req).await;
    assert!(
        result.is_err(),
        "add_game MUST reject zero-byte save during baseline snapshot creation"
    );
    let err = result.unwrap_err();
    assert!(
        err.contains("Zero-Byte Shield") || err.contains("ZeroByteSave"),
        "Error message should mention Zero-Byte Shield: {}",
        err
    );

    // Verify rollback: game MUST NOT exist in database
    let games = list_games_handler(&db).await.unwrap();
    assert_eq!(
        games.len(),
        0,
        "Database record must be cleanly rolled back when baseline creation fails"
    );

    Ok(())
}

#[tokio::test]
async fn test_add_game_with_valid_single_file_creates_baseline() -> Result<()> {
    let (dir, db, snapshot_service, _snapshots_dir) = setup_command_env().await?;

    let valid_save = dir.path().join("valid_save.sav");
    fs::write(&valid_save, b"Hero Level 99 - Final Boss Defeated")?;

    let req = AddGameRequest {
        name: "Final Fantasy VII".to_string(),
        platform: Platform::Ps1,
        save_path: valid_save.to_string_lossy().to_string(),
        emulator_preset: Some("duckstation".to_string()),
    };

    let game = add_game_handler(&db, &snapshot_service, req).await.unwrap();
    assert_eq!(game.name, "Final Fantasy VII");
    assert_eq!(game.total_snapshots, 1);
    assert!(!game.is_directory);

    let snapshots = list_snapshots_handler(&db, game.id).await.unwrap();
    assert_eq!(snapshots.len(), 1);
    assert_eq!(
        snapshots[0].label.as_deref(),
        Some("Initial baseline snapshot")
    );

    Ok(())
}

#[tokio::test]
async fn test_add_game_with_valid_directory_creates_baseline() -> Result<()> {
    let (dir, db, snapshot_service, _snapshots_dir) = setup_command_env().await?;

    let save_dir = dir.path().join("switch_user_save");
    fs::create_dir_all(&save_dir)?;
    fs::write(save_dir.join("system.dat"), b"Profile Settings Data")?;
    fs::write(save_dir.join("slot0.bin"), b"Game State Slot 0")?;

    let req = AddGameRequest {
        name: "Zelda: Tears of the Kingdom".to_string(),
        platform: Platform::Nintendo,
        save_path: save_dir.to_string_lossy().to_string(),
        emulator_preset: Some("ryujinx".to_string()),
    };

    let game = add_game_handler(&db, &snapshot_service, req).await.unwrap();
    assert_eq!(game.name, "Zelda: Tears of the Kingdom");
    assert!(game.is_directory);
    assert_eq!(game.total_snapshots, 1);

    Ok(())
}

#[tokio::test]
async fn test_remove_game_with_and_without_deleting_snapshots() -> Result<()> {
    let (dir, db, snapshot_service, snapshots_dir) = setup_command_env().await?;

    // 1. Create Game 1
    let save1 = dir.path().join("game1.sav");
    fs::write(&save1, b"Save 1 Data Content")?;
    let game1 = add_game_handler(
        &db,
        &snapshot_service,
        AddGameRequest {
            name: "Game 1".to_string(),
            platform: Platform::Nintendo,
            save_path: save1.to_string_lossy().to_string(),
            emulator_preset: None,
        },
    )
    .await
    .unwrap();

    let game1_dir = snapshots_dir.join(game1.id.to_string());
    assert!(game1_dir.exists(), "Snapshot folder must exist on disk");

    // Remove Game 1 without deleting snapshots
    remove_game_handler(
        &db,
        &snapshots_dir,
        RemoveGameRequest {
            game_id: game1.id,
            delete_snapshots: false,
        },
    )
    .await
    .unwrap();

    // Game 1 removed from DB but snapshots preserved on disk
    let games = list_games_handler(&db).await.unwrap();
    assert_eq!(games.len(), 0);
    assert!(
        game1_dir.exists(),
        "Snapshots folder must be retained when delete_snapshots=false"
    );

    // 2. Create Game 2
    let save2 = dir.path().join("game2.sav");
    fs::write(&save2, b"Save 2 Data Content")?;
    let game2 = add_game_handler(
        &db,
        &snapshot_service,
        AddGameRequest {
            name: "Game 2".to_string(),
            platform: Platform::Ps2,
            save_path: save2.to_string_lossy().to_string(),
            emulator_preset: None,
        },
    )
    .await
    .unwrap();

    let game2_dir = snapshots_dir.join(game2.id.to_string());
    assert!(game2_dir.exists());

    // Remove Game 2 with deleting snapshots
    remove_game_handler(
        &db,
        &snapshots_dir,
        RemoveGameRequest {
            game_id: game2.id,
            delete_snapshots: true,
        },
    )
    .await
    .unwrap();

    assert!(
        !game2_dir.exists(),
        "Snapshots folder must be deleted when delete_snapshots=true"
    );

    Ok(())
}

#[tokio::test]
async fn test_snapshot_lifecycle_create_list_pin_restore() -> Result<()> {
    let (dir, db, snapshot_service, _snapshots_dir) = setup_command_env().await?;

    let save_path = dir.path().join("metroid.sav");
    fs::write(&save_path, b"Sector 1 Cleared")?;

    let game = add_game_handler(
        &db,
        &snapshot_service,
        AddGameRequest {
            name: "Metroid Fusion".to_string(),
            platform: Platform::Nintendo,
            save_path: save_path.to_string_lossy().to_string(),
            emulator_preset: Some("mgba".to_string()),
        },
    )
    .await
    .unwrap();

    // 1. Create a 2nd snapshot (Sector 2)
    fs::write(&save_path, b"Sector 2 Cleared - Varia Suit Acquired")?;
    let snap2 = create_snapshot_handler(
        &snapshot_service,
        CreateSnapshotRequest {
            game_id: game.id,
            label: Some("Sector 2".to_string()),
        },
    )
    .await
    .unwrap();

    // 2. List snapshots
    let list = list_snapshots_handler(&db, game.id).await.unwrap();
    assert_eq!(list.len(), 2);

    // 3. Pin Snapshot 2
    pin_snapshot_handler(&db, snap2.id, true).await.unwrap();
    let updated_list = list_snapshots_handler(&db, game.id).await.unwrap();
    let updated_snap2 = updated_list.iter().find(|s| s.id == snap2.id).unwrap();
    assert!(updated_snap2.is_pinned);

    // Unpin Snapshot 2
    pin_snapshot_handler(&db, snap2.id, false).await.unwrap();
    let unpinned_list = list_snapshots_handler(&db, game.id).await.unwrap();
    let unpinned_snap2 = unpinned_list.iter().find(|s| s.id == snap2.id).unwrap();
    assert!(!unpinned_snap2.is_pinned);

    // 4. Restore Baseline (Sector 1)
    let baseline_snap = list.iter().find(|s| s.id != snap2.id).unwrap();
    restore_snapshot_handler(&snapshot_service, game.id, baseline_snap.id)
        .await
        .unwrap();

    let restored_bytes = fs::read(&save_path)?;
    assert_eq!(restored_bytes, b"Sector 1 Cleared");

    // 5. Restore Snapshot 2 (Sector 2)
    restore_snapshot_handler(&snapshot_service, game.id, snap2.id)
        .await
        .unwrap();
    let restored_bytes2 = fs::read(&save_path)?;
    assert_eq!(restored_bytes2, b"Sector 2 Cleared - Varia Suit Acquired");

    // 6. Unknown game id failure
    let invalid_id = Uuid::new_v4();
    let err = create_snapshot_handler(
        &snapshot_service,
        CreateSnapshotRequest {
            game_id: invalid_id,
            label: None,
        },
    )
    .await;
    assert!(err.is_err());

    Ok(())
}

#[test]
fn test_resolve_conflict_handler_validates_actions() {
    let game_id = Uuid::new_v4();

    assert!(resolve_conflict_handler(ResolveConflictRequest {
        game_id,
        action: "keep_local".to_string(),
    })
    .is_ok());

    assert!(resolve_conflict_handler(ResolveConflictRequest {
        game_id,
        action: "use_cloud".to_string(),
    })
    .is_ok());

    assert!(resolve_conflict_handler(ResolveConflictRequest {
        game_id,
        action: "branch_slot".to_string(),
    })
    .is_ok());

    let invalid = resolve_conflict_handler(ResolveConflictRequest {
        game_id,
        action: "invalid_action_unknown".to_string(),
    });
    assert!(invalid.is_err());
    assert!(invalid
        .unwrap_err()
        .contains("Unknown conflict resolution action"));
}

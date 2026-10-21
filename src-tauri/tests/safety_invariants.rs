use anyhow::Result;
use chrono::Utc;
use memcard_cloud_lib::adapters::db::SqliteDatabase;
use memcard_cloud_lib::core::domain::{Game, Platform, SyncStatus};
use memcard_cloud_lib::core::ports::{GameRepository, SnapshotRepository};
use memcard_cloud_lib::core::services::retention::RetentionPolicy;
use memcard_cloud_lib::core::services::shield::ShieldService;
use memcard_cloud_lib::core::services::snapshot::SnapshotService;
use std::fs;
use std::sync::Arc;
use tempfile::tempdir;
use uuid::Uuid;

async fn setup_test_context() -> Result<(
    tempfile::TempDir,
    Arc<SqliteDatabase>,
    SnapshotService<SqliteDatabase, SqliteDatabase>,
    Uuid,
    std::path::PathBuf,
)> {
    let dir = tempdir()?;
    let snapshots_dir = dir.path().join("snapshots");
    let saves_dir = dir.path().join("saves");
    fs::create_dir_all(&saves_dir)?;
    fs::create_dir_all(&snapshots_dir)?;

    let save_file = saves_dir.join("game_save.sav");
    fs::write(
        &save_file,
        b"Valid Initial Save Data 1024 bytes long content for testing safety shields...",
    )?;

    let db = Arc::new(SqliteDatabase::new_in_memory()?);
    let game_id = Uuid::new_v4();
    let game = Game {
        id: game_id,
        name: "Test Safety Game".to_string(),
        platform: Platform::Ps1,
        save_path: save_file.to_string_lossy().to_string(),
        is_directory: false,
        current_hash: "initial_test_hash".to_string(),
        last_modified_at: Utc::now(),
        sync_status: SyncStatus::LocalOnly,
        total_snapshots: 0,
        emulator_preset: Some("duckstation".to_string()),
    };
    db.save_game(&game).await?;

    let service = SnapshotService::new(
        Arc::clone(&db),
        Arc::clone(&db),
        snapshots_dir,
        ShieldService::default(),
        RetentionPolicy::new(3),
    );

    Ok((dir, db, service, game_id, save_file))
}

#[tokio::test]
async fn test_zero_byte_shield_rejects_empty_save_on_snapshot_creation() -> Result<()> {
    let (_dir, db, service, game_id, save_file) = setup_test_context().await?;

    // Overwrite save with 0 bytes (emulator crash simulation)
    fs::write(&save_file, b"")?;

    let result = service
        .create_snapshot(game_id, Some("Corrupt snapshot".to_string()))
        .await;

    assert!(
        result.is_err(),
        "Zero-Byte Shield MUST reject a 0-byte file from creating a snapshot"
    );
    let err_msg = result.unwrap_err().to_string();
    assert!(
        err_msg.contains("ZeroByteSave") || err_msg.contains("Zero-Byte"),
        "Error message should explicitly specify Zero-Byte Shield rejection: {}",
        err_msg
    );

    // Verify no snapshot was persisted in database
    let snapshots = db.find_by_game_id(game_id).await?;
    assert_eq!(snapshots.len(), 0);

    Ok(())
}

#[tokio::test]
async fn test_shield_rejects_abrupt_shrink_over_eighty_percent() -> Result<()> {
    let (_dir, db, service, game_id, save_file) = setup_test_context().await?;

    // 1. Create a baseline snapshot with 10,000 bytes
    let large_save_data = vec![0x42u8; 10_000];
    fs::write(&save_file, &large_save_data)?;
    let snap1 = service
        .create_snapshot(game_id, Some("10KB Baseline".to_string()))
        .await?;
    assert_eq!(snap1.size_bytes, 10_000);

    // 2. Abruptly shrink save to 1,000 bytes (>80% reduction)
    let tiny_save_data = vec![0x42u8; 1_000];
    fs::write(&save_file, &tiny_save_data)?;

    let result = service
        .create_snapshot(game_id, Some("Abruptly shrunk snapshot".to_string()))
        .await;

    assert!(
        result.is_err(),
        "Shield MUST reject abrupt size reduction > 80%"
    );
    let err_msg = result.unwrap_err().to_string();
    assert!(
        err_msg.contains("AbnormalSizeReduction") || err_msg.contains("Corruption"),
        "Error should cite abnormal size reduction: {}",
        err_msg
    );

    // Verify only the baseline snapshot exists
    let snapshots = db.find_by_game_id(game_id).await?;
    assert_eq!(snapshots.len(), 1);

    Ok(())
}

#[tokio::test]
async fn test_shield_accepts_normal_shrink_and_growth() -> Result<()> {
    let (_dir, db, service, game_id, save_file) = setup_test_context().await?;

    // 1. Baseline: 10,000 bytes
    fs::write(&save_file, vec![0x42u8; 10_000])?;
    service
        .create_snapshot(game_id, Some("Baseline".to_string()))
        .await?;

    // 2. Normal shrink to 8,500 bytes (15% drop, allowable under the 80% threshold)
    fs::write(&save_file, vec![0x42u8; 8_500])?;
    let snap2 = service
        .create_snapshot(game_id, Some("Normal shrink".to_string()))
        .await;
    assert!(snap2.is_ok(), "Normal save size reduction must be accepted");

    // 3. Growth to 15,000 bytes
    fs::write(&save_file, vec![0x42u8; 15_000])?;
    let snap3 = service
        .create_snapshot(game_id, Some("Growth".to_string()))
        .await;
    assert!(snap3.is_ok(), "Normal save size growth must be accepted");

    let snapshots = db.find_by_game_id(game_id).await?;
    assert_eq!(snapshots.len(), 3);

    Ok(())
}

#[tokio::test]
async fn test_restore_fails_when_target_snapshot_archive_is_missing() -> Result<()> {
    let (dir, db, service, game_id, save_file) = setup_test_context().await?;

    // 1. Create a snapshot
    let snap = service
        .create_snapshot(game_id, Some("Valid Snapshot".to_string()))
        .await?;

    // 2. Delete the archive file from disk
    let archive_path = dir
        .path()
        .join("snapshots")
        .join(game_id.to_string())
        .join(format!(
            "{}_{}.zip",
            snap.timestamp.format("%Y%m%dT%H%M%SZ"),
            &snap.hash[..8]
        ));
    if archive_path.exists() {
        fs::remove_file(&archive_path)?;
    }

    // 3. Mutate the active save file
    let original_content = b"Current active save that should not be touched";
    fs::write(&save_file, original_content)?;

    // 4. Attempt restore
    let result = service.restore_snapshot(game_id, snap.id).await;
    assert!(result.is_err(), "Restoring from missing archive must fail");

    // 5. Verify the active save file was NOT modified or destroyed
    let after_content = fs::read(&save_file)?;
    assert_eq!(
        after_content, original_content,
        "Active save file must remain 100% intact when restore fails"
    );

    let game = db.find_by_id(game_id).await?.unwrap();
    assert_eq!(game.total_snapshots, 1);

    Ok(())
}

#[tokio::test]
async fn test_restore_fails_when_target_snapshot_archive_is_corrupted() -> Result<()> {
    let (dir, _db, service, game_id, save_file) = setup_test_context().await?;

    // 1. Create a snapshot
    let snap = service
        .create_snapshot(game_id, Some("Will Corrupt".to_string()))
        .await?;

    // 2. Corrupt the archive ZIP with random non-ZIP garbage
    let archive_path = dir
        .path()
        .join("snapshots")
        .join(game_id.to_string())
        .join(format!(
            "{}_{}.zip",
            snap.timestamp.format("%Y%m%dT%H%M%SZ"),
            &snap.hash[..8]
        ));
    fs::write(
        &archive_path,
        b"CORRUPTED_NOT_A_VALID_ZIP_HEADER_DATA_123456789",
    )?;

    // 3. Active save content
    let original_content = b"Active Save Intact Data";
    fs::write(&save_file, original_content)?;

    // 4. Attempt restore
    let result = service.restore_snapshot(game_id, snap.id).await;
    assert!(result.is_err(), "Restoring corrupted ZIP archive must fail");

    // 5. Verify active save remains intact
    let current_content = fs::read(&save_file)?;
    assert_eq!(
        current_content, original_content,
        "Active save file must remain untouched when archive extraction fails"
    );

    Ok(())
}

#[tokio::test]
async fn test_retention_policy_never_prunes_pinned_snapshots() -> Result<()> {
    let (_dir, db, service, game_id, save_file) = setup_test_context().await?;

    // Capacity is configured as 3 in setup_test_context.
    // 1. Create Snapshot 1 and PIN it
    fs::write(&save_file, b"Checkpoint 1 - Milestone Boss")?;
    let snap1 = service
        .create_snapshot(game_id, Some("Milestone 1".to_string()))
        .await?;
    db.set_pinned(snap1.id, true).await?;

    // 2. Create Snapshot 2 and PIN it
    fs::write(&save_file, b"Checkpoint 2 - Rare Item Acquired")?;
    let snap2 = service
        .create_snapshot(game_id, Some("Milestone 2".to_string()))
        .await?;
    db.set_pinned(snap2.id, true).await?;

    // 3. Create Snapshots 3, 4, and 5 (unpinned)
    for i in 3..=5 {
        fs::write(&save_file, format!("Checkpoint {}", i).as_bytes())?;
        service
            .create_snapshot(game_id, Some(format!("Auto {}", i)))
            .await?;
    }

    let all_snapshots = db.find_by_game_id(game_id).await?;

    // Pinned snapshots MUST still be present
    let has_snap1 = all_snapshots.iter().any(|s| s.id == snap1.id);
    let has_snap2 = all_snapshots.iter().any(|s| s.id == snap2.id);

    assert!(has_snap1, "Pinned snapshot 1 must never be pruned");
    assert!(has_snap2, "Pinned snapshot 2 must never be pruned");

    Ok(())
}

#[cfg(unix)]
#[tokio::test]
async fn test_restore_aborts_and_preserves_active_save_if_pre_backup_fails() -> Result<()> {
    use std::os::unix::fs::PermissionsExt;
    let (dir, _db, service, game_id, save_file) = setup_test_context().await?;

    // 1. Create a valid snapshot
    let snap = service
        .create_snapshot(game_id, Some("Valid Snapshot".to_string()))
        .await?;

    // 2. Active save data before restore
    let active_save_data = b"Active Save Data That MUST NOT Be Overwritten If Backup Fails";
    fs::write(&save_file, active_save_data)?;

    // 3. Make snapshots directory read-only so pre_restore_backup ZIP creation fails
    let game_snapshots_dir = dir.path().join("snapshots").join(game_id.to_string());
    let mut perms = fs::metadata(&game_snapshots_dir)?.permissions();
    perms.set_mode(0o555); // read-only
    fs::set_permissions(&game_snapshots_dir, perms.clone())?;

    // 4. Attempt restore
    let result = service.restore_snapshot(game_id, snap.id).await;

    // Reset permissions so tempdir cleanup works cleanly
    perms.set_mode(0o755);
    let _ = fs::set_permissions(&game_snapshots_dir, perms);

    assert!(
        result.is_err(),
        "Restore MUST fail if pre-restore backup fails"
    );
    let err_str = result.unwrap_err().to_string();
    assert!(
        err_str.contains("pre-restore safety backup") || err_str.contains("Permission denied"),
        "Error must mention pre-restore backup failure: {}",
        err_str
    );

    // 5. Verify the active save file was NEVER overwritten
    let current_bytes = fs::read(&save_file)?;
    assert_eq!(
        current_bytes, active_save_data,
        "Active save file MUST remain 100% intact when pre-restore backup fails"
    );

    Ok(())
}

#[tokio::test]
async fn test_game_running_guard_blocks_restore_when_file_is_locked() -> Result<()> {
    let (_dir, _db, service, game_id, save_file) = setup_test_context().await?;

    // 1. Create a snapshot to restore later
    let snap = service
        .create_snapshot(game_id, Some("Pre-Lock Snapshot".to_string()))
        .await?;

    // 2. Make save file non-writable (simulating active exclusive write lock)
    let mut perms = fs::metadata(&save_file)?.permissions();
    perms.set_readonly(true);
    fs::set_permissions(&save_file, perms.clone())?;

    // 3. Attempt restore while locked
    let result = service.restore_snapshot(game_id, snap.id).await;

    // Reset permissions so cleanup works cleanly
    perms.set_readonly(false);
    let _ = fs::set_permissions(&save_file, perms);

    assert!(
        result.is_err(),
        "GameRunningGuard MUST block restore when target file is locked/not writable"
    );
    let err_msg = result.unwrap_err().to_string();
    assert!(
        err_msg.contains("currently running with an open lock")
            || err_msg.contains("Please close the game first"),
        "Error message must specify GameRunningGuard lock: {}",
        err_msg
    );

    Ok(())
}

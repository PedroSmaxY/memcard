use anyhow::Result;
use chrono::Utc;
use memcard_lib::adapters::db::SqliteDatabase;
use memcard_lib::adapters::fs_watcher::{EnrolledGameWatch, FsWatcherService, WatchEvent};
use memcard_lib::core::domain::{Game, Platform, Snapshot, SyncStatus};
use memcard_lib::core::ports::{CloudStorageProvider, GameRepository, SnapshotRepository};
use memcard_lib::core::services::retention::RetentionPolicy;
use memcard_lib::core::services::shield::{CorruptionReason, ShieldService, ShieldVerdict};
use memcard_lib::core::services::snapshot::SnapshotService;
use std::fs;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tempfile::tempdir;
use tokio::sync::mpsc;
use uuid::Uuid;

// Mock Cloud Provider that records upload calls
struct MockCloudProvider {
    upload_count: Arc<AtomicUsize>,
}

#[async_trait::async_trait]
impl CloudStorageProvider for MockCloudProvider {
    async fn is_authenticated(&self) -> bool {
        true
    }

    async fn upload_snapshot(
        &self,
        _game: &Game,
        _snapshot: &Snapshot,
        _data: Vec<u8>,
    ) -> Result<String> {
        self.upload_count.fetch_add(1, Ordering::SeqCst);
        Ok("mock_cloud_id".to_string())
    }

    async fn download_snapshot(&self, _remote_file_id: &str) -> Result<Vec<u8>> {
        Ok(vec![])
    }
}

#[tokio::test]
async fn test_integrated_watcher_success_pipeline() -> Result<()> {
    let dir = tempdir()?;
    let saves_dir = dir.path().join("saves");
    let snapshots_dir = dir.path().join("snapshots");
    fs::create_dir_all(&saves_dir)?;
    fs::create_dir_all(&snapshots_dir)?;

    let save_file = saves_dir.join("memory_card.mcd");
    fs::write(&save_file, b"Original Save Data Block 1234")?;

    let db = Arc::new(SqliteDatabase::new_in_memory()?);
    let game_id = Uuid::new_v4();
    let game = Game {
        id: game_id,
        name: "Grandia PS1".to_string(),
        platform: Platform::Ps1,
        save_path: save_file.to_string_lossy().to_string(),
        is_directory: false,
        current_hash: "hash_original".to_string(),
        last_modified_at: Utc::now(),
        sync_status: SyncStatus::LocalOnly,
        total_snapshots: 0,
        emulator_preset: Some("duckstation".to_string()),
    };
    db.save_game(&game).await?;

    let snapshot_service = Arc::new(SnapshotService::new(
        Arc::clone(&db),
        Arc::clone(&db),
        snapshots_dir,
        ShieldService::default(),
        RetentionPolicy::new(5),
    ));

    let (tx, mut rx) = mpsc::channel(10);
    let mut watcher =
        FsWatcherService::new(Duration::from_millis(50), ShieldService::default(), tx)?;

    watcher
        .enroll_game(EnrolledGameWatch {
            game_id,
            path: save_file.clone(),
            last_known_hash: Some("hash_original".to_string()),
            last_known_size: Some(29),
        })
        .await?;

    // Simulate game writing save to disk
    fs::write(
        &save_file,
        b"Updated Save Data Block 5678 - Game Saved Successfully",
    )?;
    watcher.trigger_path_change(save_file.clone()).await;

    // Receive debounced watcher event
    let event = tokio::time::timeout(Duration::from_secs(4), rx.recv()).await?;
    match event {
        Some(WatchEvent::SaveChanged {
            game_id: id,
            new_hash,
            size_bytes,
            ..
        }) => {
            assert_eq!(id, game_id);
            assert_eq!(size_bytes, 54);

            // Execute snapshot creation triggered by watcher pipeline
            let snapshot = snapshot_service
                .create_snapshot(game_id, Some("Auto watcher snapshot".to_string()))
                .await?;

            assert_eq!(snapshot.game_id, game_id);
            assert_eq!(snapshot.hash, new_hash);

            // Verify SQLite persistence
            let snapshots_in_db = db.find_by_game_id(game_id).await?;
            assert_eq!(snapshots_in_db.len(), 1);
            assert_eq!(snapshots_in_db[0].hash, new_hash);
        }
        other => panic!("Expected SaveChanged watch event, got: {:?}", other),
    }

    Ok(())
}

#[tokio::test]
async fn test_integrated_watcher_corruption_shield_pipeline() -> Result<()> {
    let dir = tempdir()?;
    let saves_dir = dir.path().join("saves");
    let snapshots_dir = dir.path().join("snapshots");
    fs::create_dir_all(&saves_dir)?;
    fs::create_dir_all(&snapshots_dir)?;

    let save_file = saves_dir.join("zelda.sav");
    let baseline_data = vec![0x99u8; 10_000];
    fs::write(&save_file, &baseline_data)?;

    let db = Arc::new(SqliteDatabase::new_in_memory()?);
    let game_id = Uuid::new_v4();
    let game = Game {
        id: game_id,
        name: "Zelda Wind Waker".to_string(),
        platform: Platform::Pc,
        save_path: save_file.to_string_lossy().to_string(),
        is_directory: false,
        current_hash: "hash_10k".to_string(),
        last_modified_at: Utc::now(),
        sync_status: SyncStatus::LocalOnly,
        total_snapshots: 0,
        emulator_preset: Some("zelda_wwhd".to_string()),
    };
    db.save_game(&game).await?;

    let snapshot_service = Arc::new(SnapshotService::new(
        Arc::clone(&db),
        Arc::clone(&db),
        snapshots_dir,
        ShieldService::default(),
        RetentionPolicy::new(5),
    ));

    // Baseline snapshot
    let baseline_snap = snapshot_service
        .create_snapshot(game_id, Some("10KB Baseline".to_string()))
        .await?;
    assert_eq!(baseline_snap.size_bytes, 10_000);

    let (tx, mut rx) = mpsc::channel(10);
    let mut watcher =
        FsWatcherService::new(Duration::from_millis(50), ShieldService::default(), tx)?;

    watcher
        .enroll_game(EnrolledGameWatch {
            game_id,
            path: save_file.clone(),
            last_known_hash: Some(baseline_snap.hash.clone()),
            last_known_size: Some(10_000),
        })
        .await?;

    // Simulate crash: save drops to 0 bytes
    fs::write(&save_file, b"")?;
    watcher.trigger_path_change(save_file.clone()).await;

    let event = tokio::time::timeout(Duration::from_secs(4), rx.recv()).await?;
    match event {
        Some(WatchEvent::CorruptionDetected {
            game_id: id,
            reason,
            detected_size_bytes,
        }) => {
            assert_eq!(id, game_id);
            assert_eq!(reason, CorruptionReason::ZeroBytes);
            assert_eq!(detected_size_bytes, 0);

            // Attempting to create snapshot MUST be rejected by Shield
            let snap_res = snapshot_service.create_snapshot(game_id, None).await;
            assert!(snap_res.is_err());

            // Verify DB STILL only contains the single original baseline snapshot
            let snaps_in_db = db.find_by_game_id(game_id).await?;
            assert_eq!(snaps_in_db.len(), 1);
            assert_eq!(snaps_in_db[0].id, baseline_snap.id);
        }
        other => panic!("Expected CorruptionDetected event, got: {:?}", other),
    }

    Ok(())
}

#[tokio::test]
async fn test_cloud_upload_shield_inhibition_on_zero_byte_and_abrupt_shrink() -> Result<()> {
    let shield = ShieldService::default();
    let cloud_upload_counter = Arc::new(AtomicUsize::new(0));
    let mock_cloud = MockCloudProvider {
        upload_count: Arc::clone(&cloud_upload_counter),
    };

    let game = Game {
        id: Uuid::new_v4(),
        name: "Mario 64 PC".to_string(),
        platform: Platform::Pc,
        save_path: "/tmp/fake".to_string(),
        is_directory: false,
        current_hash: "hash123".to_string(),
        last_modified_at: Utc::now(),
        sync_status: SyncStatus::LocalOnly,
        total_snapshots: 1,
        emulator_preset: None,
    };

    let snapshot = Snapshot {
        id: Uuid::new_v4(),
        game_id: game.id,
        hash: "hash123".to_string(),
        timestamp: Utc::now(),
        size_bytes: 0,
        is_pinned: false,
        label: None,
    };

    // Case 1: Zero-byte save
    let zero_byte_check = shield.evaluate(0, Some(5000));
    assert!(matches!(
        zero_byte_check,
        ShieldVerdict::Corrupted {
            reason: CorruptionReason::ZeroBytes
        }
    ));
    // Cloud upload must NOT be executed
    if matches!(zero_byte_check, ShieldVerdict::Safe) {
        let _ = mock_cloud.upload_snapshot(&game, &snapshot, vec![]).await;
    }
    assert_eq!(cloud_upload_counter.load(Ordering::SeqCst), 0);

    // Case 2: Abrupt reduction >80% (from 10,000 to 500 bytes)
    let shrink_check = shield.evaluate(500, Some(10_000));
    assert!(matches!(
        shrink_check,
        ShieldVerdict::Corrupted {
            reason: CorruptionReason::AbnormalShrink { .. }
        }
    ));
    if matches!(shrink_check, ShieldVerdict::Safe) {
        let _ = mock_cloud.upload_snapshot(&game, &snapshot, vec![]).await;
    }
    assert_eq!(cloud_upload_counter.load(Ordering::SeqCst), 0);

    // Case 3: Legitimate size (9,500 bytes from 10,000)
    let valid_check = shield.evaluate(9_500, Some(10_000));
    assert_eq!(valid_check, ShieldVerdict::Safe);
    if matches!(valid_check, ShieldVerdict::Safe) {
        let _ = mock_cloud
            .upload_snapshot(&game, &snapshot, vec![1, 2, 3])
            .await;
    }
    assert_eq!(cloud_upload_counter.load(Ordering::SeqCst), 1);

    Ok(())
}

#[tokio::test]
async fn test_sqlite_persistence_failure_resilience() -> Result<()> {
    let db = SqliteDatabase::new_in_memory()?;

    // 1. Querying non-existent game returns None, not an unhandled error
    let non_existent = db.find_by_id(Uuid::new_v4()).await?;
    assert!(non_existent.is_none());

    // 2. Listing snapshots for non-existent game returns empty vector
    let empty_snapshots = db.find_by_game_id(Uuid::new_v4()).await?;
    assert!(empty_snapshots.is_empty());

    // 3. Setting pin on non-existent snapshot fails gracefully with error
    let pin_res = db.set_pinned(Uuid::new_v4(), true).await;
    assert!(
        pin_res.is_err(),
        "Pinning non-existent snapshot should return error"
    );

    // 4. Deleting a non-existent game finishes cleanly
    let delete_res = db.delete(Uuid::new_v4()).await;
    assert!(delete_res.is_ok());

    // 5. Enrolling game with duplicate save_path is rejected by UNIQUE constraint
    let game1 = Game {
        id: Uuid::new_v4(),
        name: "Game 1".to_string(),
        platform: Platform::Ps1,
        save_path: "/unique/save/path.srm".to_string(),
        is_directory: false,
        current_hash: "hash_a".to_string(),
        last_modified_at: Utc::now(),
        sync_status: SyncStatus::LocalOnly,
        total_snapshots: 0,
        emulator_preset: None,
    };
    db.save_game(&game1).await?;

    let game2_duplicate_path = Game {
        id: Uuid::new_v4(),
        name: "Game 2 Duplicate".to_string(),
        platform: Platform::Ps2,
        save_path: "/unique/save/path.srm".to_string(),
        is_directory: false,
        current_hash: "hash_b".to_string(),
        last_modified_at: Utc::now(),
        sync_status: SyncStatus::LocalOnly,
        total_snapshots: 0,
        emulator_preset: None,
    };
    let duplicate_res = db.save_game(&game2_duplicate_path).await;
    assert!(
        duplicate_res.is_err(),
        "SQLite UNIQUE constraint on save_path MUST reject duplicate enrollment"
    );

    Ok(())
}

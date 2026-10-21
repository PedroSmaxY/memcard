use crate::adapters::archive::{create_snapshot_zip, restore_snapshot_zip};
use crate::core::domain::Snapshot;
use crate::core::ports::{GameRepository, SnapshotRepository};
use crate::core::services::guard::{GameRunningGuard, LockStatus};
use crate::core::services::hash::calculate_save_hash;
use crate::core::services::retention::RetentionPolicy;
use crate::core::services::shield::{ShieldService, ShieldVerdict};
use anyhow::{Context, Result};
use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use uuid::Uuid;

pub struct SnapshotService<G: GameRepository, S: SnapshotRepository> {
    game_repo: Arc<G>,
    snapshot_repo: Arc<S>,
    snapshots_dir: PathBuf,
    shield_service: ShieldService,
    retention_policy: RetentionPolicy,
}

impl<G: GameRepository, S: SnapshotRepository> SnapshotService<G, S> {
    pub fn new(
        game_repo: Arc<G>,
        snapshot_repo: Arc<S>,
        snapshots_dir: PathBuf,
        shield_service: ShieldService,
        retention_policy: RetentionPolicy,
    ) -> Self {
        Self {
            game_repo,
            snapshot_repo,
            snapshots_dir,
            shield_service,
            retention_policy,
        }
    }

    /// Computes the absolute path to the stored ZIP archive for a given snapshot
    pub fn get_snapshot_archive_path(&self, game_id: Uuid, snapshot: &Snapshot) -> PathBuf {
        self.snapshots_dir.join(game_id.to_string()).join(format!(
            "{}_{}.zip",
            snapshot.timestamp.format("%Y%m%dT%H%M%SZ"),
            &snapshot.hash[..8]
        ))
    }

    /// Creates an immutable `.zip` snapshot of an enrolled game save,
    /// protected by the Zero-Byte & Corruption Shield and applying the retention policy.
    pub async fn create_snapshot(&self, game_id: Uuid, label: Option<String>) -> Result<Snapshot> {
        let game = self
            .game_repo
            .find_by_id(game_id)
            .await?
            .context("Game not found")?;

        let save_path = Path::new(&game.save_path);
        if !save_path.exists() {
            anyhow::bail!(
                "Game save path does not exist on disk: {}",
                save_path.display()
            );
        }

        // 1. Calculate current hash and size
        let (current_hash, current_size, _) = calculate_save_hash(save_path)?;

        // 2. Query previous snapshots to get baseline size for corruption check
        let existing_snapshots = self.snapshot_repo.find_by_game_id(game_id).await?;
        let previous_size = existing_snapshots.first().map(|s| s.size_bytes);

        // 3. Shield evaluation
        match self.shield_service.evaluate(current_size, previous_size) {
            ShieldVerdict::Safe => {}
            ShieldVerdict::Corrupted { reason } => {
                anyhow::bail!(
                    "Snapshot rejected by Zero-Byte / Corruption Shield: {:?}",
                    reason
                );
            }
        }

        // 4. Archive into immutable ZIP
        let snapshot_id = Uuid::new_v4();
        let now = Utc::now();
        let archive_filename = format!(
            "{}_{}.zip",
            now.format("%Y%m%dT%H%M%SZ"),
            &current_hash[..8]
        );
        let game_snapshots_dir = self.snapshots_dir.join(game_id.to_string());
        fs::create_dir_all(&game_snapshots_dir)?;
        let archive_path = game_snapshots_dir.join(&archive_filename);

        let _zip_bytes = create_snapshot_zip(save_path, &archive_path)?;

        let snapshot = Snapshot {
            id: snapshot_id,
            game_id,
            hash: current_hash.clone(),
            timestamp: now,
            size_bytes: current_size,
            is_pinned: false,
            label,
        };

        // 5. Persist snapshot record
        self.snapshot_repo.save_snapshot(&snapshot).await?;

        // 6. Update game state
        let mut updated_game = game;
        updated_game.current_hash = current_hash;
        updated_game.last_modified_at = now;
        self.game_repo.save_game(&updated_game).await?;

        // 7. Apply Retention Policy
        self.snapshot_repo
            .prune_oldest(game_id, self.retention_policy.max_snapshots)
            .await?;

        Ok(snapshot)
    }

    /// Restores a historical snapshot, strictly guarded by the Game Running Guard
    /// and guaranteeing a pre-restore backup snapshot prior to overwriting active state.
    pub async fn restore_snapshot(&self, game_id: Uuid, snapshot_id: Uuid) -> Result<()> {
        let game = self
            .game_repo
            .find_by_id(game_id)
            .await?
            .context("Game not found")?;

        let save_path = Path::new(&game.save_path);

        // 1. Game Running Guard: Check file lock
        match GameRunningGuard::check_file_lock(save_path) {
            LockStatus::Available => {}
            LockStatus::Locked { path, reason } => {
                anyhow::bail!(
                    "Cannot restore save: The game or emulator is currently running with an open lock on '{}' ({}). Please close the game first.",
                    path,
                    reason
                );
            }
        }

        // 2. Find snapshot metadata
        let snapshots = self.snapshot_repo.find_by_game_id(game_id).await?;
        let target_snapshot = snapshots
            .iter()
            .find(|s| s.id == snapshot_id)
            .context("Target snapshot not found in history")?;

        // 3. Locate archive file
        let game_snapshots_dir = self.snapshots_dir.join(game_id.to_string());
        let archive_filename = format!(
            "{}_{}.zip",
            target_snapshot.timestamp.format("%Y%m%dT%H%M%SZ"),
            &target_snapshot.hash[..8]
        );
        let archive_path = game_snapshots_dir.join(&archive_filename);

        if !archive_path.exists() {
            anyhow::bail!(
                "Snapshot archive file missing from storage: {}",
                archive_path.display()
            );
        }

        // 4. Pre-restore safety backup of active save (if it exists)
        if save_path.exists() {
            let backup_filename = format!(
                "pre_restore_backup_{}.zip",
                Utc::now().format("%Y%m%dT%H%M%SZ")
            );
            let backup_path = game_snapshots_dir.join(&backup_filename);
            create_snapshot_zip(save_path, &backup_path).with_context(|| {
                format!(
                    "Failed to create verified pre-restore safety backup at '{}'. Restoration aborted to prevent save loss.",
                    backup_path.display()
                )
            })?;
        }

        // 5. Atomic extraction and replacement
        restore_snapshot_zip(&archive_path, save_path)?;

        // 6. Update current hash in database
        let (new_hash, _, _) = calculate_save_hash(save_path)?;
        let mut updated_game = game;
        updated_game.current_hash = new_hash;
        updated_game.last_modified_at = Utc::now();
        self.game_repo.save_game(&updated_game).await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::adapters::db::SqliteDatabase;
    use crate::core::domain::{Game, Platform, SyncStatus};
    use tempfile::tempdir;

    #[tokio::test]
    async fn creates_and_restores_snapshots_with_safety_guard() -> Result<()> {
        let dir = tempdir()?;
        let snapshots_dir = dir.path().join("snapshots");
        let saves_dir = dir.path().join("saves");
        fs::create_dir_all(&saves_dir)?;

        let save_file = saves_dir.join("zelda.srm");
        fs::write(&save_file, b"Dungeon 1 Completed")?;

        let db = Arc::new(SqliteDatabase::new_in_memory()?);
        let game_id = Uuid::new_v4();
        let game = Game {
            id: game_id,
            name: "Zelda".to_string(),
            platform: Platform::Nintendo,
            save_path: save_file.to_string_lossy().to_string(),
            is_directory: false,
            current_hash: "initial_hash".to_string(),
            last_modified_at: Utc::now(),
            sync_status: SyncStatus::LocalOnly,
            total_snapshots: 0,
            emulator_preset: None,
        };
        db.save_game(&game).await?;

        let service = SnapshotService::new(
            Arc::clone(&db),
            Arc::clone(&db),
            snapshots_dir,
            ShieldService::default(),
            RetentionPolicy::new(5),
        );

        // 1. Take Snapshot 1
        let snap1 = service
            .create_snapshot(game_id, Some("Dungeon 1".to_string()))
            .await?;
        assert_eq!(snap1.game_id, game_id);

        // 2. Modify save (Dungeon 2)
        fs::write(&save_file, b"Dungeon 2 Completed")?;
        let snap2 = service
            .create_snapshot(game_id, Some("Dungeon 2".to_string()))
            .await?;

        // 3. Rollback to Snapshot 1
        service.restore_snapshot(game_id, snap1.id).await?;

        // 4. Verify content restored to Dungeon 1
        let restored_content = fs::read(&save_file)?;
        assert_eq!(restored_content, b"Dungeon 1 Completed");

        // 5. Roll forward to Snapshot 2
        service.restore_snapshot(game_id, snap2.id).await?;
        let restored_content2 = fs::read(&save_file)?;
        assert_eq!(restored_content2, b"Dungeon 2 Completed");

        Ok(())
    }
}

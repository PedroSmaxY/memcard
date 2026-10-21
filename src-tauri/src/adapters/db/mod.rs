use crate::core::domain::{Game, Platform, Snapshot, SyncStatus};
use crate::core::ports::{GameRepository, SnapshotRepository};
use anyhow::{Context, Result};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use rusqlite::{params, Connection};
use std::path::Path;
use std::sync::Arc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Clone)]
pub struct SqliteDatabase {
    conn: Arc<Mutex<Connection>>,
}

impl SqliteDatabase {
    /// Opens or creates an embedded SQLite database at the specified path,
    /// enabling WAL mode and applying migrations.
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self> {
        let conn = Connection::open(path)?;
        Self::initialize_schema(&conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    /// Creates an in-memory SQLite database, ideal for automated unit testing.
    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open_in_memory()?;
        Self::initialize_schema(&conn)?;
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    fn initialize_schema(conn: &Connection) -> Result<()> {
        conn.execute_batch(
            "
            PRAGMA journal_mode = WAL;
            PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                platform TEXT NOT NULL,
                save_path TEXT NOT NULL UNIQUE,
                is_directory INTEGER NOT NULL,
                current_hash TEXT NOT NULL,
                last_modified_at TEXT NOT NULL,
                sync_status TEXT NOT NULL,
                total_snapshots INTEGER NOT NULL DEFAULT 0,
                emulator_preset TEXT
            );

            CREATE TABLE IF NOT EXISTS snapshots (
                id TEXT PRIMARY KEY,
                game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
                hash TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                is_pinned INTEGER NOT NULL DEFAULT 0,
                label TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_snapshots_game_id ON snapshots(game_id);
            CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON snapshots(timestamp DESC);
            ",
        )
        .context("Failed to initialize SQLite schema")?;
        Ok(())
    }
}

#[async_trait]
impl GameRepository for SqliteDatabase {
    async fn find_all(&self) -> Result<Vec<Game>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id, name, platform, save_path, is_directory, current_hash, last_modified_at, sync_status, total_snapshots, emulator_preset FROM games ORDER BY name ASC"
        )?;

        let games = stmt
            .query_map([], |row| {
                let id_str: String = row.get(0)?;
                let platform_str: String = row.get(2)?;
                let is_dir_int: i32 = row.get(4)?;
                let timestamp_str: String = row.get(6)?;
                let sync_status_str: String = row.get(7)?;

                let platform = match platform_str.as_str() {
                    "ps1" => Platform::Ps1,
                    "ps2" => Platform::Ps2,
                    "nintendo" => Platform::Nintendo,
                    "modern" => Platform::Modern,
                    _ => Platform::Pc,
                };

                let sync_status = match sync_status_str.as_str() {
                    "synced" => SyncStatus::Synced,
                    "syncing" => SyncStatus::Syncing,
                    "conflict" => SyncStatus::Conflict,
                    "error" => SyncStatus::Error,
                    _ => SyncStatus::LocalOnly,
                };

                let last_modified_at = DateTime::parse_from_rfc3339(&timestamp_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());

                Ok(Game {
                    id: Uuid::parse_str(&id_str).unwrap_or_default(),
                    name: row.get(1)?,
                    platform,
                    save_path: row.get(3)?,
                    is_directory: is_dir_int != 0,
                    current_hash: row.get(5)?,
                    last_modified_at,
                    sync_status,
                    total_snapshots: row.get::<_, i64>(8)? as usize,
                    emulator_preset: row.get(9)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(games)
    }

    async fn find_by_id(&self, id: Uuid) -> Result<Option<Game>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id, name, platform, save_path, is_directory, current_hash, last_modified_at, sync_status, total_snapshots, emulator_preset FROM games WHERE id = ?1"
        )?;

        let id_str = id.to_string();
        let mut rows = stmt.query(params![id_str])?;

        if let Some(row) = rows.next()? {
            let platform_str: String = row.get(2)?;
            let is_dir_int: i32 = row.get(4)?;
            let timestamp_str: String = row.get(6)?;
            let sync_status_str: String = row.get(7)?;

            let platform = match platform_str.as_str() {
                "ps1" => Platform::Ps1,
                "ps2" => Platform::Ps2,
                "nintendo" => Platform::Nintendo,
                "modern" => Platform::Modern,
                _ => Platform::Pc,
            };

            let sync_status = match sync_status_str.as_str() {
                "synced" => SyncStatus::Synced,
                "syncing" => SyncStatus::Syncing,
                "conflict" => SyncStatus::Conflict,
                "error" => SyncStatus::Error,
                _ => SyncStatus::LocalOnly,
            };

            let last_modified_at = DateTime::parse_from_rfc3339(&timestamp_str)
                .map(|dt| dt.with_timezone(&Utc))
                .unwrap_or_else(|_| Utc::now());

            Ok(Some(Game {
                id,
                name: row.get(1)?,
                platform,
                save_path: row.get(3)?,
                is_directory: is_dir_int != 0,
                current_hash: row.get(5)?,
                last_modified_at,
                sync_status,
                total_snapshots: row.get::<_, i64>(8)? as usize,
                emulator_preset: row.get(9)?,
            }))
        } else {
            Ok(None)
        }
    }

    async fn save_game(&self, game: &Game) -> Result<()> {
        let conn = self.conn.lock().await;
        let platform_str = match game.platform {
            Platform::Ps1 => "ps1",
            Platform::Ps2 => "ps2",
            Platform::Nintendo => "nintendo",
            Platform::Modern => "modern",
            Platform::Pc => "pc",
        };

        let sync_status_str = match game.sync_status {
            SyncStatus::Synced => "synced",
            SyncStatus::Syncing => "syncing",
            SyncStatus::Conflict => "conflict",
            SyncStatus::Error => "error",
            SyncStatus::LocalOnly => "localonly",
        };

        conn.execute(
            "INSERT INTO games (id, name, platform, save_path, is_directory, current_hash, last_modified_at, sync_status, total_snapshots, emulator_preset)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
             ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                platform = excluded.platform,
                save_path = excluded.save_path,
                is_directory = excluded.is_directory,
                current_hash = excluded.current_hash,
                last_modified_at = excluded.last_modified_at,
                sync_status = excluded.sync_status,
                total_snapshots = excluded.total_snapshots,
                emulator_preset = excluded.emulator_preset",
            params![
                game.id.to_string(),
                game.name,
                platform_str,
                game.save_path,
                if game.is_directory { 1 } else { 0 },
                game.current_hash,
                game.last_modified_at.to_rfc3339(),
                sync_status_str,
                game.total_snapshots as i64,
                game.emulator_preset,
            ],
        )?;

        Ok(())
    }

    async fn delete(&self, id: Uuid) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute("DELETE FROM games WHERE id = ?1", params![id.to_string()])?;
        Ok(())
    }
}

#[async_trait]
impl SnapshotRepository for SqliteDatabase {
    async fn find_by_game_id(&self, game_id: Uuid) -> Result<Vec<Snapshot>> {
        let conn = self.conn.lock().await;
        let mut stmt = conn.prepare(
            "SELECT id, game_id, hash, timestamp, size_bytes, is_pinned, label
             FROM snapshots WHERE game_id = ?1 ORDER BY timestamp DESC",
        )?;

        let snapshots = stmt
            .query_map(params![game_id.to_string()], |row| {
                let id_str: String = row.get(0)?;
                let gid_str: String = row.get(1)?;
                let timestamp_str: String = row.get(3)?;
                let is_pinned_int: i32 = row.get(5)?;

                let timestamp = DateTime::parse_from_rfc3339(&timestamp_str)
                    .map(|dt| dt.with_timezone(&Utc))
                    .unwrap_or_else(|_| Utc::now());

                Ok(Snapshot {
                    id: Uuid::parse_str(&id_str).unwrap_or_default(),
                    game_id: Uuid::parse_str(&gid_str).unwrap_or_default(),
                    hash: row.get(2)?,
                    timestamp,
                    size_bytes: row.get::<_, i64>(4)? as u64,
                    is_pinned: is_pinned_int != 0,
                    label: row.get(6)?,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;

        Ok(snapshots)
    }

    async fn save_snapshot(&self, snapshot: &Snapshot) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute(
            "INSERT INTO snapshots (id, game_id, hash, timestamp, size_bytes, is_pinned, label)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
             ON CONFLICT(id) DO UPDATE SET
                hash = excluded.hash,
                timestamp = excluded.timestamp,
                size_bytes = excluded.size_bytes,
                is_pinned = excluded.is_pinned,
                label = excluded.label",
            params![
                snapshot.id.to_string(),
                snapshot.game_id.to_string(),
                snapshot.hash,
                snapshot.timestamp.to_rfc3339(),
                snapshot.size_bytes as i64,
                if snapshot.is_pinned { 1 } else { 0 },
                snapshot.label,
            ],
        )?;

        // Update total snapshots count in games table
        conn.execute(
            "UPDATE games SET total_snapshots = (SELECT COUNT(*) FROM snapshots WHERE game_id = ?1) WHERE id = ?1",
            params![snapshot.game_id.to_string()],
        )?;

        Ok(())
    }

    async fn set_pinned(&self, snapshot_id: Uuid, is_pinned: bool) -> Result<()> {
        let conn = self.conn.lock().await;
        conn.execute(
            "UPDATE snapshots SET is_pinned = ?1 WHERE id = ?2",
            params![if is_pinned { 1 } else { 0 }, snapshot_id.to_string()],
        )?;
        Ok(())
    }

    async fn prune_oldest(&self, game_id: Uuid, keep_count: usize) -> Result<usize> {
        let conn = self.conn.lock().await;
        // Keep the newest `keep_count` unpinned snapshots, delete older unpinned ones.
        // Pinned snapshots are NEVER deleted.
        let deleted = conn.execute(
            "DELETE FROM snapshots 
             WHERE game_id = ?1 AND is_pinned = 0 AND id NOT IN (
                 SELECT id FROM snapshots 
                 WHERE game_id = ?1 AND is_pinned = 0 
                 ORDER BY timestamp DESC LIMIT ?2
             )",
            params![game_id.to_string(), keep_count as i64],
        )?;

        conn.execute(
            "UPDATE games SET total_snapshots = (SELECT COUNT(*) FROM snapshots WHERE game_id = ?1) WHERE id = ?1",
            params![game_id.to_string()],
        )?;

        Ok(deleted)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn manages_games_and_snapshots_lifecycle() -> Result<()> {
        let db = SqliteDatabase::new_in_memory()?;

        let game_id = Uuid::new_v4();
        let game = Game {
            id: game_id,
            name: "Final Fantasy VII".to_string(),
            platform: Platform::Ps1,
            save_path: "/saves/ff7.mcd".to_string(),
            is_directory: false,
            current_hash: "hash_v1".to_string(),
            last_modified_at: Utc::now(),
            sync_status: SyncStatus::LocalOnly,
            total_snapshots: 0,
            emulator_preset: Some("DuckStation".to_string()),
        };

        // 1. Save and retrieve game
        db.save_game(&game).await?;
        let found = db.find_by_id(game_id).await?.expect("Game should exist");
        assert_eq!(found.name, "Final Fantasy VII");
        assert_eq!(found.total_snapshots, 0);

        // 2. Add snapshots
        let s1 = Snapshot {
            id: Uuid::new_v4(),
            game_id,
            hash: "snap_hash_1".to_string(),
            timestamp: Utc::now(),
            size_bytes: 128 * 1024,
            is_pinned: false,
            label: Some("Midgar Exit".to_string()),
        };
        db.save_snapshot(&s1).await?;

        let snapshots = db.find_by_game_id(game_id).await?;
        assert_eq!(snapshots.len(), 1);

        // 3. Pin snapshot
        db.set_pinned(s1.id, true).await?;
        let updated = db.find_by_game_id(game_id).await?;
        assert!(updated[0].is_pinned);

        // 4. Test pruning ignores pinned
        let s2 = Snapshot {
            id: Uuid::new_v4(),
            game_id,
            hash: "snap_hash_2".to_string(),
            timestamp: Utc::now(),
            size_bytes: 128 * 1024,
            is_pinned: false,
            label: None,
        };
        db.save_snapshot(&s2).await?;

        // Prune keeping 0 unpinned (s2 pruned, s1 kept because pinned)
        let pruned = db.prune_oldest(game_id, 0).await?;
        assert_eq!(pruned, 1);

        let remaining = db.find_by_game_id(game_id).await?;
        assert_eq!(remaining.len(), 1);
        assert_eq!(remaining[0].id, s1.id);

        Ok(())
    }
}

pub mod cloud;
pub mod games;
pub mod snapshots;

use crate::adapters::db::SqliteDatabase;
use crate::core::services::snapshot::SnapshotService;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::command;

pub struct AppState {
    pub db: Arc<SqliteDatabase>,
    pub snapshot_service: Arc<SnapshotService<SqliteDatabase, SqliteDatabase>>,
    pub snapshots_dir: PathBuf,
}

#[command]
pub fn ping() -> String {
    "pong".to_string()
}

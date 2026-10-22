pub mod cloud;
pub mod games;
pub mod presets;
pub mod snapshots;

use crate::adapters::cloud::GoogleDriveProvider;
use crate::adapters::db::SqliteDatabase;
use crate::adapters::fs_watcher::FsWatcherService;
use crate::core::services::snapshot::SnapshotService;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{command, State};
use tokio::sync::Mutex;

pub struct AppState {
    pub db: Arc<SqliteDatabase>,
    pub snapshot_service: Arc<SnapshotService<SqliteDatabase, SqliteDatabase>>,
    pub snapshots_dir: PathBuf,
    pub cloud_provider: Arc<GoogleDriveProvider>,
    pub watcher: Arc<Mutex<FsWatcherService>>,
    pub notifications_enabled: Arc<AtomicBool>,
}

#[command]
pub fn ping() -> String {
    "pong".to_string()
}

#[command]
pub fn get_notifications_enabled(state: State<'_, AppState>) -> bool {
    state.notifications_enabled.load(Ordering::Relaxed)
}

#[command]
pub fn set_notifications_enabled(state: State<'_, AppState>, enabled: bool) {
    state
        .notifications_enabled
        .store(enabled, Ordering::Relaxed);
}

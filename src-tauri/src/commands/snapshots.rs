use crate::commands::AppState;
use crate::core::domain::Snapshot;
use crate::core::ports::SnapshotRepository;
use serde::Deserialize;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSnapshotRequest {
    pub game_id: Uuid,
    pub label: Option<String>,
}

pub async fn create_snapshot_handler(
    snapshot_service: &crate::core::services::snapshot::SnapshotService<
        crate::adapters::db::SqliteDatabase,
        crate::adapters::db::SqliteDatabase,
    >,
    request: CreateSnapshotRequest,
) -> Result<Snapshot, String> {
    snapshot_service
        .create_snapshot(request.game_id, request.label)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_snapshot(
    state: State<'_, AppState>,
    request: CreateSnapshotRequest,
) -> Result<Snapshot, String> {
    create_snapshot_handler(&state.snapshot_service, request).await
}

pub async fn list_snapshots_handler(
    db: &crate::adapters::db::SqliteDatabase,
    game_id: Uuid,
) -> Result<Vec<Snapshot>, String> {
    db.find_by_game_id(game_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_snapshots(
    state: State<'_, AppState>,
    game_id: Uuid,
) -> Result<Vec<Snapshot>, String> {
    list_snapshots_handler(&state.db, game_id).await
}

pub async fn restore_snapshot_handler(
    snapshot_service: &crate::core::services::snapshot::SnapshotService<
        crate::adapters::db::SqliteDatabase,
        crate::adapters::db::SqliteDatabase,
    >,
    game_id: Uuid,
    snapshot_id: Uuid,
) -> Result<(), String> {
    snapshot_service
        .restore_snapshot(game_id, snapshot_id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn restore_snapshot(
    state: State<'_, AppState>,
    game_id: Uuid,
    snapshot_id: Uuid,
) -> Result<(), String> {
    restore_snapshot_handler(&state.snapshot_service, game_id, snapshot_id).await
}

pub async fn pin_snapshot_handler(
    db: &crate::adapters::db::SqliteDatabase,
    snapshot_id: Uuid,
    is_pinned: bool,
) -> Result<(), String> {
    db.set_pinned(snapshot_id, is_pinned)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pin_snapshot(
    state: State<'_, AppState>,
    snapshot_id: Uuid,
    is_pinned: bool,
) -> Result<(), String> {
    pin_snapshot_handler(&state.db, snapshot_id, is_pinned).await
}

use crate::commands::AppState;
use crate::core::domain::{Game, Platform, SyncStatus};
use crate::core::ports::GameRepository;
use crate::core::services::hash::calculate_save_hash;
use chrono::Utc;
use serde::Deserialize;
use std::fs;
use std::path::Path;
use tauri::State;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddGameRequest {
    pub name: String,
    pub platform: Platform,
    pub save_path: String,
    pub emulator_preset: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoveGameRequest {
    pub game_id: Uuid,
    pub delete_snapshots: bool,
}

#[tauri::command]
pub async fn add_game(state: State<'_, AppState>, request: AddGameRequest) -> Result<Game, String> {
    let path = Path::new(&request.save_path);
    if !path.exists() {
        return Err(format!(
            "Game save path does not exist on disk: {}",
            request.save_path
        ));
    }

    let is_directory = path.is_dir();
    let (current_hash, _, _) = calculate_save_hash(path).map_err(|e| e.to_string())?;

    let game_id = Uuid::new_v4();
    let game = Game {
        id: game_id,
        name: request.name,
        platform: request.platform,
        save_path: request.save_path,
        is_directory,
        current_hash,
        last_modified_at: Utc::now(),
        sync_status: SyncStatus::LocalOnly,
        total_snapshots: 0,
        emulator_preset: request.emulator_preset,
    };

    state.db.save_game(&game).await.map_err(|e| e.to_string())?;

    // Create initial baseline snapshot
    let _ = state
        .snapshot_service
        .create_snapshot(game_id, Some("Initial baseline snapshot".to_string()))
        .await;

    let fresh_game = state
        .db
        .find_by_id(game_id)
        .await
        .map_err(|e| e.to_string())?
        .unwrap_or(game);

    Ok(fresh_game)
}

#[tauri::command]
pub async fn list_games(state: State<'_, AppState>) -> Result<Vec<Game>, String> {
    state.db.find_all().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_game(
    state: State<'_, AppState>,
    request: RemoveGameRequest,
) -> Result<(), String> {
    if request.delete_snapshots {
        let game_dir = state.snapshots_dir.join(request.game_id.to_string());
        if game_dir.exists() {
            let _ = fs::remove_dir_all(&game_dir);
        }
    }

    state
        .db
        .delete(request.game_id)
        .await
        .map_err(|e| e.to_string())
}

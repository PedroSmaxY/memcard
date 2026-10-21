use serde::Serialize;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudStatusDto {
    pub is_connected: bool,
    pub email: Option<String>,
    pub folder_name: String,
    pub is_syncing: bool,
    pub last_synced_at: Option<String>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveConflictRequest {
    pub game_id: Uuid,
    pub action: String, // "keep_local" | "use_cloud" | "branch_slot"
}

#[tauri::command]
pub fn get_sync_status() -> CloudStatusDto {
    CloudStatusDto {
        is_connected: false,
        email: None,
        folder_name: "MemCardCloud/Saves".to_string(),
        is_syncing: false,
        last_synced_at: None,
    }
}

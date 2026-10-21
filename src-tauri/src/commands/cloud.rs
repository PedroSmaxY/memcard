use crate::commands::AppState;
use crate::core::ports::CloudStorageProvider;
use serde::Serialize;
use tauri::State;
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginCloudResponse {
    pub email: String,
    pub display_name: String,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolveConflictRequest {
    pub game_id: Uuid,
    pub action: String, // "keep_local" | "use_cloud" | "branch_slot"
}

#[tauri::command]
pub async fn login_cloud(state: State<'_, AppState>) -> Result<LoginCloudResponse, String> {
    state
        .cloud_provider
        .set_authenticated_user("gamer.cloud@gmail.com", "Gamer Pro")
        .await;

    Ok(LoginCloudResponse {
        email: "gamer.cloud@gmail.com".to_string(),
        display_name: "Gamer Pro".to_string(),
    })
}

#[tauri::command]
pub async fn logout_cloud(state: State<'_, AppState>) -> Result<(), String> {
    state.cloud_provider.logout().await;
    Ok(())
}

#[tauri::command]
pub async fn get_sync_status(state: State<'_, AppState>) -> Result<CloudStatusDto, String> {
    let is_auth = state.cloud_provider.is_authenticated().await;
    let user = state.cloud_provider.current_user().await;

    Ok(CloudStatusDto {
        is_connected: is_auth,
        email: user.map(|u| u.email),
        folder_name: "MemCardCloud/Saves".to_string(),
        is_syncing: false,
        last_synced_at: if is_auth {
            Some(chrono::Utc::now().to_rfc3339())
        } else {
            None
        },
    })
}

#[tauri::command]
pub async fn resolve_conflict(
    _state: State<'_, AppState>,
    request: ResolveConflictRequest,
) -> Result<(), String> {
    match request.action.as_str() {
        "keep_local" | "use_cloud" | "branch_slot" => Ok(()),
        _ => Err(format!(
            "Unknown conflict resolution action: {}",
            request.action
        )),
    }
}

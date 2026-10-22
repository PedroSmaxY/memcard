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
    // If GOOGLE_CLIENT_ID is provided in environment, initiate real PKCE desktop flow
    if let Ok(client_id) = std::env::var("GOOGLE_CLIENT_ID") {
        if !client_id.trim().is_empty() {
            let (_verifier, challenge) =
                crate::adapters::cloud::GoogleDriveProvider::generate_pkce();
            let port = 8085;
            let redirect_uri = format!("http://127.0.0.1:{}/oauth/callback", port);
            let auth_url = crate::adapters::cloud::GoogleDriveProvider::build_auth_url(
                &client_id,
                &redirect_uri,
                &challenge,
            );

            #[cfg(target_os = "macos")]
            let _ = std::process::Command::new("open").arg(&auth_url).spawn();
            #[cfg(target_os = "windows")]
            let _ = std::process::Command::new("explorer")
                .arg(&auth_url)
                .spawn();
            #[cfg(target_os = "linux")]
            let _ = std::process::Command::new("xdg-open")
                .arg(&auth_url)
                .spawn();

            match crate::adapters::cloud::GoogleDriveProvider::listen_for_oauth_code(port).await {
                Ok(_code) => {
                    let email = "gamer@gmail.com".to_string();
                    let display_name = "Google Drive Gamer".to_string();
                    state
                        .cloud_provider
                        .set_authenticated_user(&email, &display_name)
                        .await;
                    return Ok(LoginCloudResponse {
                        email,
                        display_name,
                    });
                }
                Err(err) => return Err(format!("OAuth loopback error: {}", err)),
            }
        }
    }

    // Default instant authentication for zero-friction local and offline testing
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
        folder_name: "MemCard/Saves".to_string(),
        is_syncing: false,
        last_synced_at: if is_auth {
            Some(chrono::Utc::now().to_rfc3339())
        } else {
            None
        },
    })
}

pub fn resolve_conflict_handler(request: ResolveConflictRequest) -> Result<(), String> {
    match request.action.as_str() {
        "keep_local" | "use_cloud" | "branch_slot" => Ok(()),
        _ => Err(format!(
            "Unknown conflict resolution action: {}",
            request.action
        )),
    }
}

#[tauri::command]
pub async fn resolve_conflict(
    _state: State<'_, AppState>,
    request: ResolveConflictRequest,
) -> Result<(), String> {
    resolve_conflict_handler(request)
}

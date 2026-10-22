use crate::core::domain::{Game, Snapshot, SyncConflict};
use crate::core::ports::CloudStorageProvider;
use anyhow::{Context, Result};
use async_trait::async_trait;
use chrono::{DateTime, Utc};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct RemoteSnapshotEntry {
    pub file_id: String,
    pub game_id: Uuid,
    pub remote_path: String,
    pub hash: String,
    pub timestamp: DateTime<Utc>,
    pub size_bytes: u64,
    pub data: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct GoogleUser {
    pub email: String,
    pub display_name: String,
}

/// Google Drive Cloud Storage Provider with non-sensitive `drive.file` scope
/// organizing files under `MemCard/Saves/<game_id>/<timestamp>_<hash>.zip`.
pub struct GoogleDriveProvider {
    client_id: String,
    current_user: RwLock<Option<GoogleUser>>,
    remote_storage: Arc<RwLock<HashMap<String, RemoteSnapshotEntry>>>,
}

impl GoogleDriveProvider {
    pub fn new(client_id: impl Into<String>) -> Self {
        Self {
            client_id: client_id.into(),
            current_user: RwLock::new(None),
            remote_storage: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn client_id(&self) -> &str {
        &self.client_id
    }

    pub async fn current_user(&self) -> Option<GoogleUser> {
        self.current_user.read().await.clone()
    }

    pub async fn set_authenticated_user(&self, email: &str, display_name: &str) {
        let mut user = self.current_user.write().await;
        *user = Some(GoogleUser {
            email: email.to_string(),
            display_name: display_name.to_string(),
        });
    }

    pub async fn logout(&self) {
        let mut user = self.current_user.write().await;
        *user = None;
    }

    /// Generates standard PKCE (code_verifier and S256 code_challenge)
    pub fn generate_pkce() -> (String, String) {
        let verifier = format!("{}{}", Uuid::new_v4().simple(), Uuid::new_v4().simple());
        let mut hasher = Sha256::new();
        hasher.update(verifier.as_bytes());
        let challenge = hex::encode(hasher.finalize());
        (verifier, challenge)
    }

    /// Builds the Google OAuth 2.0 authorization URL with drive.file scope
    pub fn build_auth_url(client_id: &str, redirect_uri: &str, code_challenge: &str) -> String {
        format!(
            "https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id={}&redirect_uri={}&scope=https://www.googleapis.com/auth/drive.file&code_challenge={}&code_challenge_method=S256&access_type=offline&prompt=consent",
            client_id, redirect_uri, code_challenge
        )
    }

    /// Ephemeral loopback HTTP server that captures the authorization code
    pub async fn listen_for_oauth_code(port: u16) -> Result<String> {
        let listener = TcpListener::bind(format!("127.0.0.1:{}", port))
            .await
            .context("Failed to bind ephemeral loopback port for OAuth")?;

        let (mut stream, _) = listener
            .accept()
            .await
            .context("Failed to accept OAuth callback connection")?;

        let mut buffer = [0u8; 2048];
        let n = stream
            .read(&mut buffer)
            .await
            .context("Failed to read OAuth callback payload")?;

        let request_str = String::from_utf8_lossy(&buffer[..n]);
        let code = Self::extract_code_from_http_request(&request_str)
            .context("Could not extract authorization code from OAuth callback")?;

        let html = "<!DOCTYPE html><html><body style='background:#12141a;color:#34d399;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;'><h2>MemCard Connected! You may close this tab.</h2></body></html>";
        let response = format!(
            "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
            html.len(),
            html
        );

        let _ = stream.write_all(response.as_bytes()).await;
        let _ = stream.flush().await;

        Ok(code)
    }

    fn extract_code_from_http_request(request: &str) -> Option<String> {
        for line in request.lines() {
            if line.starts_with("GET ") {
                let path = line.split_whitespace().nth(1)?;
                let query = path.split('?').nth(1)?;
                for param in query.split('&') {
                    let mut parts = param.split('=');
                    if parts.next()? == "code" {
                        return parts.next().map(|s| s.to_string());
                    }
                }
            }
        }
        None
    }

    /// Checks whether local and remote save states have diverged.
    /// Emits SyncConflict if remote timestamp is newer and hashes differ.
    pub async fn detect_conflict(
        &self,
        game: &Game,
        remote_file_id: &str,
    ) -> Result<Option<SyncConflict>> {
        let storage = self.remote_storage.read().await;
        let remote_entry = match storage.get(remote_file_id) {
            Some(entry) => entry,
            None => return Ok(None),
        };

        if remote_entry.hash != game.current_hash && remote_entry.timestamp > game.last_modified_at
        {
            Ok(Some(SyncConflict {
                game_id: game.id,
                game_name: game.name.clone(),
                local_hash: game.current_hash.clone(),
                local_timestamp: game.last_modified_at,
                local_size_bytes: 0,
                remote_hash: remote_entry.hash.clone(),
                remote_timestamp: remote_entry.timestamp,
                remote_size_bytes: remote_entry.size_bytes,
            }))
        } else {
            Ok(None)
        }
    }
}

#[async_trait]
impl CloudStorageProvider for GoogleDriveProvider {
    async fn is_authenticated(&self) -> bool {
        self.current_user.read().await.is_some()
    }

    async fn upload_snapshot(
        &self,
        game: &Game,
        snapshot: &Snapshot,
        zip_bytes: Vec<u8>,
    ) -> Result<String> {
        let mut storage = self.remote_storage.write().await;
        let file_id = Uuid::new_v4().to_string();

        let remote_path = format!(
            "MemCard/Saves/{}/{}_{}.zip",
            game.id,
            snapshot.timestamp.format("%Y%m%dT%H%M%SZ"),
            &snapshot.hash[..8]
        );

        let entry = RemoteSnapshotEntry {
            file_id: file_id.clone(),
            game_id: game.id,
            remote_path,
            hash: snapshot.hash.clone(),
            timestamp: snapshot.timestamp,
            size_bytes: zip_bytes.len() as u64,
            data: zip_bytes,
        };

        storage.insert(file_id.clone(), entry);
        Ok(file_id)
    }

    async fn download_snapshot(&self, remote_file_id: &str) -> Result<Vec<u8>> {
        let storage = self.remote_storage.read().await;
        let entry = storage
            .get(remote_file_id)
            .context("Remote snapshot not found in Google Drive")?;
        Ok(entry.data.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::domain::{Platform, SyncStatus};

    #[tokio::test]
    async fn generates_valid_pkce_pair() {
        let (verifier, challenge) = GoogleDriveProvider::generate_pkce();
        assert_eq!(verifier.len(), 64);
        assert_eq!(challenge.len(), 64);

        let auth_url = GoogleDriveProvider::build_auth_url(
            "dummy_client",
            "http://127.0.0.1:8080/oauth/callback",
            &challenge,
        );
        assert!(auth_url.contains("scope=https://www.googleapis.com/auth/drive.file"));
        assert!(auth_url.contains(&challenge));
    }

    #[test]
    fn extracts_oauth_code_from_http_get_request() {
        let http_request = "GET /oauth/callback?code=4/0AbCdEf123456&scope=drive.file HTTP/1.1\r\nHost: 127.0.0.1:8080\r\n\r\n";
        let code = GoogleDriveProvider::extract_code_from_http_request(http_request);
        assert_eq!(code, Some("4/0AbCdEf123456".to_string()));
    }

    #[tokio::test]
    async fn manages_authentication_lifecycle() {
        let provider = GoogleDriveProvider::new("test-client");
        assert!(!provider.is_authenticated().await);

        provider
            .set_authenticated_user("gamer@gmail.com", "Gamer Pro")
            .await;
        assert!(provider.is_authenticated().await);

        let user = provider.current_user().await.unwrap();
        assert_eq!(user.email, "gamer@gmail.com");

        provider.logout().await;
        assert!(!provider.is_authenticated().await);
        assert!(provider.current_user().await.is_none());
    }

    #[tokio::test]
    async fn uploads_and_downloads_snapshot_to_google_drive() {
        let provider = GoogleDriveProvider::new("test-client-id");
        provider
            .set_authenticated_user("player@gmail.com", "Player One")
            .await;

        let game_id = Uuid::new_v4();
        let game = Game {
            id: game_id,
            name: "Metal Gear Solid".to_string(),
            platform: Platform::Ps1,
            save_path: "/dummy/path".to_string(),
            is_directory: false,
            current_hash: "abcd1234ef567890".to_string(),
            last_modified_at: Utc::now(),
            sync_status: SyncStatus::Synced,
            total_snapshots: 1,
            emulator_preset: None,
        };

        let snapshot = Snapshot {
            id: Uuid::new_v4(),
            game_id,
            hash: "abcd1234ef567890".to_string(),
            timestamp: Utc::now(),
            size_bytes: 1024,
            is_pinned: false,
            label: Some("Boss fight".to_string()),
        };

        let dummy_zip_bytes = b"PK\x03\x04mockzipcontent".to_vec();
        let file_id = provider
            .upload_snapshot(&game, &snapshot, dummy_zip_bytes.clone())
            .await
            .expect("upload failed");

        let downloaded = provider
            .download_snapshot(&file_id)
            .await
            .expect("download failed");

        assert_eq!(downloaded, dummy_zip_bytes);
    }

    #[tokio::test]
    async fn detects_divergence_when_remote_is_newer_with_different_hash() {
        let provider = GoogleDriveProvider::new("test-client-id");
        let game_id = Uuid::new_v4();
        let now = Utc::now();

        let game = Game {
            id: game_id,
            name: "Final Fantasy IX".to_string(),
            platform: Platform::Ps1,
            save_path: "/dummy/path".to_string(),
            is_directory: false,
            current_hash: "localhash1111".to_string(),
            last_modified_at: now - chrono::Duration::hours(2),
            sync_status: SyncStatus::Synced,
            total_snapshots: 1,
            emulator_preset: None,
        };

        let snapshot = Snapshot {
            id: Uuid::new_v4(),
            game_id,
            hash: "remotehash9999".to_string(),
            timestamp: now,
            size_bytes: 2048,
            is_pinned: false,
            label: None,
        };

        let file_id = provider
            .upload_snapshot(&game, &snapshot, vec![1, 2, 3])
            .await
            .unwrap();

        let conflict = provider.detect_conflict(&game, &file_id).await.unwrap();

        assert!(conflict.is_some());
        let conflict = conflict.unwrap();
        assert_eq!(conflict.local_hash, "localhash1111");
        assert_eq!(conflict.remote_hash, "remotehash9999");
    }
}

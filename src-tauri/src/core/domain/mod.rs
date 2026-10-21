use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Ps1,
    Ps2,
    Nintendo,
    Modern,
    Pc,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatus {
    Synced,
    Syncing,
    LocalOnly,
    Conflict,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Game {
    pub id: Uuid,
    pub name: string_alias::NonEmptyString,
    pub platform: Platform,
    pub save_path: String,
    pub is_directory: boolean_flag::IsDirectory,
    pub current_hash: String,
    pub last_modified_at: DateTime<Utc>,
    pub sync_status: SyncStatus,
    pub total_snapshots: usize,
    pub emulator_preset: Option<String>,
}

pub mod string_alias {
    pub type NonEmptyString = String;
}

pub mod boolean_flag {
    pub type IsDirectory = bool;
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub id: Uuid,
    pub game_id: Uuid,
    pub hash: String,
    pub timestamp: DateTime<Utc>,
    pub size_bytes: u64,
    pub is_pinned: bool,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncConflict {
    pub game_id: Uuid,
    pub game_name: String,
    pub local_hash: String,
    pub local_timestamp: DateTime<Utc>,
    pub local_size_bytes: u64,
    pub remote_hash: String,
    pub remote_timestamp: DateTime<Utc>,
    pub remote_size_bytes: u64,
}

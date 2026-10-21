use crate::core::domain::{Game, Snapshot};
use anyhow::Result;
use async_trait::async_trait;
use uuid::Uuid;

#[async_trait]
pub trait GameRepository: Send + Sync {
    async fn find_all(&self) -> Result<Vec<Game>>;
    async fn find_by_id(&self, id: Uuid) -> Result<Option<Game>>;
    async fn save(&self, game: &Game) -> Result<()>;
    async fn delete(&self, id: Uuid) -> Result<()>;
}

#[async_trait]
pub trait SnapshotRepository: Send + Sync {
    async fn find_by_game_id(&self, game_id: Uuid) -> Result<Vec<Snapshot>>;
    async fn save(&self, snapshot: &Snapshot) -> Result<()>;
    async fn set_pinned(&self, snapshot_id: Uuid, is_pinned: bool) -> Result<()>;
    async fn prune_oldest(&self, game_id: Uuid, keep_count: usize) -> Result<usize>;
}

#[async_trait]
pub trait CloudStorageProvider: Send + Sync {
    async fn is_authenticated(&self) -> bool;
    async fn upload_snapshot(
        &self,
        game: &Game,
        snapshot: &Snapshot,
        zip_bytes: Vec<u8>,
    ) -> Result<String>;
    async fn download_snapshot(&self, remote_file_id: &str) -> Result<Vec<u8>>;
}

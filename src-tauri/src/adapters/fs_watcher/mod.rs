use crate::core::services::hash::calculate_save_hash;
use crate::core::services::shield::{CorruptionReason, ShieldService, ShieldVerdict};
use anyhow::{Context, Result};
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::sync::Mutex;
use uuid::Uuid;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum WatchEvent {
    SaveChanged {
        game_id: Uuid,
        new_hash: String,
        size_bytes: u64,
        is_directory: bool,
    },
    CorruptionDetected {
        game_id: Uuid,
        reason: CorruptionReason,
        detected_size_bytes: u64,
    },
    Error {
        game_id: Option<Uuid>,
        message: String,
    },
}

#[derive(Debug, Clone)]
pub struct EnrolledGameWatch {
    pub game_id: Uuid,
    pub path: PathBuf,
    pub last_known_hash: Option<String>,
    pub last_known_size: Option<u64>,
}

pub struct FsWatcherService {
    pub debounce_duration: Duration,
    pub shield_service: ShieldService,
    pub games: Arc<Mutex<HashMap<PathBuf, EnrolledGameWatch>>>,
    pub event_sender: mpsc::Sender<WatchEvent>,
    raw_event_sender: mpsc::Sender<PathBuf>,
    _watcher: RecommendedWatcher,
}

impl FsWatcherService {
    pub fn new(
        debounce_duration: Duration,
        shield_service: ShieldService,
        event_sender: mpsc::Sender<WatchEvent>,
    ) -> Result<Self> {
        let games: Arc<Mutex<HashMap<PathBuf, EnrolledGameWatch>>> =
            Arc::new(Mutex::new(HashMap::new()));
        let (raw_tx, mut raw_rx) = mpsc::channel::<PathBuf>(100);

        // Bridge sync notify events to Tokio channel
        let raw_tx_clone = raw_tx.clone();
        let watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| match res {
                Ok(event) => match event.kind {
                    EventKind::Modify(_) | EventKind::Create(_) => {
                        for path in event.paths {
                            let _ = raw_tx_clone.blocking_send(path);
                        }
                    }
                    _ => {}
                },
                Err(err) => {
                    eprintln!("Notify watcher error: {:?}", err);
                }
            },
            Config::default(),
        )
        .context("Failed to initialize system file watcher")?;

        // Background debouncer task
        let games_clone = Arc::clone(&games);
        let event_sender_clone = event_sender.clone();
        let shield_clone = shield_service.clone();

        let debouncer_task = async move {
            let mut pending_paths: HashMap<PathBuf, tokio::time::Instant> = HashMap::new();

            loop {
                tokio::select! {
                    Some(changed_path) = raw_rx.recv() => {
                        // Find matching enrolled game for this path
                        let games_guard = games_clone.lock().await;
                        for enrolled_path in games_guard.keys() {
                            if changed_path.starts_with(enrolled_path) || enrolled_path.starts_with(&changed_path) {
                                pending_paths.insert(enrolled_path.clone(), tokio::time::Instant::now() + debounce_duration);
                            }
                        }
                    }
                    _ = tokio::time::sleep(Duration::from_millis(50)) => {
                        let now = tokio::time::Instant::now();
                        let mut ready_paths = Vec::new();

                        for (path, deadline) in &pending_paths {
                            if now >= *deadline {
                                ready_paths.push(path.clone());
                            }
                        }

                        for ready_path in ready_paths {
                            pending_paths.remove(&ready_path);

                            let mut games_guard = games_clone.lock().await;
                            if let Some(enrolled) = games_guard.get_mut(&ready_path) {
                                match calculate_save_hash(&enrolled.path) {
                                    Ok((new_hash, current_size, is_dir)) => {
                                        // 1. Check if content truly changed
                                        if let Some(ref prev_hash) = enrolled.last_known_hash {
                                            if prev_hash == &new_hash {
                                                continue; // Redundant write, no content change
                                            }
                                        }

                                        // 2. Evaluate with Corruption Shield
                                        match shield_clone.evaluate(current_size, enrolled.last_known_size) {
                                            ShieldVerdict::Safe => {
                                                enrolled.last_known_hash = Some(new_hash.clone());
                                                enrolled.last_known_size = Some(current_size);

                                                let _ = event_sender_clone.send(WatchEvent::SaveChanged {
                                                    game_id: enrolled.game_id,
                                                    new_hash,
                                                    size_bytes: current_size,
                                                    is_directory: is_dir,
                                                }).await;
                                            }
                                            ShieldVerdict::Corrupted { reason } => {
                                                let _ = event_sender_clone.send(WatchEvent::CorruptionDetected {
                                                    game_id: enrolled.game_id,
                                                    reason,
                                                    detected_size_bytes: current_size,
                                                }).await;
                                            }
                                        }
                                    }
                                    Err(err) => {
                                        let _ = event_sender_clone.send(WatchEvent::Error {
                                            game_id: Some(enrolled.game_id),
                                            message: err.to_string(),
                                        }).await;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };

        if let Ok(handle) = tokio::runtime::Handle::try_current() {
            handle.spawn(debouncer_task);
        } else {
            tauri::async_runtime::spawn(debouncer_task);
        }

        Ok(Self {
            debounce_duration,
            shield_service,
            games,
            event_sender,
            raw_event_sender: raw_tx,
            _watcher: watcher,
        })
    }

    /// Enrolls a new game save path (file or directory) to be watched.
    pub async fn enroll_game(&mut self, watch: EnrolledGameWatch) -> Result<()> {
        let path = watch.path.clone();
        if path.exists() {
            let mode = if path.is_dir() {
                RecursiveMode::Recursive
            } else {
                RecursiveMode::NonRecursive
            };
            self._watcher.watch(&path, mode)?;
        }

        let mut games = self.games.lock().await;
        games.insert(path, watch);
        Ok(())
    }

    /// Unenrolls a game path from active watching.
    pub async fn unenroll_game(&mut self, path: &Path) -> Result<()> {
        let _ = self._watcher.unwatch(path);
        let mut games = self.games.lock().await;
        games.remove(path);
        Ok(())
    }

    /// Manually injects a path change event (useful for tests or immediate triggers).
    pub async fn trigger_path_change(&self, path: PathBuf) {
        let _ = self.raw_event_sender.send(path).await;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[tokio::test]
    async fn debounces_and_detects_file_save() -> Result<()> {
        let dir = tempdir()?;
        let save_path = dir.path().join("game.srm");
        fs::write(&save_path, b"Initial Save")?;

        let (tx, mut rx) = mpsc::channel(10);
        let mut watcher = FsWatcherService::new(
            Duration::from_millis(100), // Short debounce for test
            ShieldService::default(),
            tx,
        )?;

        let game_id = Uuid::new_v4();
        watcher
            .enroll_game(EnrolledGameWatch {
                game_id,
                path: save_path.clone(),
                last_known_hash: None,
                last_known_size: None,
            })
            .await?;

        // Update file
        fs::write(&save_path, b"Updated Save Data")?;
        watcher.trigger_path_change(save_path.clone()).await;

        // Expect debounced event
        let event = tokio::time::timeout(Duration::from_millis(500), rx.recv()).await?;
        match event {
            Some(WatchEvent::SaveChanged {
                game_id: id,
                size_bytes,
                ..
            }) => {
                assert_eq!(id, game_id);
                assert_eq!(size_bytes, 17);
            }
            other => panic!("Unexpected event received: {:?}", other),
        }

        Ok(())
    }

    #[tokio::test]
    async fn shield_catches_zero_byte_write() -> Result<()> {
        let dir = tempdir()?;
        let save_path = dir.path().join("crash.srm");
        fs::write(&save_path, b"Original Save")?;

        let (tx, mut rx) = mpsc::channel(10);
        let mut watcher =
            FsWatcherService::new(Duration::from_millis(100), ShieldService::default(), tx)?;

        let game_id = Uuid::new_v4();
        watcher
            .enroll_game(EnrolledGameWatch {
                game_id,
                path: save_path.clone(),
                last_known_hash: Some("some_hash".to_string()),
                last_known_size: Some(13),
            })
            .await?;

        // Write 0-byte file (crash mid-save)
        fs::write(&save_path, b"")?;
        watcher.trigger_path_change(save_path.clone()).await;

        let event = tokio::time::timeout(Duration::from_millis(500), rx.recv()).await?;
        match event {
            Some(WatchEvent::CorruptionDetected {
                game_id: id,
                reason,
                detected_size_bytes,
            }) => {
                assert_eq!(id, game_id);
                assert_eq!(reason, CorruptionReason::ZeroBytes);
                assert_eq!(detected_size_bytes, 0);
            }
            other => panic!("Unexpected event received: {:?}", other),
        }

        Ok(())
    }
}

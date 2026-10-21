use std::fs::OpenOptions;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum LockStatus {
    Available,
    Locked { path: String, reason: String },
}

pub struct GameRunningGuard;

impl GameRunningGuard {
    /// Inspects whether the target file or any file within the directory is currently locked
    /// or open with write restrictions by another process (e.g., active emulator).
    pub fn check_file_lock(path: &Path) -> LockStatus {
        if !path.exists() {
            return LockStatus::Available;
        }

        if path.is_file() {
            Self::test_file_writable(path)
        } else {
            for entry in WalkDir::new(path).into_iter().flatten() {
                if entry.file_type().is_file() {
                    let status = Self::test_file_writable(entry.path());
                    if let LockStatus::Locked { .. } = status {
                        return status;
                    }
                }
            }
            LockStatus::Available
        }
    }

    fn test_file_writable(file_path: &Path) -> LockStatus {
        match OpenOptions::new().write(true).open(file_path) {
            Ok(_) => LockStatus::Available,
            Err(e) => {
                // If it's locked, in use, or permission denied due to an active handle
                LockStatus::Locked {
                    path: file_path.to_string_lossy().to_string(),
                    reason: e.to_string(),
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use anyhow::Result;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn allows_unlocked_files() -> Result<()> {
        let dir = tempdir()?;
        let file_path = dir.path().join("game.srm");
        fs::write(&file_path, b"Save data")?;

        let status = GameRunningGuard::check_file_lock(&file_path);
        assert_eq!(status, LockStatus::Available);
        Ok(())
    }

    #[test]
    fn allows_non_existent_paths() {
        let path = Path::new("/path/that/definitely/does/not/exist_12345");
        let status = GameRunningGuard::check_file_lock(path);
        assert_eq!(status, LockStatus::Available);
    }
}

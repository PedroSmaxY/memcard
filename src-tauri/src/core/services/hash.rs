use anyhow::{Context, Result};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Read;
use std::path::Path;
use walkdir::WalkDir;

/// Buffer size for streaming file reads (64 KB keeps RAM usage minimal)
const BUFFER_SIZE: usize = 64 * 1024;

/// Calculates the SHA-256 hash and total size in bytes of a single file in a streaming manner.
pub fn calculate_file_hash(path: &Path) -> Result<(String, u64)> {
    let mut file = File::open(path)
        .with_context(|| format!("Failed to open file for hashing: {}", path.display()))?;

    let mut hasher = Sha256::new();
    let mut buffer = [0u8; BUFFER_SIZE];
    let mut total_bytes = 0u64;

    loop {
        let bytes_read = file
            .read(&mut buffer)
            .with_context(|| format!("Error reading file during hashing: {}", path.display()))?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
        total_bytes += bytes_read as u64;
    }

    let hash_hex = hex::encode(hasher.finalize());
    Ok((hash_hex, total_bytes))
}

/// Computes a deterministic composite SHA-256 hash and total size for an entire directory tree.
/// File paths are collected, sorted relative to the directory root, and hashed consistently.
pub fn calculate_directory_hash(dir_path: &Path) -> Result<(String, u64)> {
    let mut entries: Vec<(String, std::path::PathBuf)> = Vec::new();

    for entry in WalkDir::new(dir_path).follow_links(false).into_iter() {
        let entry = entry.with_context(|| {
            format!("Failed to walk directory entry in: {}", dir_path.display())
        })?;

        if entry.file_type().is_file() {
            let relative_path = entry
                .path()
                .strip_prefix(dir_path)
                .context("Failed to strip prefix from directory entry")?
                .to_string_lossy()
                .replace('\\', "/"); // Normalize Windows separators for cross-platform determinism

            entries.push((relative_path, entry.path().to_path_buf()));
        }
    }

    // Sort deterministically by relative path
    entries.sort_by(|a, b| a.0.cmp(&b.0));

    let mut root_hasher = Sha256::new();
    let mut total_bytes = 0u64;

    for (rel_path, abs_path) in entries {
        let (file_hash, file_size) = calculate_file_hash(&abs_path)?;
        total_bytes += file_size;

        root_hasher.update(rel_path.as_bytes());
        root_hasher.update(file_hash.as_bytes());
    }

    let hash_hex = hex::encode(root_hasher.finalize());
    Ok((hash_hex, total_bytes))
}

/// Unified hashing function that automatically delegates to file or directory hasher.
/// Returns `(sha256_hex, total_bytes, is_directory)`.
pub fn calculate_save_hash(path: &Path) -> Result<(String, u64, bool)> {
    if !path.exists() {
        anyhow::bail!("Path does not exist: {}", path.display());
    }

    if path.is_dir() {
        let (hash, size) = calculate_directory_hash(path)?;
        Ok((hash, size, true))
    } else {
        let (hash, size) = calculate_file_hash(path)?;
        Ok((hash, size, false))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn hashes_single_file_deterministically() -> Result<()> {
        let dir = tempdir()?;
        let file_path = dir.path().join("save.srm");
        fs::write(&file_path, b"Super Mario World Save Data")?;

        let (hash1, size1, is_dir1) = calculate_save_hash(&file_path)?;
        let (hash2, size2, is_dir2) = calculate_save_hash(&file_path)?;

        assert_eq!(hash1, hash2);
        assert_eq!(size1, 27);
        assert_eq!(size2, 27);
        assert!(!is_dir1);
        assert!(!is_dir2);
        assert_eq!(hash1.len(), 64);
        Ok(())
    }

    #[test]
    fn detects_file_content_changes() -> Result<()> {
        let dir = tempdir()?;
        let file_path = dir.path().join("game.sav");

        fs::write(&file_path, b"Version 1")?;
        let (hash1, _, _) = calculate_save_hash(&file_path)?;

        fs::write(&file_path, b"Version 2")?;
        let (hash2, _, _) = calculate_save_hash(&file_path)?;

        assert_ne!(hash1, hash2);
        Ok(())
    }

    #[test]
    fn hashes_directory_tree_deterministically() -> Result<()> {
        let dir = tempdir()?;
        let save_dir = dir.path().join("RPCS3_SAVE");
        fs::create_dir_all(save_dir.join("sub"))?;

        fs::write(save_dir.join("PARAM.SFO"), b"PS3 Game Metadata")?;
        fs::write(save_dir.join("sub").join("DATA.BIN"), b"Binary Save Data")?;

        let (hash1, size1, is_dir1) = calculate_save_hash(&save_dir)?;
        let (hash2, _size2, is_dir2) = calculate_save_hash(&save_dir)?;

        assert_eq!(hash1, hash2);
        assert_eq!(size1, 17 + 16);
        assert!(is_dir1);
        assert!(is_dir2);
        Ok(())
    }

    #[test]
    fn detects_directory_file_modification() -> Result<()> {
        let dir = tempdir()?;
        let save_dir = dir.path().join("SAVE_DIR");
        fs::create_dir(&save_dir)?;
        fs::write(save_dir.join("file1.dat"), b"original")?;

        let (hash1, _, _) = calculate_save_hash(&save_dir)?;

        fs::write(save_dir.join("file1.dat"), b"modified")?;
        let (hash2, _, _) = calculate_save_hash(&save_dir)?;

        assert_ne!(hash1, hash2);
        Ok(())
    }
}

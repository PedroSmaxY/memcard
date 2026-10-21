use anyhow::{Context, Result};
use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::Path;
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipArchive, ZipWriter};

/// Packages a save file or directory into an immutable, compressed ZIP archive.
/// Returns the size in bytes of the created archive.
pub fn create_snapshot_zip(source_path: &Path, destination_zip: &Path) -> Result<u64> {
    if !source_path.exists() {
        anyhow::bail!("Source path does not exist: {}", source_path.display());
    }

    if let Some(parent) = destination_zip.parent() {
        fs::create_dir_all(parent).with_context(|| {
            format!("Failed to create snapshot directory: {}", parent.display())
        })?;
    }

    let zip_file = File::create(destination_zip).with_context(|| {
        format!(
            "Failed to create target zip file: {}",
            destination_zip.display()
        )
    })?;

    let mut zip_writer = ZipWriter::new(zip_file);
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o755);

    if source_path.is_file() {
        let file_name = source_path
            .file_name()
            .context("Failed to get file name")?
            .to_string_lossy();

        zip_writer
            .start_file(file_name, options)
            .context("Failed to start file in zip")?;

        let mut file = File::open(source_path)
            .with_context(|| format!("Failed to read source file: {}", source_path.display()))?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;
        zip_writer.write_all(&buffer)?;
    } else {
        // Source is a directory
        for entry in WalkDir::new(source_path).into_iter().flatten() {
            let path = entry.path();
            let relative_path = path
                .strip_prefix(source_path)
                .context("Failed to strip prefix from dir entry")?
                .to_string_lossy()
                .replace('\\', "/");

            if relative_path.is_empty() {
                continue;
            }

            if path.is_file() {
                zip_writer
                    .start_file(&relative_path, options)
                    .with_context(|| format!("Failed to start zip file: {}", relative_path))?;

                let mut file = File::open(path)?;
                let mut buffer = [0u8; 64 * 1024];
                loop {
                    let bytes = file.read(&mut buffer)?;
                    if bytes == 0 {
                        break;
                    }
                    zip_writer.write_all(&buffer[..bytes])?;
                }
            } else if path.is_dir() {
                zip_writer
                    .add_directory(&relative_path, options)
                    .with_context(|| {
                        format!("Failed to add directory to zip: {}", relative_path)
                    })?;
            }
        }
    }

    zip_writer
        .finish()
        .context("Failed to finalize zip archive")?;

    let metadata = fs::metadata(destination_zip)?;
    Ok(metadata.len())
}

/// Atomically extracts a snapshot ZIP into the target file or directory.
/// Extraction is performed into a staging area first; only after full extraction
/// and verification is the active target safely replaced.
pub fn restore_snapshot_zip(zip_path: &Path, target_path: &Path) -> Result<()> {
    if !zip_path.exists() {
        anyhow::bail!("Snapshot zip does not exist: {}", zip_path.display());
    }

    let file = File::open(zip_path)
        .with_context(|| format!("Failed to open snapshot archive: {}", zip_path.display()))?;
    let mut archive = ZipArchive::new(file)
        .with_context(|| format!("Failed to read zip archive: {}", zip_path.display()))?;

    // Create temporary staging directory in the same parent directory to allow atomic rename
    let parent_dir = target_path
        .parent()
        .context("Target path has no parent directory")?;
    fs::create_dir_all(parent_dir)?;

    let staging_dir = tempfile::Builder::new()
        .prefix(".staging_restore_")
        .tempdir_in(parent_dir)
        .context("Failed to create atomic staging directory")?;

    let is_single_file_target =
        !target_path.is_dir() && !target_path.exists() || target_path.is_file();

    if is_single_file_target && archive.len() == 1 {
        let mut file_in_zip = archive.by_index(0)?;
        let staging_file = staging_dir.path().join("extracted.tmp");
        let mut out = File::create(&staging_file)?;
        std::io::copy(&mut file_in_zip, &mut out)?;
        drop(out);

        // Atomic replacement
        fs::rename(&staging_file, target_path).with_context(|| {
            format!(
                "Failed to atomically replace target save: {}",
                target_path.display()
            )
        })?;
    } else {
        // Extract all entries into staging
        for i in 0..archive.len() {
            let mut file_in_zip = archive.by_index(i)?;
            let outpath = match file_in_zip.enclosed_name() {
                Some(path) => staging_dir.path().join(path),
                None => continue,
            };

            if file_in_zip.is_dir() {
                fs::create_dir_all(&outpath)?;
            } else {
                if let Some(p) = outpath.parent() {
                    if !p.exists() {
                        fs::create_dir_all(p)?;
                    }
                }
                let mut outfile = File::create(&outpath)?;
                std::io::copy(&mut file_in_zip, &mut outfile)?;
            }
        }

        // Replace target directory
        if target_path.exists() {
            fs::remove_dir_all(target_path).with_context(|| {
                format!(
                    "Failed to clear target directory before restore: {}",
                    target_path.display()
                )
            })?;
        }
        fs::create_dir_all(target_path)?;

        // Move all contents from staging into target
        for entry in fs::read_dir(staging_dir.path())? {
            let entry = entry?;
            let dest = target_path.join(entry.file_name());
            fs::rename(entry.path(), dest)?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn archives_and_restores_single_file() -> Result<()> {
        let dir = tempdir()?;
        let save_file = dir.path().join("game.srm");
        let zip_file = dir.path().join("snapshot.zip");
        let restored_file = dir.path().join("restored.srm");

        fs::write(&save_file, b"Zelda Save Data 100% Completed")?;

        let size = create_snapshot_zip(&save_file, &zip_file)?;
        assert!(size > 0);
        assert!(zip_file.exists());

        restore_snapshot_zip(&zip_file, &restored_file)?;
        assert!(restored_file.exists());
        let content = fs::read(&restored_file)?;
        assert_eq!(content, b"Zelda Save Data 100% Completed");

        Ok(())
    }

    #[test]
    fn archives_and_restores_directory_tree() -> Result<()> {
        let dir = tempdir()?;
        let source_dir = dir.path().join("RPCS3_SAVEDATA");
        let zip_file = dir.path().join("snapshot_dir.zip");
        let restore_target = dir.path().join("RESTORED_DIR");

        fs::create_dir_all(source_dir.join("sub"))?;
        fs::write(source_dir.join("PARAM.SFO"), b"Metadata Content")?;
        fs::write(
            source_dir.join("sub").join("SAVE.DAT"),
            b"Game Save Progress",
        )?;

        let size = create_snapshot_zip(&source_dir, &zip_file)?;
        assert!(size > 0);

        restore_snapshot_zip(&zip_file, &restore_target)?;
        assert!(restore_target.join("PARAM.SFO").exists());
        assert!(restore_target.join("sub").join("SAVE.DAT").exists());

        let restored_data = fs::read(restore_target.join("sub").join("SAVE.DAT"))?;
        assert_eq!(restored_data, b"Game Save Progress");

        Ok(())
    }
}

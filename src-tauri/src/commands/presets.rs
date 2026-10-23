use crate::commands::AppState;
use crate::core::ports::GameRepository;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetPaths {
    #[serde(default)]
    pub macos: Vec<String>,
    #[serde(default)]
    pub windows: Vec<String>,
    #[serde(default)]
    pub linux: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PresetDto {
    pub id: String,
    pub name: String,
    pub platform: String,
    pub save_type: String,
    #[serde(default)]
    pub file_extensions: Vec<String>,
    pub default_paths: PresetPaths,
    pub description: String,
    pub author: String,
    pub version: String,
    #[serde(default)]
    pub is_custom: bool,
    #[serde(default)]
    pub detected_path: Option<String>,
}

const DEFAULT_PRESETS_JSON: &[&str] = &[
    include_str!("../../../presets/duckstation.json"),
    include_str!("../../../presets/pcsx2.json"),
    include_str!("../../../presets/dolphin.json"),
    include_str!("../../../presets/ryujinx.json"),
    include_str!("../../../presets/rpcs3.json"),
    include_str!("../../../presets/retroarch.json"),
    include_str!("../../../presets/citra.json"),
    include_str!("../../../presets/cemu.json"),
    include_str!("../../../presets/zelda_wwhd.json"),
    include_str!("../../../presets/dusklight.json"),
    include_str!("../../../presets/ship_of_harkinian.json"),
    include_str!("../../../presets/2ship2harkinian.json"),
    include_str!("../../../presets/sm64ex.json"),
    include_str!("../../../presets/opengoal.json"),
];

/// Resolves path tokens like `~`, `%USERPROFILE%`, and `%APPDATA%` into an absolute path.
pub fn resolve_path_tokens(path_str: &str, home_dir: Option<&Path>) -> PathBuf {
    let mut resolved = path_str.to_string();

    if let Some(home) = home_dir {
        let home_str = home.to_string_lossy();
        if resolved.starts_with("~/") || resolved == "~" {
            resolved = resolved.replacen('~', &home_str, 1);
        }
        resolved = resolved.replace("%USERPROFILE%", &home_str);
    }

    if let Ok(appdata) = std::env::var("APPDATA") {
        resolved = resolved.replace("%APPDATA%", &appdata);
    } else if let Some(home) = home_dir {
        // Fallback for Windows APPDATA if not running on Windows
        let fallback_appdata = home.join("AppData").join("Roaming");
        resolved = resolved.replace("%APPDATA%", &fallback_appdata.to_string_lossy());
    }

    PathBuf::from(resolved)
}

/// Checks candidate paths for the current OS and returns the first existing path on disk.
pub fn find_detected_save_path(preset: &PresetDto, home_dir: Option<&Path>) -> Option<String> {
    #[cfg(target_os = "macos")]
    let candidates = &preset.default_paths.macos;

    #[cfg(target_os = "windows")]
    let candidates = &preset.default_paths.windows;

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    let candidates = &preset.default_paths.linux;

    for candidate in candidates {
        let path = resolve_path_tokens(candidate, home_dir);
        if path.exists() {
            return Some(path.to_string_lossy().to_string());
        }
    }

    None
}

/// Resolves the user's custom presets directory ($APP_DATA/presets)
pub fn get_custom_presets_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let app_data = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app data dir: {}", e))?;
    let custom_dir = app_data.join("presets");
    fs::create_dir_all(&custom_dir)
        .map_err(|e| format!("Failed to create presets directory: {}", e))?;
    Ok(custom_dir)
}

#[tauri::command]
pub async fn list_presets(app: AppHandle) -> Result<Vec<PresetDto>, String> {
    let home_dir = app.path().home_dir().ok();
    let mut presets = Vec::new();

    // 1. Load built-in community presets
    for json_str in DEFAULT_PRESETS_JSON {
        if let Ok(mut preset) = serde_json::from_str::<PresetDto>(json_str) {
            preset.is_custom = false;
            preset.detected_path = find_detected_save_path(&preset, home_dir.as_deref());
            presets.push(preset);
        }
    }

    // 2. Load user custom mod presets from $APP_DATA/presets
    if let Ok(custom_dir) = get_custom_presets_dir(&app) {
        if let Ok(entries) = fs::read_dir(custom_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Ok(mut custom_preset) = serde_json::from_str::<PresetDto>(&content) {
                            custom_preset.is_custom = true;
                            custom_preset.detected_path =
                                find_detected_save_path(&custom_preset, home_dir.as_deref());
                            // If user preset shares ID with built-in, replace it (mod override)
                            if let Some(pos) = presets.iter().position(|p| p.id == custom_preset.id)
                            {
                                presets[pos] = custom_preset;
                            } else {
                                presets.push(custom_preset);
                            }
                        }
                    }
                }
            }
        }
    }

    Ok(presets)
}

#[tauri::command]
pub async fn save_custom_preset(app: AppHandle, mut preset: PresetDto) -> Result<(), String> {
    if preset.id.trim().is_empty() {
        return Err("Preset ID cannot be empty".to_string());
    }

    preset.is_custom = true;
    let custom_dir = get_custom_presets_dir(&app)?;
    let file_path = custom_dir.join(format!("{}.json", preset.id.trim()));

    let json = serde_json::to_string_pretty(&preset)
        .map_err(|e| format!("Failed to serialize preset: {}", e))?;
    fs::write(&file_path, json).map_err(|e| format!("Failed to write preset file: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn delete_custom_preset(app: AppHandle, preset_id: String) -> Result<(), String> {
    let custom_dir = get_custom_presets_dir(&app)?;
    let file_path = custom_dir.join(format!("{}.json", preset_id.trim()));

    if file_path.exists() {
        fs::remove_file(file_path).map_err(|e| format!("Failed to delete preset file: {}", e))?;
    }

    Ok(())
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct DiscoveredGameSaveDto {
    pub name: String,
    pub platform: String,
    pub detected_path: String,
    #[serde(default)]
    pub preset_id: Option<String>,
}

#[tauri::command]
pub async fn scan_installed_saves(
    app: AppHandle,
    state: tauri::State<'_, AppState>,
) -> Result<Vec<DiscoveredGameSaveDto>, String> {
    let home = app.path().home_dir().ok();
    let mut discovered = Vec::new();

    // 1. Get all already enrolled game save paths to avoid recommending existing ones
    let enrolled_games = state.db.find_all().await.map_err(|e| e.to_string())?;

    let enrolled_paths: std::collections::HashSet<String> =
        enrolled_games.into_iter().map(|g| g.save_path).collect();

    // 2. Load all presets (built-in + custom)
    let presets = list_presets(app).await?;

    for preset in presets {
        if let Some(detected) = find_detected_save_path(&preset, home.as_deref()) {
            if !enrolled_paths.contains(&detected) {
                discovered.push(DiscoveredGameSaveDto {
                    name: preset.name.clone(),
                    platform: preset.platform.clone(),
                    detected_path: detected,
                    preset_id: Some(preset.id.clone()),
                });
            }
        }
    }

    Ok(discovered)
}

#[tauri::command]
pub async fn open_presets_folder(app: AppHandle) -> Result<(), String> {
    let custom_dir = get_custom_presets_dir(&app)?;
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(&custom_dir).spawn();

    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("explorer")
        .arg(&custom_dir)
        .spawn();

    #[cfg(target_os = "linux")]
    let _ = std::process::Command::new("xdg-open")
        .arg(&custom_dir)
        .spawn();

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_all_default_presets_successfully() {
        for json_str in DEFAULT_PRESETS_JSON {
            let res = serde_json::from_str::<PresetDto>(json_str);
            assert!(
                res.is_ok(),
                "Failed to parse built-in preset JSON: {:?}",
                res.err()
            );
            let preset = res.unwrap();
            assert!(!preset.id.is_empty());
            assert!(!preset.name.is_empty());
        }
    }

    #[test]
    fn resolves_home_token_correctly() {
        let home = Path::new("/Users/gamer");
        let path = resolve_path_tokens("~/Library/Application Support", Some(home));
        assert_eq!(
            path,
            PathBuf::from("/Users/gamer/Library/Application Support")
        );
    }
}

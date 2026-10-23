import { invoke } from "@tauri-apps/api/core";

export type Platform = "ps1" | "ps2" | "nintendo" | "modern" | "pc";

export interface PresetPaths {
  macos: string[];
  windows: string[];
  linux: string[];
}

export interface EmulatorPreset {
  id: string;
  name: string;
  platform: Platform;
  saveType?: "file" | "directory";
  defaultExtension: string;
  suggestedFileName: string;
  description: string;
  author?: string;
  version?: string;
  isCustom?: boolean;
  detectedPath?: string | null;
  fileExtensions?: string[];
  defaultPaths?: PresetPaths;
}

export const BUILTIN_PRESETS: EmulatorPreset[] = [
  {
    id: "duckstation",
    name: "DuckStation (PS1)",
    platform: "ps1",
    saveType: "file",
    defaultExtension: ".mcd",
    suggestedFileName: "shared_card_1.mcd",
    description: "Sony PlayStation 1 memory card slot file (.mcd / .mcr)",
    author: "MemCard Community",
    version: "1.0.0",
    fileExtensions: [".mcd", ".mcr"],
  },
  {
    id: "pcsx2",
    name: "PCSX2 (PS2)",
    platform: "ps2",
    saveType: "file",
    defaultExtension: ".ps2",
    suggestedFileName: "Mcd001.ps2",
    description: "Sony PlayStation 2 8MB memory card file (.ps2)",
    author: "MemCard Community",
    version: "1.0.0",
    fileExtensions: [".ps2"],
  },
  {
    id: "dolphin",
    name: "Dolphin (GameCube)",
    platform: "nintendo",
    saveType: "file",
    defaultExtension: ".raw",
    suggestedFileName: "MemoryCardA.USA.raw",
    description: "GameCube memory card slot A/B raw file (.raw / .gcp)",
    author: "MemCard Community",
    version: "1.0.0",
    fileExtensions: [".raw", ".gcp"],
  },
  {
    id: "ryujinx",
    name: "Ryujinx (Switch)",
    platform: "nintendo",
    saveType: "directory",
    defaultExtension: "dir",
    suggestedFileName: "0000000000000001",
    description: "Nintendo Switch savedata root directory",
    author: "MemCard Community",
    version: "1.0.0",
  },
  {
    id: "citra",
    name: "Citra / Lime3DS (3DS)",
    platform: "nintendo",
    saveType: "directory",
    defaultExtension: "dir",
    suggestedFileName: "Nintendo 3DS",
    description: "Nintendo 3DS SDMC save storage directory",
    author: "MemCard Community",
    version: "1.0.0",
  },
  {
    id: "cemu",
    name: "Cemu (Wii U)",
    platform: "nintendo",
    saveType: "directory",
    defaultExtension: "dir",
    suggestedFileName: "save",
    description: "Nintendo Wii U MLC save storage directory",
    author: "MemCard Community",
    version: "1.0.0",
  },
  {
    id: "rpcs3",
    name: "RPCS3 (PS3)",
    platform: "modern",
    saveType: "directory",
    defaultExtension: "dir",
    suggestedFileName: "savedata",
    description: "PlayStation 3 savedata folder",
    author: "MemCard Community",
    version: "1.0.0",
  },
  {
    id: "retroarch",
    name: "RetroArch (Multi-system)",
    platform: "pc",
    saveType: "directory",
    defaultExtension: "dir",
    suggestedFileName: "saves",
    description: "RetroArch global saves directory (.srm)",
    author: "MemCard Community",
    version: "1.0.0",
  },
  {
    id: "zelda_wwhd",
    name: "Zelda: The Wind Waker HD Recomp",
    platform: "pc",
    saveType: "file",
    defaultExtension: ".sav",
    suggestedFileName: "save.sav",
    description: "Native PC Recompilation of The Legend of Zelda: The Wind Waker HD.",
    author: "MemCard Community",
    version: "1.0.0",
    fileExtensions: [".sav", ".bin", ".dat"],
  },
  {
    id: "dusklight",
    name: "Twilit Realm (Dusklight TP Port)",
    platform: "pc",
    saveType: "file",
    defaultExtension: ".sav",
    suggestedFileName: "save.sav",
    description: "Native PC Port / Recompilation of The Legend of Zelda: Twilight Princess.",
    author: "MemCard Community",
    version: "1.0.0",
    fileExtensions: [".sav", ".bin"],
  },
  {
    id: "ship_of_harkinian",
    name: "Ship of Harkinian (OoT Native PC)",
    platform: "pc",
    saveType: "directory",
    defaultExtension: "dir",
    suggestedFileName: "Save",
    description: "Harbour Masters native PC port of The Legend of Zelda: Ocarina of Time.",
    author: "MemCard Community",
    version: "1.0.0",
    fileExtensions: [".sav", ".bin"],
  },
  {
    id: "2ship2harkinian",
    name: "2 Ship 2 Harkinian (MM Native PC)",
    platform: "pc",
    saveType: "directory",
    defaultExtension: "dir",
    suggestedFileName: "Save",
    description: "Harbour Masters native PC port of The Legend of Zelda: Majora's Mask.",
    author: "MemCard Community",
    version: "1.0.0",
    fileExtensions: [".sav", ".bin"],
  },
  {
    id: "sm64ex",
    name: "Super Mario 64 PC Port (sm64ex)",
    platform: "pc",
    saveType: "file",
    defaultExtension: ".bin",
    suggestedFileName: "sm64_save_file.bin",
    description: "Native PC port and decompilation of Super Mario 64.",
    author: "MemCard Community",
    version: "1.0.0",
    fileExtensions: [".sav", ".bin"],
  },
  {
    id: "opengoal",
    name: "OpenGOAL (Jak and Daxter Native PC)",
    platform: "pc",
    saveType: "directory",
    defaultExtension: "dir",
    suggestedFileName: "saves",
    description: "Native PC Port and engine recompilation of the Jak & Daxter trilogy.",
    author: "MemCard Community",
    version: "1.0.0",
    fileExtensions: [".sav", ".bin"],
  },
  {
    id: "custom-pc",
    name: "Custom Game / Emulator",
    platform: "pc",
    saveType: "file",
    defaultExtension: "*",
    suggestedFileName: "savegames",
    description: "Direct game save directory or custom emulator file",
    author: "User Custom",
    version: "1.0.0",
    isCustom: true,
  },
];

export const EMULATOR_PRESETS = BUILTIN_PRESETS;

const isTauriEnv = () =>
  typeof window !== "undefined" &&
  Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

interface BackendPresetDto {
  id: string;
  name: string;
  platform: string;
  saveType: "file" | "directory";
  fileExtensions: string[];
  defaultPaths: PresetPaths;
  description: string;
  author: string;
  version: string;
  isCustom: boolean;
  detectedPath?: string | null;
}

export async function fetchCommunityPresets(): Promise<EmulatorPreset[]> {
  if (!isTauriEnv()) {
    return BUILTIN_PRESETS;
  }

  try {
    const backendPresets = await invoke<BackendPresetDto[]>("list_presets");
    const mapped: EmulatorPreset[] = backendPresets.map((bp) => {
      const firstExt = bp.fileExtensions[0] || (bp.saveType === "directory" ? "dir" : ".sav");
      return {
        id: bp.id,
        name: bp.name,
        platform: bp.platform as Platform,
        saveType: bp.saveType,
        defaultExtension: firstExt,
        suggestedFileName: bp.saveType === "directory" ? bp.id : `save${firstExt}`,
        description: bp.description,
        author: bp.author,
        version: bp.version,
        isCustom: bp.isCustom,
        detectedPath: bp.detectedPath || null,
        fileExtensions: bp.fileExtensions,
        defaultPaths: bp.defaultPaths,
      };
    });

    // Append custom fallback preset if not already in list
    if (!mapped.some((p) => p.id === "custom-pc")) {
      mapped.push({
        id: "custom-pc",
        name: "Custom Game / Emulator",
        platform: "pc",
        saveType: "file",
        defaultExtension: "*",
        suggestedFileName: "savegames",
        description: "Direct game save directory or custom emulator file",
        author: "User Custom",
        version: "1.0.0",
        isCustom: true,
      });
    }

    return mapped;
  } catch (err) {
    console.warn("Failed to load presets via Tauri invoke:", err);
    return BUILTIN_PRESETS;
  }
}

export async function savePresetMod(preset: EmulatorPreset): Promise<void> {
  if (!isTauriEnv()) return;

  const dto: BackendPresetDto = {
    id: preset.id,
    name: preset.name,
    platform: preset.platform,
    saveType: preset.saveType || "file",
    fileExtensions: preset.fileExtensions || [preset.defaultExtension],
    defaultPaths: preset.defaultPaths || { macos: [], windows: [], linux: [] },
    description: preset.description,
    author: preset.author || "Community Contributor",
    version: preset.version || "1.0.0",
    isCustom: true,
  };

  await invoke("save_custom_preset", { preset: dto });
}

export async function deletePresetMod(presetId: string): Promise<void> {
  if (!isTauriEnv()) return;
  await invoke("delete_custom_preset", { presetId });
}

export async function openModsFolder(): Promise<void> {
  if (!isTauriEnv()) return;
  await invoke("open_presets_folder");
}

export interface DiscoveredGameSave {
  name: string;
  platform: Platform;
  detectedPath: string;
  presetId?: string;
}

export async function scanInstalledSaves(): Promise<DiscoveredGameSave[]> {
  if (!isTauriEnv()) return [];
  try {
    const raw = await invoke<DiscoveredGameSave[]>("scan_installed_saves");
    return raw || [];
  } catch (err) {
    console.warn("Failed to scan installed saves:", err);
    return [];
  }
}

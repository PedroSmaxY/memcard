export type Platform = "ps1" | "ps2" | "nintendo" | "modern" | "pc";

export interface EmulatorPreset {
  id: string;
  name: string;
  platform: Platform;
  defaultExtension: string;
  suggestedFileName: string;
  description: string;
}

export const EMULATOR_PRESETS: EmulatorPreset[] = [
  {
    id: "duckstation",
    name: "DuckStation (PS1)",
    platform: "ps1",
    defaultExtension: ".mcd",
    suggestedFileName: "shared_card_1.mcd",
    description: "PlayStation 1 memory card slot file",
  },
  {
    id: "retroarch-ps1",
    name: "RetroArch (PS1 / Beetle HW)",
    platform: "ps1",
    defaultExtension: ".srm",
    suggestedFileName: "game.srm",
    description: "RetroArch core Save RAM file",
  },
  {
    id: "pcsx2",
    name: "PCSX2 (PS2)",
    platform: "ps2",
    defaultExtension: ".ps2",
    suggestedFileName: "Mcd001.ps2",
    description: "PlayStation 2 8MB memory card file",
  },
  {
    id: "dolphin",
    name: "Dolphin (GameCube)",
    platform: "nintendo",
    defaultExtension: ".raw",
    suggestedFileName: "MemoryCardA.USA.raw",
    description: "GameCube memory card slot A/B raw file",
  },
  {
    id: "ryujinx",
    name: "Ryujinx (Switch)",
    platform: "nintendo",
    defaultExtension: "dir",
    suggestedFileName: "0000000000000001",
    description: "Nintendo Switch save directory",
  },
  {
    id: "rpcs3",
    name: "RPCS3 (PS3)",
    platform: "modern",
    defaultExtension: "dir",
    suggestedFileName: "savedata",
    description: "PlayStation 3 savedata folder",
  },
  {
    id: "custom-pc",
    name: "Custom PC Game",
    platform: "pc",
    defaultExtension: "dir",
    suggestedFileName: "savegames",
    description: "Direct PC game save directory or file",
  },
];

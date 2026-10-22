import React, { useState, useEffect } from "react";
import { X, Gamepad2, Sparkles, FolderOpen, CheckCircle, FolderArchive } from "lucide-react";
import { Platform, EmulatorPreset, BUILTIN_PRESETS, fetchCommunityPresets, openModsFolder } from "./presets";
import { AddGamePayload } from "../../hooks/useGames";
import { soundEngine } from "../../utils/audio";
import { open } from "@tauri-apps/plugin-dialog";

interface AddGameModalProps {
  isOpen: boolean;
  initialPlatform: Platform;
  onClose: () => void;
  onAdd: (payload: AddGamePayload) => Promise<void>;
}

export const AddGameModal: React.FC<AddGameModalProps> = ({
  isOpen,
  initialPlatform,
  onClose,
  onAdd,
}) => {
  const [presets, setPresets] = useState<EmulatorPreset[]>(BUILTIN_PRESETS);
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [savePath, setSavePath] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [detectedOnSystem, setDetectedOnSystem] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load community presets and detect local paths on mount/open
  useEffect(() => {
    if (isOpen) {
      fetchCommunityPresets().then((loaded) => {
        setPresets(loaded);
      });
    }
  }, [isOpen]);

  // Reset form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setPlatform(initialPlatform);
      setSavePath("");
      setSelectedPreset("");
      setDetectedOnSystem(false);
      setErrorMsg(null);
    }
  }, [isOpen, initialPlatform]);

  if (!isOpen) return null;

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    setErrorMsg(null);
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setPlatform(preset.platform);
      setName(preset.name.replace(/\s*\(.*\)/, ""));

      // Smart path auto-detection: if file exists on this machine, pre-fill it!
      if (preset.detectedPath) {
        setSavePath(preset.detectedPath);
        setDetectedOnSystem(true);
      } else {
        setSavePath(`/Users/player/Emulators/${preset.suggestedFileName}`);
        setDetectedOnSystem(false);
      }
      soundEngine.playClick();
    } else {
      setName("");
      setSavePath("");
      setDetectedOnSystem(false);
    }
  };

  const handleBrowse = async (isDirectoryMode: boolean = false) => {
    soundEngine.playClick();
    try {
      const preset = selectedPreset ? presets.find((p) => p.id === selectedPreset) : undefined;
      const isDir = isDirectoryMode || (preset ? preset.defaultExtension === "dir" : false);

      const selected = await open({
        multiple: false,
        directory: isDir,
        title: isDir ? "Select Emulator Save Directory" : "Select Emulator Save File",
      });

      if (selected && typeof selected === "string") {
        setSavePath(selected);
        setDetectedOnSystem(false);
        if (!name.trim()) {
          const extractedName = selected.split(/[/\\]/).pop()?.replace(/\.[^/.]+$/, "") || "";
          if (extractedName) setName(extractedName);
        }
      }
    } catch (err) {
      console.warn("Native file picker was canceled or unavailable:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter a game title");
      return;
    }
    if (!savePath.trim()) {
      setErrorMsg("Please enter a valid save file or folder path");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onAdd({
        name: name.trim(),
        platform,
        savePath: savePath.trim(),
        emulatorPreset: selectedPreset || undefined,
      });
      onClose();
    } catch (err) {
      setErrorMsg(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-[400px] rounded-2xl liquid-glass border border-white/15 p-5 text-neutral-100 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold tracking-wide">Enroll Game Save</h2>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {errorMsg && (
            <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-neutral-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Emulator / Game Preset</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playClick();
                  openModsFolder();
                }}
                className="text-[10px] text-neutral-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition-colors"
                title="Open user custom presets folder"
              >
                <FolderArchive className="w-3 h-3" />
                <span>Presets Mod Folder</span>
              </button>
            </div>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
            >
              <option value="">-- Choose Preset or Custom --</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} {preset.detectedPath ? "✨ (Found on System)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-300 block mb-1">
              Game Title
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Final Fantasy VII"
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-neutral-300 block mb-1">
              Platform
            </label>
            <div className="grid grid-cols-5 gap-1">
              {(["ps1", "ps2", "nintendo", "modern", "pc"] as Platform[]).map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => {
                    setPlatform(p);
                    soundEngine.playClick();
                  }}
                  className={`py-1 text-[10px] font-semibold uppercase rounded-md border transition-all ${
                    platform === p
                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                      : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-neutral-300 flex items-center gap-1.5">
                <span>Save Path (File or Folder)</span>
                {detectedOnSystem && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 animate-in fade-in">
                    <CheckCircle className="w-2.5 h-2.5" />
                    Found on your system
                  </span>
                )}
              </label>
              <span className="text-[10px] text-neutral-500">Auto-debounced</span>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={savePath}
                onChange={(e) => setSavePath(e.target.value)}
                placeholder="/path/to/save.mcd or /savedir"
                className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50 truncate"
              />
              <button
                type="button"
                onClick={() => handleBrowse(false)}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-neutral-200 hover:text-white transition-colors flex items-center gap-1.5 shrink-0 active:scale-95"
                title="Browse Save in Native File Picker"
              >
                <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                <span>Browse...</span>
              </button>
            </div>
            <div className="flex items-center justify-between text-[9px] text-neutral-500 mt-1">
              <span>Automated 3s debounced file monitoring starts on enroll.</span>
              <button
                type="button"
                onClick={() => handleBrowse(true)}
                className="text-neutral-400 hover:text-emerald-300 underline cursor-pointer"
                title="Browse as a directory"
              >
                Browse Directory
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-xs font-semibold shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Enrolling..." : "Enroll Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

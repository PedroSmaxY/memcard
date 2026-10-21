import React, { useState } from "react";
import { X, Gamepad2, Sparkles, FolderOpen } from "lucide-react";
import { Platform, EMULATOR_PRESETS } from "./presets";
import { AddGamePayload } from "../../hooks/useGames";
import { soundEngine } from "../../utils/audio";

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
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [savePath, setSavePath] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = EMULATOR_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setPlatform(preset.platform);
      if (!name) {
        setName(preset.name.replace(/\s*\(.*\)/, ""));
      }
      if (!savePath) {
        setSavePath(`/Users/player/Emulators/${preset.suggestedFileName}`);
      }
      soundEngine.playClick();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-[380px] rounded-2xl liquid-glass border border-white/15 p-5 text-neutral-100 shadow-2xl relative">
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
            <label className="text-[11px] font-medium text-neutral-300 flex items-center gap-1 mb-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Emulator Preset (Optional)
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">-- Choose Preset or Custom --</option>
              {EMULATOR_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
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
            <label className="text-[11px] font-medium text-neutral-300 flex items-center justify-between mb-1">
              <span>Save Path (File or Directory)</span>
              <FolderOpen className="w-3 h-3 text-neutral-400" />
            </label>
            <input
              type="text"
              value={savePath}
              onChange={(e) => setSavePath(e.target.value)}
              placeholder="/path/to/save.mcd or /path/to/savedir"
              className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs font-mono text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
            />
            <span className="text-[9px] text-neutral-500 mt-0.5 block">
              Automated 3s debounced file monitoring starts as soon as enrolled.
            </span>
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

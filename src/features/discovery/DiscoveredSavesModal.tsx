import React, { useState } from "react";
import { X, Sparkles, Check, HardDrive, AlertCircle } from "lucide-react";
import { DiscoveredGameSave } from "../games/presets";
import { AddGamePayload } from "../../hooks/useGames";
import { soundEngine } from "../../utils/audio";

interface DiscoveredSavesModalProps {
  isOpen: boolean;
  discovered: DiscoveredGameSave[];
  onClose: () => void;
  onImport: (saves: AddGamePayload[]) => Promise<void>;
}

export const DiscoveredSavesModal: React.FC<DiscoveredSavesModalProps> = ({
  isOpen,
  discovered,
  onClose,
  onImport,
}) => {
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    () => new Set(discovered.map((_, i) => i))
  );
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIndices(new Set(discovered.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  const handleConfirm = async () => {
    if (selectedIndices.size === 0) return;
    setIsImporting(true);
    setErrorMsg(null);

    const toImport: AddGamePayload[] = Array.from(selectedIndices).map((i) => {
      const item = discovered[i];
      return {
        name: item.name,
        platform: item.platform,
        savePath: item.detectedPath,
        emulatorPreset: item.presetId,
      };
    });

    try {
      await onImport(toImport);
      soundEngine.playSaveChime();
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      soundEngine.playAlert();
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div 
        className="w-full max-w-md bg-[#161922] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="discovered-title"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 id="discovered-title" className="text-sm font-bold text-white tracking-wide">
                Discovered Game Saves
              </h2>
              <p className="text-[11px] text-neutral-400">
                Found {discovered.length} save{discovered.length > 1 ? "s" : ""} on your computer
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            disabled={isImporting}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
            <span>Select saves to enroll:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="hover:text-emerald-400 transition-colors cursor-pointer"
              >
                All
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="hover:text-neutral-200 transition-colors cursor-pointer"
              >
                None
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {discovered.map((save, idx) => {
            const isChecked = selectedIndices.has(idx);
            return (
              <div
                key={idx}
                onClick={() => toggleSelect(idx)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                  isChecked
                    ? "bg-white/10 border-emerald-500/40 text-white shadow-sm"
                    : "bg-white/5 border-white/5 text-neutral-400 hover:bg-white/8"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center transition-all ${
                    isChecked
                      ? "bg-emerald-500 border-emerald-500 text-neutral-950 font-bold"
                      : "border-white/20"
                  }`}
                >
                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold truncate text-neutral-100">
                      {save.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-white/10 text-neutral-300">
                      {save.platform}
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-400 font-mono truncate mt-0.5" title={save.detectedPath}>
                    {save.detectedPath}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            disabled={isImporting}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedIndices.size === 0 || isImporting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>{isImporting ? "Enrolling..." : `Import Selected (${selectedIndices.size})`}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

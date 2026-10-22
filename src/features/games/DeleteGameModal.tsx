import React, { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Game } from "../../hooks/useGames";
import { soundEngine } from "../../utils/audio";

interface DeleteGameModalProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
  onConfirm: (gameId: string, deleteSnapshots: boolean) => Promise<void>;
}

export const DeleteGameModal: React.FC<DeleteGameModalProps> = ({
  isOpen,
  game,
  onClose,
  onConfirm,
}) => {
  const [deleteSnapshots, setDeleteSnapshots] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !game) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    soundEngine.playAlert();
    try {
      await onConfirm(game.id, deleteSnapshots);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-[380px] rounded-2xl liquid-glass border border-white/15 p-5 text-neutral-100 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-semibold tracking-wide text-neutral-200">
              Remove Game Tracking
            </h2>
          </div>
          <button
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-300 leading-relaxed">
              Stop monitoring save changes for <strong className="text-white font-semibold">{game.name}</strong>?
              <div className="text-[11px] text-neutral-400 mt-1">
                Your original emulator save file will <span className="text-emerald-400 font-medium">remain safe</span> on your computer.
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-neutral-300 hover:border-white/20 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={deleteSnapshots}
              onChange={(e) => setDeleteSnapshots(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-rose-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-rose-500"
            />
            <span className="select-none">
              Also delete all local backup snapshots from disk ({game.totalSnapshots} {game.totalSnapshots === 1 ? "snapshot" : "snapshots"})
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10 mt-5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick();
              onClose();
            }}
            disabled={isDeleting}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-xs font-semibold text-rose-300 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? "Removing..." : "Confirm Removal"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

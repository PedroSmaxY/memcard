import React, { useState } from "react";
import { Game } from "../../hooks/useGames";
import { Camera, History, Trash2, Folder, File, CheckCircle2, AlertCircle } from "lucide-react";
import { soundEngine } from "../../utils/audio";

interface GameCardProps {
  game: Game;
  onOpenHistory: (game: Game) => void;
  onCreateSnapshot: (gameId: string) => Promise<void>;
  onRemoveGame: (gameId: string) => Promise<void>;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onOpenHistory,
  onCreateSnapshot,
  onRemoveGame,
}) => {
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSnapshot = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCreatingSnapshot(true);
    try {
      await onCreateSnapshot(game.id);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Stop tracking and remove "${game.name}"?`)) {
      setIsDeleting(true);
      try {
        await onRemoveGame(game.id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div
      onClick={() => onOpenHistory(game)}
      className="group relative p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 transition-all cursor-pointer flex flex-col gap-2.5 shadow-sm active:scale-[0.99]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-neutral-400 group-hover:text-emerald-400 transition-colors">
            {game.isDirectory ? <Folder className="w-4 h-4" /> : <File className="w-4 h-4" />}
          </div>
          <div className="overflow-hidden">
            <h3 className="text-xs font-semibold text-neutral-200 truncate group-hover:text-white transition-colors">
              {game.name}
            </h3>
            <p className="text-[10px] text-neutral-400 font-mono truncate max-w-[220px]" title={game.savePath}>
              {game.savePath}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleSnapshot}
            disabled={isCreatingSnapshot}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-emerald-400 hover:bg-white/10 transition-colors disabled:opacity-50"
            title="Create Immediate Snapshot"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenHistory(game);
              soundEngine.playClick();
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
            title="View History"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
            title="Remove Game"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
        <div className="flex items-center gap-1.5 text-neutral-400 font-medium">
          <span className="px-1.5 py-0.5 rounded bg-white/5 uppercase tracking-wider text-[9px] font-bold text-neutral-300">
            {game.platform}
          </span>
          <span>{game.totalSnapshots} {game.totalSnapshots === 1 ? "snapshot" : "snapshots"}</span>
        </div>

        <div className="flex items-center gap-1">
          {game.syncStatus === "synced" ? (
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Synced
            </span>
          ) : game.syncStatus === "conflict" ? (
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <AlertCircle className="w-3 h-3" /> Conflict
            </span>
          ) : (
            <span className="text-neutral-500 font-medium">Local Shield Active</span>
          )}
        </div>
      </div>
    </div>
  );
};

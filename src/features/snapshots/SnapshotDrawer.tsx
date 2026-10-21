import React, { useState, useEffect, useCallback } from "react";
import { X, Star, RotateCcw, Clock, HardDrive, Plus, ShieldCheck } from "lucide-react";
import { Game, Snapshot } from "../../hooks/useGames";
import { soundEngine } from "../../utils/audio";

interface SnapshotDrawerProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onListSnapshots: (gameId: string) => Promise<Snapshot[]>;
  onCreateSnapshot: (gameId: string, label?: string) => Promise<unknown>;
  onRestoreSnapshot: (gameId: string, snapshotId: string) => Promise<void>;
  onTogglePin: (snapshotId: string, isPinned: boolean) => Promise<void>;
}

export const SnapshotDrawer: React.FC<SnapshotDrawerProps> = ({
  game,
  isOpen,
  onClose,
  onListSnapshots,
  onCreateSnapshot,
  onRestoreSnapshot,
  onTogglePin,
}) => {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    if (!game) return;
    setIsLoading(true);
    try {
      const list = await onListSnapshots(game.id);
      setSnapshots(list);
    } finally {
      setIsLoading(false);
    }
  }, [game, onListSnapshots]);

  useEffect(() => {
    if (isOpen && game) {
      loadSnapshots();
    }
  }, [isOpen, game, loadSnapshots]);

  if (!isOpen || !game) return null;

  const handleCreateSnapshot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await onCreateSnapshot(game.id, newLabel.trim() || undefined);
      setNewLabel("");
      await loadSnapshots();
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (snapshot: Snapshot) => {
    const confirmRestore = window.confirm(
      `Restore snapshot from ${new Date(snapshot.timestamp).toLocaleString()}?\n\nSafety Guarantee: MemCard will take an automatic backup snapshot of your current save file before restoring.`
    );
    if (!confirmRestore) return;

    setRestoringId(snapshot.id);
    try {
      await onRestoreSnapshot(game.id, snapshot.id);
      alert("Snapshot successfully restored! Active save is now updated.");
      await loadSnapshots();
    } catch (err) {
      alert(`Restore failed: ${err}`);
    } finally {
      setRestoringId(null);
    }
  };

  const handleTogglePin = async (snapshot: Snapshot) => {
    const targetState = !snapshot.isPinned;
    setSnapshots((prev) =>
      prev.map((s) => (s.id === snapshot.id ? { ...s, isPinned: targetState } : s))
    );
    try {
      await onTogglePin(snapshot.id, targetState);
    } catch {
      // Revert on error
      setSnapshots((prev) =>
        prev.map((s) => (s.id === snapshot.id ? { ...s, isPinned: !targetState } : s))
      );
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-[420px] max-h-[540px] rounded-2xl liquid-glass border border-white/15 p-5 text-neutral-100 shadow-2xl flex flex-col relative">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold truncate max-w-[280px]">
                {game.name}
              </h2>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Snapshot Version History & Restores
            </p>
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

        {/* Quick Snapshot Trigger */}
        <form onSubmit={handleCreateSnapshot} className="flex gap-2 py-3 border-b border-white/10 shrink-0">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Label (e.g. Before boss fight)"
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-emerald-500/50"
          />
          <button
            type="submit"
            disabled={isCreating}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition-all active:scale-95 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isCreating ? "Saving..." : "Snapshot"}</span>
          </button>
        </form>

        {/* Snapshots List */}
        <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-2 my-1">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-neutral-400">Loading snapshots...</div>
          ) : snapshots.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-neutral-400 gap-2">
              <HardDrive className="w-8 h-8 opacity-40 text-neutral-500" />
              <p className="text-xs">No historical snapshots found yet.</p>
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 flex items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-start gap-2.5 overflow-hidden">
                  <button
                    onClick={() => handleTogglePin(snap)}
                    className={`mt-0.5 p-1 rounded transition-colors ${
                      snap.isPinned ? "text-amber-400" : "text-neutral-500 hover:text-neutral-300"
                    }`}
                    title={snap.isPinned ? "Pinned (Protected from pruning)" : "Pin to protect"}
                  >
                    <Star className={`w-3.5 h-3.5 ${snap.isPinned ? "fill-amber-400" : ""}`} />
                  </button>

                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-neutral-200 truncate">
                        {snap.label || "Automated Snapshot"}
                      </span>
                      {snap.isPinned && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 font-medium">
                          Pinned
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 mt-0.5 font-mono">
                      <span>{new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      <span>•</span>
                      <span>{formatBytes(snap.sizeBytes)}</span>
                      <span>•</span>
                      <span className="text-neutral-500">{snap.hash.substring(0, 8)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRestore(snap)}
                  disabled={restoringId === snap.id}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-emerald-500 hover:text-neutral-950 text-neutral-300 text-xs font-medium transition-all active:scale-95 shrink-0 disabled:opacity-50"
                  title="Restore this snapshot"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{restoringId === snap.id ? "Restoring..." : "Restore"}</span>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer info banner */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-neutral-400 shrink-0">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Game Running Guard & Retention Shield</span>
          </div>
          <span>Max 10 / game</span>
        </div>

      </div>
    </div>
  );
};

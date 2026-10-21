import React from "react";
import { AlertTriangle, ArrowUpRight, ArrowDownLeft, Copy, HardDrive, Cloud } from "lucide-react";
import { soundEngine } from "../../utils/audio";

export interface SyncConflictData {
  gameId: string;
  gameName: string;
  localHash: string;
  localTimestamp: string;
  localSizeBytes: number;
  remoteHash: string;
  remoteTimestamp: string;
  remoteSizeBytes: number;
}

interface ConflictModalProps {
  conflict: SyncConflictData | null;
  isOpen: boolean;
  onResolve: (action: "keep_local" | "use_cloud" | "branch_slot") => Promise<void>;
  onClose: () => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  conflict,
  isOpen,
  onResolve,
  onClose,
}) => {
  if (!isOpen || !conflict) return null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleAction = async (action: "keep_local" | "use_cloud" | "branch_slot") => {
    soundEngine.playClick();
    await onResolve(action);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-[440px] rounded-2xl liquid-glass border border-amber-500/30 p-5 text-neutral-100 shadow-2xl relative flex flex-col gap-4">
        
        {/* Header Alert */}
        <div className="flex items-start gap-3 pb-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-100">
              Save Divergence Detected
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Both this device and Google Drive have new writes for <span className="text-white font-medium">"{conflict.gameName}"</span>.
            </p>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Local Save Card */}
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>Local Device</span>
            </div>
            <div className="flex flex-col gap-1 text-[11px] font-mono text-neutral-400">
              <div>Time: <span className="text-neutral-200">{new Date(conflict.localTimestamp).toLocaleTimeString()}</span></div>
              <div>Size: <span className="text-neutral-200">{formatBytes(conflict.localSizeBytes)}</span></div>
              <div>Hash: <span className="text-neutral-500">{conflict.localHash.substring(0, 8)}</span></div>
            </div>
          </div>

          {/* Cloud Save Card */}
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-neutral-300 font-semibold">
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span>Google Drive</span>
            </div>
            <div className="flex flex-col gap-1 text-[11px] font-mono text-neutral-400">
              <div>Time: <span className="text-neutral-200">{new Date(conflict.remoteTimestamp).toLocaleTimeString()}</span></div>
              <div>Size: <span className="text-neutral-200">{formatBytes(conflict.remoteSizeBytes)}</span></div>
              <div>Hash: <span className="text-neutral-500">{conflict.remoteHash.substring(0, 8)}</span></div>
            </div>
          </div>
        </div>

        {/* 3 Explicit Resolution Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={() => handleAction("keep_local")}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-left transition-all active:scale-[0.99] group"
          >
            <div className="flex items-center gap-2.5">
              <ArrowUpRight className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-neutral-200 group-hover:text-white">
                  Keep Local (Upload)
                </div>
                <div className="text-[10px] text-neutral-400">
                  Overwrites Google Drive with this machine's save state
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleAction("use_cloud")}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between text-left transition-all active:scale-[0.99] group"
          >
            <div className="flex items-center gap-2.5">
              <ArrowDownLeft className="w-4 h-4 text-sky-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-neutral-200 group-hover:text-white">
                  Use Cloud (Download)
                </div>
                <div className="text-[10px] text-neutral-400">
                  Safely backs up local save first, then restores cloud version
                </div>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleAction("branch_slot")}
            className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-between text-left transition-all active:scale-[0.99] group"
          >
            <div className="flex items-center gap-2.5">
              <Copy className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-amber-200 group-hover:text-amber-100">
                  Branch / Duplicate (Safe Both)
                </div>
                <div className="text-[10px] text-neutral-400">
                  Preserves local save and downloads cloud save into Slot 2
                </div>
              </div>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
};

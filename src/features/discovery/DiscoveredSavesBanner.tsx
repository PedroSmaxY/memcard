import React from "react";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { soundEngine } from "../../utils/audio";

interface DiscoveredSavesBannerProps {
  count: number;
  onReview: () => void;
  onDismiss: () => void;
}

export const DiscoveredSavesBanner: React.FC<DiscoveredSavesBannerProps> = ({
  count,
  onReview,
  onDismiss,
}) => {
  if (count <= 0) return null;

  return (
    <div className="mx-3 mt-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-500/30 flex items-center justify-between text-xs animate-fade-in shrink-0">
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <Sparkles className="w-3 h-3" />
        </div>
        <span className="text-neutral-200 text-[11px] font-medium">
          Found <strong className="text-emerald-300 font-bold">{count}</strong> game save{count > 1 ? "s" : ""} installed on your computer
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            soundEngine.playClick();
            onReview();
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold tracking-wide uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <span>Review & Import</span>
          <ArrowRight className="w-2.5 h-2.5" />
        </button>

        <button
          onClick={() => {
            soundEngine.playClick();
            onDismiss();
          }}
          className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

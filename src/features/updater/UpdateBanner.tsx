import React, { useState } from "react";
import { ArrowDownCircle, CheckCircle2, ChevronDown, ChevronUp, RefreshCw, X } from "lucide-react";
import { soundEngine } from "../../utils/audio";

interface UpdateBannerProps {
  available: boolean;
  version: string | null;
  body: string | null;
  isDownloading: boolean;
  progress: number;
  statusMessage: string | null;
  error: string | null;
  onInstall: () => void;
  onDismiss: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  available,
  version,
  body,
  isDownloading,
  progress,
  statusMessage,
  error,
  onInstall,
  onDismiss,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!available && !isDownloading && !error) {
    return null;
  }

  const handleInstallClick = () => {
    soundEngine.playClick();
    onInstall();
  };

  const handleDismissClick = () => {
    soundEngine.playClick();
    onDismiss();
  };

  return (
    <div
      role="region"
      aria-label="Software update notification"
      className="mx-3 mt-2 mb-1 p-3 rounded-xl bg-gradient-to-r from-emerald-950/40 via-surface-card/90 to-surface-card/80 border border-emerald-500/30 shadow-lg backdrop-blur-md relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2"
    >
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-32 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />

      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-inner">
            {isDownloading ? (
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : (
              <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
                {isDownloading ? "Updating" : "Update Available"}
              </span>
              {version && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  v{version}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted truncate">
              {statusMessage ||
                (isDownloading
                  ? `Downloading update (${progress}%)...`
                  : "New features and improvements are ready.")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {body && !isDownloading && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
              title={isExpanded ? "Hide changelog" : "View changelog"}
            >
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}

          {!isDownloading && (
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-surface-base hover:bg-emerald-400 active:scale-95 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Update & Restart</span>
            </button>
          )}

          {!isDownloading && (
            <button
              onClick={handleDismissClick}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar when downloading */}
      {isDownloading && (
        <div className="mt-2.5 w-full bg-surface-base/60 rounded-full h-1.5 overflow-hidden border border-white/5">
          <div
            className="bg-emerald-400 h-full transition-all duration-200 shadow-sm shadow-emerald-400/50"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Expandable Changelog Preview */}
      {isExpanded && body && (
        <div className="mt-3 pt-2.5 border-t border-white/5 text-xs text-text-muted max-h-36 overflow-y-auto font-sans leading-relaxed whitespace-pre-wrap">
          <p className="font-medium text-text-primary mb-1">What's New:</p>
          {body}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-xs text-red-400 bg-red-950/30 p-2 rounded border border-red-500/20">
          {error}
        </div>
      )}
    </div>
  );
};

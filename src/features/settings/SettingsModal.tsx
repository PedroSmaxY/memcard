import React, { useState } from "react";
import { X, Volume2, VolumeX, ShieldCheck, HardDrive, Info } from "lucide-react";
import { soundEngine } from "../../utils/audio";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [isMuted, setIsMuted] = useState(soundEngine.getIsMuted());

  if (!isOpen) return null;

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
    if (!nextMuted) {
      soundEngine.playClick();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-[360px] rounded-2xl liquid-glass border border-white/15 p-5 text-neutral-100 shadow-2xl relative">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold tracking-wide">MemCard Preferences</h2>
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

        <div className="flex flex-col gap-4">
          {/* Sound Setting */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center gap-2.5">
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-neutral-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              )}
              <div>
                <h4 className="text-xs font-semibold text-neutral-200">Synthesized Chimes</h4>
                <p className="text-[10px] text-neutral-400">Tactile Web Audio retro feedback</p>
              </div>
            </div>
            <button
              onClick={toggleMute}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                isMuted
                  ? "bg-white/10 text-neutral-400 hover:bg-white/15"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
              }`}
            >
              {isMuted ? "Muted" : "Active"}
            </button>
          </div>

          {/* Safety Shields Info */}
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Safety Shields Active</span>
            </div>
            <ul className="text-[10px] text-neutral-400 space-y-1 list-disc list-inside">
              <li>Zero-Byte Shield (halts upload if file drops to 0 B)</li>
              <li>Abnormal Shrink Shield (flags sudden &gt;80% drop)</li>
              <li>Game Running Guard (locks restore while game runs)</li>
              <li>Atomic pre-restore snapshot guarantee</li>
            </ul>
          </div>

          {/* About / Version */}
          <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>MemCard Cloud v0.1.0-alpha.0</span>
            </div>
            <span>&lt; 40 MB RSS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

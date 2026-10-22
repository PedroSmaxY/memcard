import React, { useState, useEffect } from "react";
import { X, Volume2, VolumeX, Bell, BellOff, ShieldCheck, HardDrive, Info } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { soundEngine } from "../../utils/audio";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const isTauriEnv = () =>
  typeof window !== "undefined" &&
  Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [isMuted, setIsMuted] = useState(soundEngine.getIsMuted());
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    if (isTauriEnv()) {
      invoke<boolean>("get_notifications_enabled")
        .then((enabled) => setNotificationsEnabled(enabled))
        .catch(() => {});
    }
  }, []);

  if (!isOpen) return null;

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    soundEngine.setMuted(nextMuted);
    if (!nextMuted) {
      soundEngine.playClick();
    }
  };

  const toggleNotifications = async () => {
    const next = !notificationsEnabled;
    setNotificationsEnabled(next);
    soundEngine.playClick();
    if (isTauriEnv()) {
      await invoke("set_notifications_enabled", { enabled: next }).catch(() => {});
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

          {/* Gamer Mode / OS Notifications Setting */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.04] border border-white/10">
            <div className="flex items-center gap-2.5">
              {notificationsEnabled ? (
                <Bell className="w-4 h-4 text-emerald-400" />
              ) : (
                <BellOff className="w-4 h-4 text-neutral-400" />
              )}
              <div>
                <h4 className="text-xs font-semibold text-neutral-200">Gamer Mode Notifications</h4>
                <p className="text-[10px] text-neutral-400">Discreet OS alerts for saves &amp; shields</p>
              </div>
            </div>
            <button
              onClick={toggleNotifications}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                notificationsEnabled
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-white/10 text-neutral-400 hover:bg-white/15"
              }`}
            >
              {notificationsEnabled ? "Active" : "Disabled"}
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
              <span>MemCard v0.2.1</span>
            </div>
            <span>&lt; 40 MB RSS</span>
          </div>
        </div>
      </div>
    </div>
  );
};

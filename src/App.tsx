import { useState } from "react";
import { 
  Gamepad2, 
  Cloud, 
  RotateCw, 
  Plus, 
  Settings, 
  ShieldCheck, 
  History,
  HardDrive
} from "lucide-react";

type Platform = "ps1" | "ps2" | "nintendo" | "modern" | "pc";

export default function App() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("ps1");
  const [isCloudConnected] = useState<boolean>(false);

  return (
    <main className="w-screen h-screen p-4 flex items-center justify-center bg-transparent">
      {/* Neo-Skeuomorphic Memory Card Outer Shell */}
      <div className="w-[420px] h-[580px] liquid-glass memory-card-clip rounded-2xl flex flex-col overflow-hidden text-neutral-100 shadow-2xl relative border border-white/10">
        
        {/* Custom Draggable Titlebar / Memory Card Header */}
        <header 
          data-tauri-drag-region 
          className="h-12 px-4 flex items-center justify-between border-b border-white/10 bg-black/20 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold tracking-wider uppercase text-neutral-300">
              MemCard 01 // Cloud
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                isCloudConnected 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                  : "bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10"
              }`}
              title="Cloud Sync Status"
            >
              <Cloud className="w-3 h-3" />
              <span>{isCloudConnected ? "Synced" : "Offline"}</span>
            </button>

            <button 
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Platform Selection Tabs */}
        <nav className="flex items-center gap-1 px-3 py-2 border-b border-white/5 bg-black/10 overflow-x-auto text-[11px] font-medium">
          {(["ps1", "ps2", "nintendo", "modern", "pc"] as Platform[]).map((platform) => (
            <button
              key={platform}
              onClick={() => setSelectedPlatform(platform)}
              className={`px-3 py-1 rounded-md uppercase tracking-wider transition-all ${
                selectedPlatform === platform
                  ? "bg-white/15 text-white font-semibold shadow-sm border border-white/10"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
              }`}
            >
              {platform}
            </button>
          ))}
        </nav>

        {/* Tactile Grip Grooves (Side detail) */}
        <div className="absolute right-1 top-20 flex flex-col gap-1.5 pointer-events-none opacity-40">
          <div className="w-1.5 h-6 tactile-groove rounded-full" />
          <div className="w-1.5 h-6 tactile-groove rounded-full" />
          <div className="w-1.5 h-6 tactile-groove rounded-full" />
        </div>

        {/* Main Content: Games / Slots Area */}
        <section className="flex-1 p-4 overflow-y-auto flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-neutral-500">
            <Gamepad2 className="w-8 h-8" />
          </div>
          <h2 className="text-sm font-semibold text-neutral-200 mb-1">
            No saves enrolled for {selectedPlatform.toUpperCase()}
          </h2>
          <p className="text-xs text-neutral-400 max-w-[260px] mb-4">
            Add a game or emulator directory to begin automated versioning and cloud protection.
          </p>

          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-medium text-white transition-all shadow-md active:scale-98">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Game Save</span>
          </button>
        </section>

        {/* Footer / Status Bar & Action Pills */}
        <footer className="h-14 px-4 border-t border-white/10 bg-black/30 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Shield Active</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-neutral-200 transition-all active:scale-95"
              title="View Snapshot History"
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>

            <button 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition-all shadow-lg active:scale-95"
              title="Sync All Now"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Sync Now</span>
            </button>
          </div>
        </footer>

      </div>
    </main>
  );
}

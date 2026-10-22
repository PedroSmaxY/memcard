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
import { Platform } from "./features/games/presets";
import { useGames, Game } from "./hooks/useGames";
import { useCloud } from "./hooks/useCloud";
import { GameCard } from "./features/games/GameCard";
import { AddGameModal } from "./features/games/AddGameModal";
import { DeleteGameModal } from "./features/games/DeleteGameModal";
import { SnapshotDrawer } from "./features/snapshots/SnapshotDrawer";
import { SettingsModal } from "./features/settings/SettingsModal";
import { ConflictModal } from "./features/sync/ConflictModal";
import { soundEngine } from "./utils/audio";

export default function App() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("ps1");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedGameForHistory, setSelectedGameForHistory] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);

  const {
    games,
    isLoading,
    addGame,
    removeGame,
    createSnapshot,
    listSnapshots,
    restoreSnapshot,
    togglePinSnapshot,
  } = useGames();

  const {
    status: cloudStatus,
    activeConflict,
    setActiveConflict,
    login: loginCloud,
    logout: logoutCloud,
    resolveConflict,
  } = useCloud();

  const filteredGames = games.filter((g) => g.platform === selectedPlatform);

  const handleSelectPlatform = (platform: Platform) => {
    setSelectedPlatform(platform);
    soundEngine.playClick();
  };

  const handleOpenHistory = (game: Game) => {
    setSelectedGameForHistory(game);
  };

  const handleCloudToggle = async () => {
    if (cloudStatus.isConnected) {
      if (window.confirm(`Disconnect Google Drive account (${cloudStatus.email})?`)) {
        await logoutCloud();
      }
    } else {
      await loginCloud();
    }
  };

  const handleCloseWindow = async () => {
    soundEngine.playClick();
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().hide();
    } catch {
      // In web / non-tauri mode, no-op
    }
  };

  const handleMinimizeWindow = async () => {
    soundEngine.playClick();
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch {
      // In web / non-tauri mode, no-op
    }
  };

  return (
    <main className="w-screen h-screen p-2.5 flex items-center justify-center bg-transparent select-none">
      {/* Neo-Skeuomorphic Memory Card Outer Shell - Organic Clean Rounded Borders */}
      <div className="w-full h-full liquid-glass rounded-2xl flex flex-col overflow-hidden text-neutral-100 shadow-2xl relative border border-white/12">
        
        {/* Custom Draggable Titlebar / Memory Card Header */}
        <header 
          data-tauri-drag-region 
          className="h-12 px-3.5 flex items-center justify-between border-b border-white/10 bg-black/30 cursor-grab active:cursor-grabbing select-none shrink-0"
        >
          <div className="flex items-center gap-3">
            {/* macOS Native Style Traffic Light Window Controls */}
            <div className="flex items-center gap-1.5 mr-1" data-tauri-drag-region="false">
              <button 
                onClick={handleCloseWindow}
                className="w-3 h-3 rounded-full bg-[#ff5f56] hover:brightness-110 active:brightness-90 flex items-center justify-center text-[7px] text-neutral-950 font-bold opacity-85 hover:opacity-100 transition-all cursor-pointer shadow-sm group"
                title="Hide to System Tray"
              >
                <span className="opacity-0 group-hover:opacity-100 leading-none">✕</span>
              </button>
              <button 
                onClick={handleMinimizeWindow}
                className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:brightness-110 active:brightness-90 flex items-center justify-center text-[7px] text-neutral-950 font-bold opacity-85 hover:opacity-100 transition-all cursor-pointer shadow-sm group"
                title="Minimize Window"
              >
                <span className="opacity-0 group-hover:opacity-100 leading-none">—</span>
              </button>
            </div>

            <div className="flex items-center gap-2 pointer-events-none">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold tracking-wider uppercase text-neutral-200">
                MemCard 01 // Cloud
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2" data-tauri-drag-region="false">
            <button 
              onClick={handleCloudToggle}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${
                cloudStatus.isConnected 
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" 
                  : "bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10"
              }`}
              title={cloudStatus.isConnected ? `Connected as ${cloudStatus.email}` : "1-Click Connect Google Drive"}
            >
              <Cloud className="w-3 h-3" />
              <span>{cloudStatus.isConnected ? "Drive Synced" : "Connect Drive"}</span>
            </button>

            <button 
              onClick={() => {
                soundEngine.playClick();
                setIsSettingsModalOpen(true);
              }}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Preferences"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Platform Selection Tabs */}
        <nav className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-black/10 overflow-x-auto text-[11px] font-medium shrink-0">
          <div className="flex items-center gap-1">
            {(["ps1", "ps2", "nintendo", "modern", "pc"] as Platform[]).map((platform) => (
              <button
                key={platform}
                onClick={() => handleSelectPlatform(platform)}
                className={`px-3 py-1 rounded-md uppercase tracking-wider transition-all ${
                  selectedPlatform === platform
                    ? "bg-white/15 text-white font-semibold shadow-sm border border-white/10"
                    : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              soundEngine.playClick();
              setIsAddModalOpen(true);
            }}
            className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white transition-colors"
            title="Add Game"
          >
            <Plus className="w-4 h-4" />
          </button>
        </nav>

        {/* Main Content: Games / Slots Area (Side grip grooves removed) */}
        <section className="flex-1 p-3 overflow-y-auto flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
              Loading memory card slots...
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-neutral-500">
                <Gamepad2 className="w-7 h-7" />
              </div>
              <h2 className="text-sm font-semibold text-neutral-200 mb-1">
                No saves enrolled for {selectedPlatform.toUpperCase()}
              </h2>
              <p className="text-xs text-neutral-400 max-w-[260px] mb-4">
                Add an emulator memory card or game save to begin automated versioning.
              </p>

              <button 
                onClick={() => {
                  soundEngine.playClick();
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-xs font-semibold text-emerald-300 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Game Save</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onOpenHistory={handleOpenHistory}
                  onCreateSnapshot={async (id) => {
                    await createSnapshot(id);
                  }}
                  onRequestDelete={(g) => {
                    setGameToDelete(g);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Footer / Status Bar & Action Pills */}
        <footer className="h-14 px-4 border-t border-white/10 bg-black/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Shield Active</span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                if (filteredGames.length > 0) {
                  soundEngine.playClick();
                  setSelectedGameForHistory(filteredGames[0]);
                } else if (games.length > 0) {
                  soundEngine.playClick();
                  setSelectedGameForHistory(games[0]);
                } else {
                  soundEngine.playAlert();
                }
              }}
              disabled={games.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-neutral-200 transition-all active:scale-95 disabled:opacity-40"
              title="View History"
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>

            <button 
              onClick={() => {
                soundEngine.playSaveChime();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition-all shadow-lg active:scale-95"
              title="Sync All Now"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Sync Now</span>
            </button>
          </div>
        </footer>

        {/* Modals & Drawers */}
        <AddGameModal
          isOpen={isAddModalOpen}
          initialPlatform={selectedPlatform}
          onClose={() => setIsAddModalOpen(false)}
          onAdd={addGame}
        />

        <DeleteGameModal
          isOpen={Boolean(gameToDelete)}
          game={gameToDelete}
          onClose={() => setGameToDelete(null)}
          onConfirm={async (id, deleteSnapshots) => {
            await removeGame(id, deleteSnapshots);
          }}
        />

        <SnapshotDrawer
          game={selectedGameForHistory}
          isOpen={Boolean(selectedGameForHistory)}
          onClose={() => setSelectedGameForHistory(null)}
          onListSnapshots={listSnapshots}
          onCreateSnapshot={createSnapshot}
          onRestoreSnapshot={restoreSnapshot}
          onTogglePin={togglePinSnapshot}
        />

        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={() => setIsSettingsModalOpen(false)}
        />

        <ConflictModal
          conflict={activeConflict}
          isOpen={Boolean(activeConflict)}
          onResolve={resolveConflict}
          onClose={() => setActiveConflict(null)}
        />

      </div>
    </main>
  );
}

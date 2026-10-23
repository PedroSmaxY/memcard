import { useState, useEffect } from "react";
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
import { useGames, Game, AddGamePayload } from "./hooks/useGames";
import { useCloud } from "./hooks/useCloud";
import { useUpdater } from "./hooks/useUpdater";
import { scanInstalledSaves, DiscoveredGameSave } from "./features/games/presets";
import { GameCard } from "./features/games/GameCard";
import { AddGameModal } from "./features/games/AddGameModal";
import { DeleteGameModal } from "./features/games/DeleteGameModal";
import { SnapshotDrawer } from "./features/snapshots/SnapshotDrawer";
import { SettingsModal } from "./features/settings/SettingsModal";
import { ConflictModal } from "./features/sync/ConflictModal";
import { UpdateBanner } from "./features/updater/UpdateBanner";
import { DiscoveredSavesBanner } from "./features/discovery/DiscoveredSavesBanner";
import { DiscoveredSavesModal } from "./features/discovery/DiscoveredSavesModal";
import { soundEngine } from "./utils/audio";

export default function App() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedGameForHistory, setSelectedGameForHistory] = useState<Game | null>(null);
  const [gameToDelete, setGameToDelete] = useState<Game | null>(null);
  const [discoveredSaves, setDiscoveredSaves] = useState<DiscoveredGameSave[]>([]);
  const [isDiscoveredModalOpen, setIsDiscoveredModalOpen] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(false);

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

  const {
    available: updateAvailable,
    version: updateVersion,
    body: updateBody,
    isChecking: isCheckingUpdates,
    isDownloading: isDownloadingUpdate,
    progress: updateProgress,
    error: updateError,
    statusMessage: updateStatusMessage,
    checkForUpdates,
    installUpdateAndRelaunch,
    dismiss: dismissUpdate,
  } = useUpdater();

  const handleOpenHistory = (game: Game) => {
    setSelectedGameForHistory(game);
  };

  const handleCloudToggle = async () => {
    if (isCloudLoading) return;
    setIsCloudLoading(true);
    try {
      if (cloudStatus.isConnected) {
        if (window.confirm(`Disconnect Google Drive account (${cloudStatus.email})?`)) {
          await logoutCloud();
        }
      } else {
        await loginCloud();
      }
    } finally {
      setIsCloudLoading(false);
    }
  };

  useEffect(() => {
    scanInstalledSaves().then((detected) => {
      setDiscoveredSaves(detected);
    });
  }, [games]);

  const handleBatchImport = async (saves: AddGamePayload[]) => {
    for (const save of saves) {
      await addGame(save);
    }
    setDiscoveredSaves([]);
  };

  return (
    <main className="w-screen h-screen flex flex-col bg-[#12141a] text-neutral-100 select-none overflow-hidden">
      {/* Draggable Titlebar / Memory Card Header with Native Traffic Light Spacing */}
      <header 
        className="h-11 flex items-center justify-between border-b border-white/10 bg-black/40 select-none shrink-0"
      >
        {/* Left padding / traffic light reserved area: explicit cursor-default, non-draggable */}
        <div 
          data-tauri-drag-region="false" 
          className="w-18 h-full flex items-center pl-3.5 cursor-default pointer-events-auto shrink-0" 
        />

        {/* Draggable center title */}
        <div 
          data-tauri-drag-region 
          className="flex-1 h-full flex items-center gap-2 cursor-grab active:cursor-grabbing pl-1 select-none"
        >
          <HardDrive className="w-4 h-4 text-emerald-400 pointer-events-none" />
          <span className="text-xs font-bold tracking-widest uppercase text-neutral-100 pointer-events-none">
            MEMCARD
          </span>
        </div>

        {/* Right action buttons: Add Save, Drive, Settings */}
        <div className="flex items-center gap-2 pr-3.5 shrink-0" data-tauri-drag-region="false">
          <button 
            onClick={() => {
              soundEngine.playClick();
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Add Game"
          >
            <Plus className="w-3 h-3 text-emerald-400" />
            <span>Add Save</span>
          </button>

          <button 
            onClick={handleCloudToggle}
            disabled={isCloudLoading}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer disabled:opacity-50 ${
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
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Preferences"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* In-App Auto-Updater Notification Banner */}
      <UpdateBanner
        available={updateAvailable}
        version={updateVersion}
        body={updateBody}
        isDownloading={isDownloadingUpdate}
        progress={updateProgress}
        statusMessage={updateStatusMessage}
        error={updateError}
        onInstall={installUpdateAndRelaunch}
        onDismiss={dismissUpdate}
      />

      {/* Auto-Discovered Local Saves Notification Banner */}
      <DiscoveredSavesBanner
        count={discoveredSaves.length}
        onReview={() => setIsDiscoveredModalOpen(true)}
        onDismiss={() => setDiscoveredSaves([])}
      />

      {/* Main Content: Games / Slots Area */}
      <section className="flex-1 p-3 overflow-y-auto flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
            Loading memory card slots...
          </div>
        ) : games.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3 text-neutral-500">
              <Gamepad2 className="w-7 h-7" />
            </div>
            <h2 className="text-sm font-semibold text-neutral-200 mb-1">
              No saves enrolled yet
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
            {games.map((game) => (
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
      <footer className="h-13 px-4 border-t border-white/10 bg-black/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400/80" />
          <span>Shield Active</span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (games.length > 0) {
                soundEngine.playClick();
                setSelectedGameForHistory(games[0]);
              } else {
                soundEngine.playAlert();
              }
            }}
            disabled={games.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium text-neutral-200 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            title="View History"
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>

          <button 
            onClick={() => {
              soundEngine.playSaveChime();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs transition-all shadow-lg active:scale-95 cursor-pointer"
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
        initialPlatform="ps1"
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
        onCheckForUpdates={() => checkForUpdates(true)}
        isCheckingUpdates={isCheckingUpdates}
        updateAvailable={updateAvailable}
        updateVersion={updateVersion}
        updateStatusMessage={updateStatusMessage}
        onInstallUpdate={installUpdateAndRelaunch}
      />

      <ConflictModal
        conflict={activeConflict}
        isOpen={Boolean(activeConflict)}
        onResolve={resolveConflict}
        onClose={() => setActiveConflict(null)}
      />

      <DiscoveredSavesModal
        isOpen={isDiscoveredModalOpen}
        discovered={discoveredSaves}
        onClose={() => setIsDiscoveredModalOpen(false)}
        onImport={handleBatchImport}
      />
    </main>
  );
}

import { Sun, Moon, User, Compass, MapPinned, Bookmark, Users } from "lucide-react";

export type AppTab = "planner" | "trip" | "friends" | "saved";

interface HeaderProps {
  onNew: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  savedCount: number;
}

export default function Header({
  onNew,
  isDarkMode,
  toggleDarkMode,
  activeTab,
  onTabChange,
  savedCount,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/10 dark:bg-[#0f172a]/25 backdrop-blur-[24px] border-b border-white/30 dark:border-white/10 transition-colors duration-300">
      <div className="max-w-[1280px] mx-auto px-6 lg:px-16 h-11 md:h-12 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={onNew} id="brand-logo">
          <span className="font-display font-light text-xl tracking-tight text-[#240046] dark:text-[#e2e8f0]">
            Bitácor.ai
          </span>
        </div>

        <nav className="flex items-center gap-1 sm:gap-1.5 font-mono text-[9px] tracking-[0.1em] text-[#240046]/70 dark:text-[#e2e8f0]/70 uppercase">
          <button
            type="button"
            onClick={() => onTabChange("planner")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === "planner"
                ? "bg-[#240046]/10 dark:bg-white/10 text-[#240046] dark:text-white font-bold"
                : "hover:text-[#240046] dark:hover:text-white hover:bg-[#240046]/5 dark:hover:bg-white/5"
            }`}
          >
            <Compass className="w-3 h-3 shrink-0" />
            <span className="hidden sm:inline">Planificador</span>
          </button>
          <button
            type="button"
            onClick={() => onTabChange("trip")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === "trip"
                ? "bg-[#240046]/10 dark:bg-white/10 text-[#240046] dark:text-white font-bold"
                : "hover:text-[#240046] dark:hover:text-white hover:bg-[#240046]/5 dark:hover:bg-white/5"
            }`}
            title="Viaje activo"
          >
            <span className="relative flex items-center justify-center shrink-0">
              <MapPinned className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500" />
              </span>
            </span>
            <span className="hidden sm:inline">Viaje activo</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("friends")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === "friends"
                ? "bg-[#240046]/10 dark:bg-white/10 text-[#240046] dark:text-white font-bold"
                : "hover:text-[#240046] dark:hover:text-white hover:bg-[#240046]/5 dark:hover:bg-white/5"
            }`}
            title="Feed de amigos"
          >
            <Users className="w-3 h-3 shrink-0" />
            <span className="hidden md:inline">Amigos</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange("saved")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              activeTab === "saved"
                ? "bg-[#240046]/10 dark:bg-white/10 text-[#240046] dark:text-white font-bold"
                : "hover:text-[#240046] dark:hover:text-white hover:bg-[#240046]/5 dark:hover:bg-white/5"
            }`}
            title="Itinerarios guardados"
          >
            <Bookmark className="w-3 h-3 shrink-0" />
            <span className="hidden md:inline">Guardados</span>
            {savedCount > 0 && (
              <span className="min-w-[1.1rem] h-4 px-1 rounded-full bg-[#240046] text-white text-[8px] font-bold flex items-center justify-center tabular-nums">
                {savedCount}
              </span>
            )}
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggleDarkMode}
            className="p-1.5 rounded-full bg-white/20 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:bg-white/30 dark:hover:bg-white/10 text-[#240046] dark:text-[#e2e8f0] transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            title={isDarkMode ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            id="dark-mode-toggle"
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-300 animate-pulse" />
            ) : (
              <Moon className="w-4 h-4 text-[#240046]" />
            )}
          </button>

          <button
            className="w-7 h-7 rounded-full bg-white/20 dark:bg-white/5 border border-white/40 dark:border-white/10 hover:bg-white/30 dark:hover:bg-white/10 text-[#240046] dark:text-[#e2e8f0] transition-all cursor-pointer active:scale-95 flex items-center justify-center"
            title="Perfil de Usuario"
            id="user-profile-button"
          >
            <User className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}

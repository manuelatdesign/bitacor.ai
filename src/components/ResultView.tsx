import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { 
  Check, 
  Copy, 
  Plus, 
  Calendar, 
  Info, 
  MapPin, 
  Briefcase, 
  Coffee, 
  Wifi, 
  Shield, 
  Zap,
  Moon,
  Edit2,
  Trash2,
  Bookmark,
  CheckCircle,
  Clock,
  SlidersHorizontal,
  Wallet,
  Heart,
  Gauge,
  Hotel,
  Lightbulb,
  CalendarCheck,
  ExternalLink,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { GeneratedItinerary, TravelConfig, ItineraryActivity } from "../types";
import {
  ACTIVITY_CATEGORIES,
  categoryImpliesCoworking,
  enrichProposalCategories,
  getActivityCategory,
  type ActivityCategoryId,
} from "../lib/activityCategories";
import { meaningfulTip, needsReservation } from "../lib/activityMeta";
import { resolveActivityPlace } from "../lib/activityPlace";
import { formatTripTitle } from "../lib/destinationFlag";
import { resolveTripCenter } from "../lib/geo";
import { toGoogleMapsUrl } from "../lib/googleMaps";
import { collectTipPlaces, linkifyTipText } from "../lib/linkifyTip";
import { lodgingDeepLinks, lodgingDisplayLabel, resolveLodgingHref } from "../lib/lodgingLinks";
import ActivityPlaceTitle from "./ActivityPlaceTitle";
import ResultSpotsMap from "./ResultSpotsMap";

interface ResultViewProps {
  proposals: GeneratedItinerary[];
  config: TravelConfig;
  setConfig: Dispatch<SetStateAction<TravelConfig>>;
  mode?: "draft" | "saved";
  updatingExisting?: boolean;
  resetAll?: () => void;
  onSaveItinerary?: (itinerary: GeneratedItinerary) => void;
  onDelete?: () => void;
  onEditPreferences?: () => void;
  onBackToList?: () => void;
}

function cloneProposal(proposal: GeneratedItinerary): GeneratedItinerary {
  return JSON.parse(JSON.stringify(proposal));
}

function typeLabel(p: GeneratedItinerary | undefined | null): string {
  return (p?.proposalType || "").toLowerCase();
}

function pickPrimary(proposals: GeneratedItinerary[]): GeneratedItinerary | null {
  if (!proposals?.length) return null;
  return (
    proposals.find((p) => typeLabel(p).includes("principal")) ||
    proposals[0] ||
    null
  );
}

function pickOptionB(proposals: GeneratedItinerary[]): GeneratedItinerary | null {
  if (!proposals?.length) return null;
  const primary = pickPrimary(proposals);
  return (
    proposals.find(
      (p) =>
        p !== primary &&
        (typeLabel(p).includes("opción b") ||
          typeLabel(p).includes("opcion b") ||
          typeLabel(p).includes("opción"))
    ) ||
    proposals.find((p) => p !== primary) ||
    proposals[1] ||
    null
  );
}

function normalizeProposal(proposal: GeneratedItinerary): GeneratedItinerary {
  const normalized: GeneratedItinerary = {
    ...proposal,
    proposalType: proposal.proposalType || "Principal",
    destinationTitle: proposal.destinationTitle || "Destino",
    shortDescription: proposal.shortDescription || "",
    practicalTips: Array.isArray(proposal.practicalTips) ? proposal.practicalTips : [],
    recommendedCafesAndCoworks: Array.isArray(proposal.recommendedCafesAndCoworks)
      ? proposal.recommendedCafesAndCoworks
      : [],
    itinerary: Array.isArray(proposal.itinerary) ? proposal.itinerary : [],
  };
  enrichProposalCategories([normalized]);
  return normalized;
}

export default function ResultView({
  proposals,
  config,
  setConfig,
  mode = "draft",
  updatingExisting = false,
  resetAll,
  onSaveItinerary,
  onDelete,
  onEditPreferences,
  onBackToList,
}: ResultViewProps) {
  const isSavedMode = mode === "saved";
  const primarySource = useMemo(() => {
    const p = pickPrimary(proposals);
    return p ? normalizeProposal(p) : null;
  }, [proposals]);

  const optionBSource = useMemo(() => {
    const p = pickOptionB(proposals);
    return p ? normalizeProposal(p) : null;
  }, [proposals]);

  const [activeVariant, setActiveVariant] = useState<"principal" | "opcionB">("principal");
  const [selectedProposal, setSelectedProposal] = useState<GeneratedItinerary | null>(() =>
    primarySource ? cloneProposal(primarySource) : null
  );
  
  // Tab within the detailed view
  const [activeResultTab, setActiveResultTab] = useState<"itinerary" | "spots" | "tips">("itinerary");
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(0);
  const [prefsOpen, setPrefsOpen] = useState(false);
  
  // Copy state
  const [copied, setCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Editing activity state
  const [editingActivityIdx, setEditingActivityIdx] = useState<{dayIdx: number, actIdx: number} | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDesc, setEditDesc] = useState<string>("");
  const [editTime, setEditTime] = useState<string>("");

  // Adding new activity state
  const [addingActivityDayIdx, setAddingActivityDayIdx] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState<string>("");
  const [newDesc, setNewDesc] = useState<string>("");
  const [newTime, setNewTime] = useState<string>("");
  const [newCategory, setNewCategory] = useState<ActivityCategoryId>("explore");

  // Ensure Principal loads when proposals arrive / change
  useEffect(() => {
    if (!selectedProposal && primarySource) {
      setSelectedProposal(cloneProposal(primarySource));
      setActiveVariant("principal");
      setSelectedDayIdx(0);
    }
  }, [primarySource, selectedProposal]);

  const tipPlaces = useMemo(() => {
    if (!selectedProposal) return [];
    return collectTipPlaces(
      selectedProposal.recommendedCafesAndCoworks,
      (selectedProposal.itinerary || []).flatMap((d) => d.activities || []),
      config.destination || selectedProposal.destinationTitle
    );
  }, [selectedProposal, config.destination]);

  const [isDarkMode, setIsDarkMode] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  const [spotsCenter, setSpotsCenter] = useState({ lat: 20, lng: 0 });

  useEffect(() => {
    const sync = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!selectedProposal) return;
    const withCoords = (selectedProposal.recommendedCafesAndCoworks || []).find(
      (c) => typeof c.lat === "number" && typeof c.lng === "number"
    );
    if (withCoords?.lat != null && withCoords.lng != null) {
      setSpotsCenter({ lat: withCoords.lat, lng: withCoords.lng });
      return;
    }
    let cancelled = false;
    resolveTripCenter(selectedProposal).then((c) => {
      if (!cancelled) setSpotsCenter(c);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedProposal]);

  const handleCopyItinerary = () => {
    if (!selectedProposal) return;

    let text = `🎒 BITÁCORA DE VIAJE DE IA - ${formatTripTitle(config.destination || selectedProposal.destinationTitle, config.arrivalDate).toUpperCase()}\n`;
    text += `🎯 ENFOQUE: ${selectedProposal.proposalType}\n`;
    text += `✨ ${selectedProposal.shortDescription}\n\n`;
    
    text += `💡 CONSEJOS PRÁCTICOS:\n`;
    selectedProposal.practicalTips.forEach(tip => {
      text += `- ${tip}\n`;
    });
    if (config.lodging?.trim()) {
      text += `\n🏨 HOSPEDAJE: ${config.lodging.trim()}\n`;
    }
    text += `\n`;

    text += `🗓️ ITINERARIO DETALLADO DE ${selectedProposal.itinerary.length} DÍAS:\n`;
    selectedProposal.itinerary.forEach(day => {
      text += `\nDía ${day.day}: ${day.title}\n`;
      (day.activities || []).forEach(act => {
        const cat = getActivityCategory(act);
        text += `  [${act.time}] ${act.title} - ${act.desc} (${cat.label})\n`;
      });
    });

    text += `\nRecomendado con Bitácor.ai 🗺️`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadProposal = (proposal: GeneratedItinerary, variant: "principal" | "opcionB") => {
    setSelectedProposal(cloneProposal(normalizeProposal(proposal)));
    setActiveVariant(variant);
    setIsSaved(false);
    setSelectedDayIdx(0);
    setActiveResultTab("itinerary");
    setEditingActivityIdx(null);
    setAddingActivityDayIdx(null);
  };

  const handleSwitchVariant = (variant: "principal" | "opcionB") => {
    if (variant === activeVariant) return;
    if (variant === "principal" && primarySource) {
      loadProposal(primarySource, "principal");
      return;
    }
    if (variant === "opcionB" && optionBSource) {
      loadProposal(optionBSource, "opcionB");
    }
  };

  const handleSave = () => {
    if (!selectedProposal || !onSaveItinerary) return;
    onSaveItinerary(selectedProposal);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  if (!selectedProposal) {
    return (
      <div className="w-full flex flex-col items-center justify-center gap-4 py-20 text-[#240046]">
        <p className="font-display text-xl font-light">No hay itinerario para mostrar.</p>
        <button
          type="button"
          onClick={() => (onBackToList || resetAll)?.()}
          className="px-5 py-2.5 rounded-full bg-[#240046] text-white text-xs font-mono uppercase tracking-wider cursor-pointer"
        >
          Volver
        </button>
      </div>
    );
  }

  // Delete activity handler
  const handleDeleteActivity = (dayIdx: number, actIdx: number) => {
    if (!selectedProposal) return;
    const updated = { ...selectedProposal };
    const day = updated.itinerary[dayIdx];
    if (!day) return;
    day.activities = (day.activities || []).filter((_, idx) => idx !== actIdx);
    setSelectedProposal(updated);
  };

  // Start editing activity
  const startEditActivity = (dayIdx: number, actIdx: number, act: ItineraryActivity) => {
    setEditingActivityIdx({ dayIdx, actIdx });
    setEditTitle(act.title);
    setEditDesc(act.desc);
    setEditTime(act.time);
  };

  // Save edited activity
  const saveEditedActivity = () => {
    if (!selectedProposal || !editingActivityIdx) return;
    const { dayIdx, actIdx } = editingActivityIdx;
    const updated = { ...selectedProposal };
    updated.itinerary[dayIdx].activities[actIdx] = {
      ...updated.itinerary[dayIdx].activities[actIdx],
      title: editTitle,
      desc: editDesc,
      time: editTime
    };
    setSelectedProposal(updated);
    setEditingActivityIdx(null);
  };

  // Add new activity
  const handleAddNewActivity = (dayIdx: number) => {
    if (!selectedProposal || !newTitle.trim()) return;
    const updated = { ...selectedProposal };
    const day = updated.itinerary[dayIdx];
    if (!day) return;
    day.activities = day.activities || [];
    day.activities.push({
      time: newTime || "Todo el día",
      title: newTitle,
      desc: newDesc || "Plan que agregaste tú.",
      category: newCategory,
      isCoworkingFriendly: categoryImpliesCoworking(newCategory),
    });
    setSelectedProposal(updated);
    
    // Clear adding form
    setAddingActivityDayIdx(null);
    setNewTitle("");
    setNewDesc("");
    setNewTime("");
    setNewCategory("explore");
  };

  // Detail view: Principal by default, with switch to Opción B
  return (
    <div className="w-full flex flex-col gap-8 animate-fade-in text-[#240046] dark:text-[#e2e8f0] relative z-10 pb-24">
      
      {/* Title block */}
      <div className="relative bg-white/15 backdrop-blur-[24px] border border-white/30 rounded-[1.75rem] px-5 py-4 sm:px-6 sm:py-5 overflow-hidden shadow-[0_8px_32px_0_rgba(31,38,135,0.12)]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-purple-500/10 to-pink-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {isSavedMode ? (
                <button
                  type="button"
                  onClick={onBackToList}
                  className="text-[10px] font-mono text-[#240046]/60 dark:text-white/45 hover:text-[#240046] flex items-center gap-1 transition-colors uppercase font-bold cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Guardados
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-[10px] font-mono text-[#240046]/60 dark:text-white/45 hover:text-[#240046] flex items-center gap-1 transition-colors uppercase font-bold cursor-pointer"
                >
                  ← Cambiar ajustes
                </button>
              )}
              {optionBSource && !isSavedMode && (
                <div className="flex items-center bg-white/40 dark:bg-white/10 backdrop-blur-md p-0.5 rounded-xl border border-[#240046]/10 dark:border-white/15">
                  <button
                    type="button"
                    onClick={() => handleSwitchVariant("principal")}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activeVariant === "principal"
                        ? "bg-[#240046] text-white shadow-sm dark:bg-[#ed93af] dark:text-[#240046]"
                        : "text-[#240046]/55 dark:text-white/55 hover:bg-[#240046]/5 dark:hover:bg-white/10"
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    Principal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSwitchVariant("opcionB")}
                    className={`flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activeVariant === "opcionB"
                        ? "bg-[#240046] text-white shadow-sm dark:bg-[#ed93af] dark:text-[#240046]"
                        : "text-[#240046]/55 dark:text-white/55 hover:bg-[#240046]/5 dark:hover:bg-white/10"
                    }`}
                  >
                    <Moon className="w-3 h-3" />
                    Opción B
                  </button>
                </div>
              )}
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-[0.08em] uppercase bg-[#240046]/12 dark:bg-white/12 text-[#240046] dark:text-[#e2e8f0] border border-[#240046]/10 dark:border-white/20">
                {isSavedMode ? "Guardado" : selectedProposal.proposalType}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-medium tracking-[0.08em] uppercase bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 dark:border-emerald-400/30">
                {selectedProposal.itinerary.length} días
              </span>
            </div>
            
            <h1 className="font-display font-extralight text-2xl sm:text-3xl md:text-[2rem] text-[#240046] dark:text-[#e2e8f0] tracking-tight leading-snug">
              {formatTripTitle(
                config.destination || selectedProposal.destinationTitle,
                config.arrivalDate || selectedProposal.savedAt
              )}
            </h1>
          </div>

          <div className="flex flex-row sm:flex-col gap-2 shrink-0 sm:min-w-[180px]">
            {isSavedMode ? (
              <>
                <button
                  type="button"
                  onClick={onEditPreferences}
                  className="flex-1 sm:w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#240046] text-white hover:bg-[#240046]/90 dark:bg-[#ed93af] dark:text-[#240046] dark:hover:bg-[#f3a8c0] active:scale-[0.98] transition-all duration-200 font-normal text-[11px] shadow-md border border-transparent cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Cambiar preferencias</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("¿Eliminar esta bitácora guardada?")) {
                      onDelete?.();
                    }
                  }}
                  className="flex-1 sm:w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-white/20 border border-rose-400/40 hover:bg-rose-500/10 text-rose-700 dark:text-rose-300 font-normal text-[11px] active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  className="flex-1 sm:w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#240046] text-white hover:bg-[#240046]/90 dark:bg-[#ed93af] dark:text-[#240046] dark:hover:bg-[#f3a8c0] active:scale-[0.98] transition-all duration-200 font-normal text-[11px] shadow-md border border-transparent cursor-pointer"
                >
                  {isSaved ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-300 dark:text-emerald-800" />
                      <span className="text-emerald-200 dark:text-emerald-900">
                        {updatingExisting ? "¡Actualizado!" : "¡Guardado!"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>{updatingExisting ? "Actualizar bitácora" : "Guardar"}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCopyItinerary}
                  className="flex-1 sm:w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-white/20 border border-white/40 hover:bg-white/30 text-[#240046] dark:text-[#e2e8f0] font-normal text-[11px] active:scale-[0.98] transition-all duration-200 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "¡Copiado!" : "Copiar"}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Layout Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column (Tabs & Saved list count overview) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Tabs Navigation Frame — horizontal scroll on mobile, column on desktop */}
          <div className="bg-white/15 backdrop-blur-[24px] border border-white/30 rounded-[2rem] p-2 sm:p-3 shadow-sm flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible scrollbar-thin">
            <button
              onClick={() => setActiveResultTab("itinerary")}
              className={`flex items-center gap-2 lg:gap-3 shrink-0 lg:w-full px-3.5 lg:px-5 py-2.5 lg:py-3 rounded-xl text-left text-[10px] lg:text-xs font-mono tracking-wider uppercase transition-all whitespace-nowrap ${
                activeResultTab === "itinerary"
                  ? "bg-[#240046] text-white shadow-[0_4px_16px_rgba(36,0,70,0.25)]"
                  : "text-[#240046]/70 dark:text-white/60 hover:bg-white/20 hover:text-[#240046]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
              <span>📅 Itinerario</span>
            </button>
            <button
              onClick={() => setActiveResultTab("spots")}
              className={`flex items-center gap-2 lg:gap-3 shrink-0 lg:w-full px-3.5 lg:px-5 py-2.5 lg:py-3 rounded-xl text-left text-[10px] lg:text-xs font-mono tracking-wider uppercase transition-all whitespace-nowrap ${
                activeResultTab === "spots"
                  ? "bg-[#240046] text-white shadow-[0_4px_16px_rgba(36,0,70,0.25)]"
                  : "text-[#240046]/70 dark:text-white/60 hover:bg-white/20 hover:text-[#240046]"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
              <span className="lg:hidden">
                💻 Cafés ({selectedProposal.recommendedCafesAndCoworks?.length || 0})
              </span>
              <span className="hidden lg:inline">
                💻 Cafés & cowork ({selectedProposal.recommendedCafesAndCoworks?.length || 0})
              </span>
            </button>
            <button
              onClick={() => setActiveResultTab("tips")}
              className={`flex items-center gap-2 lg:gap-3 shrink-0 lg:w-full px-3.5 lg:px-5 py-2.5 lg:py-3 rounded-xl text-left text-[10px] lg:text-xs font-mono tracking-wider uppercase transition-all whitespace-nowrap ${
                activeResultTab === "tips"
                  ? "bg-[#240046] text-white shadow-[0_4px_16px_rgba(36,0,70,0.25)]"
                  : "text-[#240046]/70 dark:text-white/60 hover:bg-white/20 hover:text-[#240046]"
              }`}
            >
              <Shield className="w-3.5 h-3.5 lg:w-4 lg:h-4 shrink-0" />
              <span>💡 Tips</span>
            </button>
          </div>

          {/* Preferencias — collapsible on mobile, always open on desktop */}
          <div className="bg-white/15 backdrop-blur-[24px] border border-white/30 rounded-[2rem] p-4 sm:p-6 shadow-sm flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setPrefsOpen((o) => !o)}
              aria-expanded={prefsOpen}
              className="flex items-center justify-between gap-2 w-full text-left text-xs font-mono font-bold uppercase tracking-wider text-[#240046]/80 dark:text-white/70 lg:pointer-events-none cursor-pointer lg:cursor-default"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#240046] dark:text-[#ed93af]" />
                <span>Tus preferencias</span>
              </span>
              <ChevronDown
                className={`w-4 h-4 shrink-0 text-[#240046]/50 dark:text-white/40 transition-transform duration-200 lg:hidden ${
                  prefsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <ul
              className={`flex-col gap-3 ${
                prefsOpen ? "flex" : "hidden"
              } lg:flex`}
            >
              <li className="flex items-start gap-2.5">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#240046]/50 dark:text-white/40" />
                <div className="min-w-0">
                  <p className="font-mono text-[8px] uppercase tracking-wider text-[#240046]/45 dark:text-white/35 font-bold">Destino</p>
                  <p className="text-xs font-medium text-[#240046] dark:text-[#e2e8f0] truncate">
                    {formatTripTitle(
                      config.destination || selectedProposal.destinationTitle || "",
                      config.arrivalDate || selectedProposal.savedAt
                    )}
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <Calendar className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#240046]/50 dark:text-white/40" />
                <div className="min-w-0">
                  <p className="font-mono text-[8px] uppercase tracking-wider text-[#240046]/45 dark:text-white/35 font-bold">Fechas</p>
                  <p className="text-xs font-medium text-[#240046] dark:text-[#e2e8f0]">
                    {(config.days > 0 ? config.days : selectedProposal.itinerary?.length || 0) > 0
                      ? `${config.days > 0 ? config.days : selectedProposal.itinerary.length} día${(config.days > 0 ? config.days : selectedProposal.itinerary.length) === 1 ? "" : "s"}`
                      : "—"}
                    {config.arrivalDate
                      ? ` · ${config.arrivalDate.split("-").reverse().join("/")}${config.arrivalTime ? ` ${config.arrivalTime}` : ""}`
                      : ""}
                    {config.departureDate
                      ? ` → ${config.departureDate.split("-").reverse().join("/")}${config.departureTime ? ` ${config.departureTime}` : ""}`
                      : ""}
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <Wallet className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#240046]/50 dark:text-white/40" />
                <div className="min-w-0">
                  <p className="font-mono text-[8px] uppercase tracking-wider text-[#240046]/45 dark:text-white/35 font-bold">Presupuesto</p>
                  <p className="text-xs font-medium text-[#240046] dark:text-[#e2e8f0]">
                    {config.budget || "Sin definir"}
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <Heart className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#240046]/50 dark:text-white/40" />
                <div className="min-w-0">
                  <p className="font-mono text-[8px] uppercase tracking-wider text-[#240046]/45 dark:text-white/35 font-bold">Intereses</p>
                  {config.interests.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {config.interests.map((interest) => (
                        <span
                          key={interest}
                          className="px-2 py-0.5 rounded-full bg-[#240046]/8 dark:bg-white/10 text-[9px] font-mono text-[#240046]/80 dark:text-white/75 border border-[#240046]/10 dark:border-white/10"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-light text-[#240046]/50 dark:text-white/40">Sin definir</p>
                  )}
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <Gauge className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#240046]/50 dark:text-white/40" />
                <div className="min-w-0">
                  <p className="font-mono text-[8px] uppercase tracking-wider text-[#240046]/45 dark:text-white/35 font-bold">Ritmo</p>
                  <p className="text-xs font-medium text-[#240046] dark:text-[#e2e8f0] leading-snug">
                    {config.pace && !config.pace.includes("Pendiente")
                      ? config.pace
                      : "Sin definir"}
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-2.5">
                <Hotel className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#240046]/50 dark:text-white/40" />
                <div className="min-w-0">
                  <p className="font-mono text-[8px] uppercase tracking-wider text-[#240046]/45 dark:text-white/35 font-bold">Hospedaje</p>
                  {config.lodging?.trim() ? (
                    <a
                      href={resolveLodgingHref(config.lodging, config.destination)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-[#240046] dark:text-[#ed93af] underline underline-offset-2 decoration-[#240046]/25 dark:decoration-[#ed93af]/40 truncate block"
                      title={config.lodging.trim()}
                    >
                      {lodgingDisplayLabel(config.lodging)}
                    </a>
                  ) : (
                    <p className="text-xs font-light text-[#240046]/50 dark:text-white/40">Sin definir</p>
                  )}
                </div>
              </li>
            </ul>
          </div>

          {/* Interactive Days selector for Quick Navigation */}
          {activeResultTab === "itinerary" && (
            <div className="bg-white/15 backdrop-blur-[24px] border border-white/30 rounded-[2rem] p-6 shadow-sm flex flex-col gap-4">
              <span className="font-mono text-[9px] tracking-[0.1em] text-[#240046]/60 dark:text-white/45 uppercase font-bold">
                Días ({selectedProposal.itinerary.length})
              </span>
              
              <div className="grid grid-cols-5 gap-2">
                {selectedProposal.itinerary.map((day, idx) => {
                  const isActive = selectedDayIdx === idx;
                  return (
                    <button
                      key={day.day}
                      onClick={() => setSelectedDayIdx(idx)}
                      className={`h-11 rounded-xl text-xs font-mono font-bold border transition-all ${
                        isActive
                          ? "bg-[#240046] border-[#240046] text-white shadow-md"
                          : "bg-white/20 border-white/30 text-[#240046] hover:bg-white/40"
                      }`}
                    >
                      D{day.day}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Right column (Tabs Active Content View) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* TAB 1: ITINERARIO DIARIO */}
          {activeResultTab === "itinerary" && (
            <div className="bg-white/15 backdrop-blur-[24px] border border-white/30 rounded-[2rem] p-6 sm:p-8 shadow-lg flex flex-col gap-6">
              
              {/* Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#240046]/10 pb-4">
                <div>
                  <span className="font-mono text-[10px] tracking-[0.1em] text-[#240046]/60 dark:text-white/45 uppercase font-bold block mb-1">
                    Tu day-by-day
                  </span>
                  <h2 className="font-display font-light text-2xl text-[#240046] dark:text-[#e2e8f0] tracking-tight">
                    Día {selectedProposal.itinerary[selectedDayIdx]?.day}: {selectedProposal.itinerary[selectedDayIdx]?.title}
                  </h2>
                </div>

                {/* Day Paging Pills */}
                <div className="flex gap-1.5 shrink-0">
                  <button
                    disabled={selectedDayIdx === 0}
                    onClick={() => setSelectedDayIdx(prev => prev - 1)}
                    className="p-2.5 rounded-xl border border-white/40 bg-white/20 hover:bg-white/40 disabled:opacity-20 transition-all cursor-pointer"
                  >
                    ←
                  </button>
                  <button
                    disabled={selectedDayIdx === selectedProposal.itinerary.length - 1}
                    onClick={() => setSelectedDayIdx(prev => prev + 1)}
                    className="p-2.5 rounded-xl border border-white/40 bg-white/20 hover:bg-white/40 disabled:opacity-20 transition-all cursor-pointer"
                  >
                    →
                  </button>
                </div>
              </div>

              {/* Day Activities List */}
              <div className="flex flex-col gap-3">
                {selectedProposal.itinerary[selectedDayIdx]?.activities?.map((act, actIdx) => {
                  const isEditingThis = editingActivityIdx?.dayIdx === selectedDayIdx && editingActivityIdx?.actIdx === actIdx;
                  const tip = meaningfulTip(act.tip);
                  const reservation = needsReservation(act.reservation);
                  const place = resolveActivityPlace(
                    act,
                    selectedProposal.recommendedCafesAndCoworks,
                    config.destination || selectedProposal.destinationTitle
                  );

                  return (
                    <div 
                      key={actIdx}
                      className="bg-white/20 hover:bg-white/30 border border-white/35 rounded-[1.25rem] pl-4 pr-4 pt-3.5 pb-3.5 flex flex-col gap-1.5 transition-all duration-300 shadow-sm relative group"
                    >
                      {/* Category badge — fixed top-right */}
                      <div className="absolute top-3 right-3 z-10 flex flex-col items-end gap-1">
                        {(() => {
                          const cat = getActivityCategory(act);
                          return (
                            <span
                              className={`${cat.chipClass} border rounded-full px-2 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wide whitespace-nowrap shadow-sm backdrop-blur-sm flex items-center gap-1`}
                            >
                              <span aria-hidden>{cat.emoji}</span> {cat.label}
                            </span>
                          );
                        })()}
                        {!isEditingThis && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEditActivity(selectedDayIdx, actIdx, act)}
                              className="p-1 rounded-md bg-white/70 hover:bg-white text-[#240046] border border-white/80 shadow-sm transition-colors cursor-pointer"
                              title="Editar actividad"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteActivity(selectedDayIdx, actIdx)}
                              className="p-1 rounded-md bg-white/70 hover:bg-rose-100 text-rose-700 border border-white/80 shadow-sm transition-colors cursor-pointer"
                              title="Eliminar actividad"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isEditingThis ? (
                        <div className="flex flex-col gap-2.5 w-full bg-white/40 backdrop-blur-sm p-3 rounded-xl border border-white/50 shadow-sm animate-fade-in mt-1">
                          <span className="text-[9px] font-mono font-bold text-[#240046]/70 dark:text-white/55 uppercase tracking-wider">Modificando actividad</span>
                          <div className="flex flex-col gap-2">
                            <input 
                              type="text"
                              value={editTime}
                              onChange={(e) => setEditTime(e.target.value)}
                              className="w-full bg-white/70 backdrop-blur-sm border border-[#240046]/15 rounded-xl px-3 py-2 text-xs font-sans text-[#240046] placeholder-[#240046]/40 outline-none transition-all focus:bg-white focus:border-[#240046] focus:ring-4 focus:ring-[#240046]/5"
                              placeholder="Horario"
                            />
                            <input 
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full bg-white/70 backdrop-blur-sm border border-[#240046]/15 rounded-xl px-3 py-2 text-xs font-sans font-medium text-[#240046] placeholder-[#240046]/40 outline-none transition-all focus:bg-white focus:border-[#240046] focus:ring-4 focus:ring-[#240046]/5"
                              placeholder="Título de la Actividad"
                            />
                            <textarea
                              value={editDesc}
                              onChange={(e) => setEditDesc(e.target.value)}
                              className="w-full bg-white/70 backdrop-blur-sm border border-[#240046]/15 rounded-xl px-3 py-2 text-xs font-sans font-light text-[#240046] placeholder-[#240046]/40 outline-none resize-none transition-all focus:bg-white focus:border-[#240046] focus:ring-4 focus:ring-[#240046]/5"
                              rows={2}
                              placeholder="Descripción breve"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={saveEditedActivity}
                              className="px-3 py-1.5 bg-[#240046] text-white rounded-full text-[10px] font-mono uppercase font-bold tracking-wider cursor-pointer"
                            >
                              Guardar cambios
                            </button>
                            <button 
                              onClick={() => setEditingActivityIdx(null)}
                              className="px-3 py-1.5 bg-white/50 border border-[#240046]/15 text-[#240046]/70 dark:text-white/60 rounded-full text-[10px] font-mono uppercase tracking-wider cursor-pointer hover:bg-white/80"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-[#240046]/65 dark:text-white/50 uppercase tracking-wide pr-28">
                            <Clock className="w-3 h-3 shrink-0" />
                            <span>{act.time}</span>
                          </div>
                          {place ? (
                            <ActivityPlaceTitle
                              title={act.title}
                              place={place}
                              isDarkMode={isDarkMode}
                            />
                          ) : (
                            <h4 className="font-normal text-sm sm:text-[15px] text-[#240046] dark:text-[#e2e8f0] leading-snug pr-28">
                              {act.title}
                            </h4>
                          )}
                          <p className="text-[11px] sm:text-xs text-[#240046]/75 dark:text-white/65 font-light leading-snug pr-2">
                            {act.desc}
                          </p>

                          {(tip || reservation) && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {tip && (
                                <div className="inline-flex items-start gap-1.5 max-w-full rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1.5">
                                  <Lightbulb className="w-3 h-3 text-amber-700 dark:text-amber-300 shrink-0 mt-px" />
                                  <p className="text-[10px] font-light leading-snug text-[#240046]/80 dark:text-white/70">
                                    <span className="font-mono font-bold uppercase tracking-wider text-amber-800/80 dark:text-amber-200/80 mr-1">Tip</span>
                                    {tip}
                                  </p>
                                </div>
                              )}
                              {reservation && (
                                <div className="inline-flex items-start gap-1.5 max-w-full rounded-lg border border-sky-500/20 bg-sky-500/10 px-2 py-1.5">
                                  <CalendarCheck className="w-3 h-3 text-sky-700 dark:text-sky-300 shrink-0 mt-px" />
                                  <p className="text-[10px] font-light leading-snug text-[#240046]/80 dark:text-white/70">
                                    <span className="font-mono font-bold uppercase tracking-wider text-sky-800/80 dark:text-sky-200/80 mr-1">Reserva</span>
                                    {reservation}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Empty State within the active day */}
                {selectedProposal.itinerary[selectedDayIdx]?.activities?.length === 0 && (
                  <div className="p-10 border border-dashed border-[#240046]/20 rounded-[1.5rem] bg-white/10 text-center flex flex-col items-center gap-2 animate-fade-in">
                    <p className="text-sm font-light text-[#240046]/70 dark:text-white/60">Este día está vacío. Suma un plan abajo ✨</p>
                  </div>
                )}
              </div>

              {/* Add Custom Activity Widget */}
              {addingActivityDayIdx === selectedDayIdx ? (
                <div className="border border-white/40 rounded-[1.5rem] bg-white/20 backdrop-blur-md p-5 flex flex-col gap-4 mt-2 animate-fade-in shadow-sm">
                  <div className="flex justify-between items-center border-b border-[#240046]/10 pb-2">
                    <span className="font-mono text-[9px] tracking-[0.1em] text-[#240046] uppercase font-bold">Añadir plan personalizado</span>
                    <button 
                      onClick={() => setAddingActivityDayIdx(null)}
                      className="text-[10px] font-mono text-[#240046]/50 dark:text-white/40 hover:text-rose-700 uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Cerrar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-mono uppercase text-[#240046]/60 tracking-wider">Horario estimado</label>
                      <input 
                        type="text" 
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        placeholder="Ej: 14:00 - 16:30"
                        className="w-full bg-white/70 backdrop-blur-sm border border-[#240046]/15 rounded-xl px-3 py-2.5 text-xs font-sans text-[#240046] placeholder-[#240046]/40 outline-none transition-all duration-300 focus:bg-white focus:border-[#240046] focus:ring-4 focus:ring-[#240046]/5 hover:bg-white/90 hover:border-[#240046]/30 shadow-sm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-mono uppercase text-[#240046]/60 tracking-wider">Título de la actividad *</label>
                      <input 
                        type="text" 
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Ej: Visita al Mirador de Arví"
                        className="w-full bg-white/70 backdrop-blur-sm border border-[#240046]/15 rounded-xl px-3 py-2.5 text-xs font-sans font-medium text-[#240046] placeholder-[#240046]/40 outline-none transition-all duration-300 focus:bg-white focus:border-[#240046] focus:ring-4 focus:ring-[#240046]/5 hover:bg-white/90 hover:border-[#240046]/30 shadow-sm"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-[9px] font-mono uppercase text-[#240046]/60 tracking-wider">Descripción detallada</label>
                      <textarea 
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="Detalla lo que harás, dónde queda, o enlaces de interés."
                        rows={3}
                        className="w-full bg-white/70 backdrop-blur-sm border border-[#240046]/15 rounded-xl px-3 py-2.5 text-xs font-sans font-light text-[#240046] placeholder-[#240046]/40 outline-none resize-none transition-all duration-300 focus:bg-white focus:border-[#240046] focus:ring-4 focus:ring-[#240046]/5 hover:bg-white/90 hover:border-[#240046]/30 shadow-sm leading-relaxed"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label htmlFor="new-category" className="text-[9px] font-mono uppercase text-[#240046]/60 tracking-wider">
                        Categoría
                      </label>
                      <select
                        id="new-category"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as ActivityCategoryId)}
                        className="w-full bg-white/70 backdrop-blur-sm border border-[#240046]/15 rounded-xl px-3 py-2.5 text-xs font-sans text-[#240046] outline-none transition-all duration-300 focus:bg-white focus:border-[#240046] focus:ring-4 focus:ring-[#240046]/5 hover:bg-white/90 hover:border-[#240046]/30 shadow-sm cursor-pointer"
                      >
                        {ACTIVITY_CATEGORIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.emoji} {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAddNewActivity(selectedDayIdx)}
                    className="w-full py-3 bg-[#240046] text-white rounded-full text-xs font-mono font-bold tracking-wider uppercase hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer shadow-md"
                  >
                    Sumar a la bitácora 📓
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingActivityDayIdx(selectedDayIdx)}
                  className="w-full border border-dashed border-[#240046]/25 hover:border-[#240046] rounded-full py-4 text-xs font-mono uppercase tracking-wider text-[#240046]/60 dark:text-white/45 hover:text-[#240046] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 bg-white/5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir actividad personalizada</span>
                </button>
              )}

            </div>
          )}

          {/* TAB 2: SPECIALTY CAFES & COWORKS */}
          {activeResultTab === "spots" && (
            <div className="bg-white/15 backdrop-blur-[24px] border border-white/30 rounded-[2rem] p-6 sm:p-8 shadow-lg flex flex-col gap-6 animate-fade-in">
              <div>
                <h2 className="font-display font-extralight text-3xl">Spots para trabajar</h2>
                <p className="text-xs text-[#240046]/60 dark:text-white/45 mt-1 font-light">Spots con buen wifi, enchufes y café decente ☕</p>
              </div>

              <ResultSpotsMap
                spots={selectedProposal.recommendedCafesAndCoworks || []}
                center={spotsCenter}
                isDarkMode={isDarkMode}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(selectedProposal.recommendedCafesAndCoworks || []).map((spot, idx) => (
                  <div 
                    key={idx} 
                    className="bg-white/10 backdrop-blur-[24px] border border-white/30 rounded-[1.5rem] p-6 flex flex-col justify-between gap-4 hover:bg-white/25 hover:border-white/45 hover:scale-[1.02] hover:shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] transition-all duration-300"
                    id={`spot-card-${idx}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex gap-3 items-center">
                        <div className="w-11 h-11 rounded-full bg-white/40 border border-white/60 text-[#240046] flex items-center justify-center shadow-sm shrink-0">
                          {spot.type === "coworking" ? <Briefcase className="w-5 h-5" /> : <Coffee className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="font-normal text-base text-[#240046] dark:text-[#e2e8f0] leading-tight">{spot.name}</h3>
                          <span className="text-[10px] font-mono uppercase tracking-[0.05em] text-[#240046]/60 block mt-0.5">
                            {spot.type === "coworking" ? "💻 Espacio Coworking" : "☕ Café de Especialidad"}
                          </span>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-white/50 border border-white text-[11px] font-bold text-[#240046] shadow-sm shrink-0">
                        ⭐ {spot.rating}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-[#240046]/80 dark:text-white/70 font-light leading-relaxed">
                      {spot.notes}
                    </p>

                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#240046]/70 dark:text-white/60 dark:text-white/55 uppercase tracking-widest border-t border-[#240046]/5 pt-3.5 mt-1">
                      <span className="flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-[#240046]/80" /> Wifi OK 💻
                      </span>
                      <a
                        href={toGoogleMapsUrl(spot.mapsUrl, {
                          name: spot.name,
                          destination: config.destination || selectedProposal.destinationTitle,
                          lat: spot.lat,
                          lng: spot.lng,
                          placeId: spot.placeId,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[#240046] hover:underline normal-case tracking-normal font-sans font-medium"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        Ver en Google Maps
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: NOMAD PRACTICAL TIPS + LODGING */}
          {activeResultTab === "tips" && (
            <div className="bg-white/15 backdrop-blur-[24px] border border-white/30 rounded-[2rem] p-6 sm:p-8 shadow-lg flex flex-col gap-8 animate-fade-in">
              <div>
                <h2 className="font-display font-extralight text-3xl">💡 Tips para llegar sin drama</h2>
                <p className="text-xs text-[#240046]/60 dark:text-white/45 mt-1 font-light">Lo esencial para aterrizar sin estrés.</p>
              </div>

              {/* Hospedaje — compact: tip + Google Hotels + input */}
              {(() => {
                const dest = config.destination || selectedProposal.destinationTitle || "";
                const links = lodgingDeepLinks(dest, config.arrivalDate, config.departureDate);
                const lodgingTip = (selectedProposal.practicalTips || []).find((t) => {
                  const l = t.toLowerCase();
                  return (
                    l.includes("hosped") ||
                    l.includes("hotel") ||
                    l.includes("hostel") ||
                    l.includes("zona de") ||
                    l.includes("aloj")
                  );
                });
                return (
                  <div className="rounded-[1.5rem] border border-white/35 bg-white/10 p-4 sm:p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 flex items-center justify-center shrink-0">
                          <Hotel className="w-4 h-4 text-white" />
                        </div>
                        <h3 className="font-display font-light text-lg text-[#240046] dark:text-[#e2e8f0] tracking-tight truncate">
                          Hospedaje
                        </h3>
                      </div>
                      <a
                        href={links.hotelsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/25 border border-white/40 text-[10px] font-mono uppercase tracking-wider text-[#240046] dark:text-[#e2e8f0] hover:bg-white/40 transition-colors shrink-0"
                      >
                        Google Hotels <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>

                    {lodgingTip && (
                      <p className="text-[11px] sm:text-xs text-[#240046]/80 dark:text-white/70 font-light leading-snug">
                        {linkifyTipText(
                          lodgingTip,
                          tipPlaces,
                          config.destination || selectedProposal.destinationTitle
                        )}
                      </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        id="lodging-input"
                        type="text"
                        inputMode="url"
                        value={config.lodging || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({ ...prev, lodging: e.target.value }))
                        }
                        placeholder="Link o nombre de tu hospedaje"
                        aria-label="Mi hospedaje"
                        className="flex-1 bg-white/50 dark:bg-white/10 border border-[#240046]/15 dark:border-white/15 rounded-xl px-3 py-2 text-xs font-sans text-[#240046] dark:text-[#e2e8f0] placeholder-[#240046]/35 dark:placeholder-white/30 outline-none focus:border-[#240046] dark:focus:border-[#ed93af] focus:ring-2 focus:ring-[#240046]/10"
                      />
                      {config.lodging?.trim() && (
                        <a
                          href={resolveLodgingHref(config.lodging, dest)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#240046] text-white dark:bg-[#ed93af] dark:text-[#240046] text-[10px] font-mono uppercase tracking-wider shrink-0"
                        >
                          Abrir <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {(selectedProposal.practicalTips || []).map((tip, idx) => {
                  let icon = <Info className="w-5 h-5 text-white" />;
                  let bgGradient = "from-cyan-400 to-indigo-500";
                  const lowerTip = tip.toLowerCase();
                  
                  if (lowerTip.includes("internet") || lowerTip.includes("wifi") || lowerTip.includes("mbps")) {
                    icon = <Wifi className="w-5 h-5 text-white" />;
                    bgGradient = "from-emerald-400 to-teal-500";
                  } else if (lowerTip.includes("zona") || lowerTip.includes("hosped") || lowerTip.includes("barrio") || lowerTip.includes("vecindar")) {
                    icon = <MapPin className="w-5 h-5 text-white" />;
                    bgGradient = "from-purple-400 to-pink-500";
                  } else if (lowerTip.includes("transport") || lowerTip.includes("metro") || lowerTip.includes("sim") || lowerTip.includes("uber")) {
                    icon = <Zap className="w-5 h-5 text-white" />;
                    bgGradient = "from-amber-400 to-orange-500";
                  } else if (lowerTip.includes("segur") || lowerTip.includes("robo") || lowerTip.includes("cuidado")) {
                    icon = <Shield className="w-5 h-5 text-white" />;
                    bgGradient = "from-blue-400 to-indigo-500";
                  }

                  return (
                    <div 
                      key={idx} 
                      className="bg-white/10 backdrop-blur-[24px] border border-white/30 rounded-[1.5rem] p-6 flex gap-4 items-start hover:bg-white/25 hover:border-white/45 transition-all duration-300"
                      id={`tip-card-${idx}`}
                    >
                      <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${bgGradient} flex items-center justify-center shrink-0 shadow-sm`}>
                        {icon}
                      </div>
                      <div className="flex-1 flex flex-col gap-1.5">
                        <span className="font-mono text-[9px] tracking-[0.1em] text-[#240046]/50 dark:text-white/40 uppercase font-bold">
                          CONSEJO {idx + 1}
                        </span>
                        <p className="text-xs sm:text-sm text-[#240046]/90 dark:text-white/80 font-light leading-relaxed">
                          {linkifyTipText(
                            tip,
                            tipPlaces,
                            config.destination || selectedProposal.destinationTitle
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

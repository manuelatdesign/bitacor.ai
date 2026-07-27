import React, { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
  DollarSign,
  Activity,
  Info,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  SUGGESTIONS,
  BUDGET_OPTIONS,
  GENERIC_DESTINATION_CATEGORIES,
  getCatalogCategories,
  hasDestination,
} from "../data";
import type { DestinationCategory } from "../data";
import type { TravelConfig, StepId } from "../types";
import EnergyPalettePicker from "./EnergyPalettePicker";
import DestinationAutocomplete from "./DestinationAutocomplete";
import DateRangePicker from "./DateRangePicker";

type CategorySource = "catalog" | "ai" | "fallback" | null;

interface WizardViewProps {
  config: TravelConfig;
  setConfig: React.Dispatch<React.SetStateAction<TravelConfig>>;
  currentStep: StepId;
  setCurrentStep: (step: StepId) => void;
  customDest: string;
  setCustomDest: (val: string) => void;
  isLoading: boolean;
  generateItinerary: () => Promise<void>;
  error: string | null;
  updatingExisting?: boolean;
}

export default function WizardView({
  config,
  setConfig,
  currentStep,
  setCurrentStep,
  customDest,
  setCustomDest,
  isLoading,
  generateItinerary,
  error,
  updatingExisting = false,
}: WizardViewProps) {
  const [destinationCategories, setDestinationCategories] = useState<DestinationCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesFallbackNotice, setCategoriesFallbackNotice] = useState(false);
  const [categorySource, setCategorySource] = useState<CategorySource>(null);
  /** Bumps to re-run resolution; forceAiRef skips catalog and always hits IA. */
  const [categoryReloadToken, setCategoryReloadToken] = useState(0);
  const forceAiRef = useRef(false);
  const categoriesRequestRef = useRef(0);
  const prevDestinationRef = useRef(config.destination);

  const destinationReady = hasDestination(config.destination);
  const hasCatalogMatch = destinationReady && !!getCatalogCategories(config.destination);

  // Hybrid: catalog if match (unless force AI), else IA; generic fallback on API fail
  useEffect(() => {
    const dest = config.destination;
    const prevDest = prevDestinationRef.current;
    const destinationChanged = prevDest !== dest;
    prevDestinationRef.current = dest;
    const forceAi = forceAiRef.current;
    forceAiRef.current = false;

    // Only clear interests when switching between two real destinations (keep QA / first fill)
    if (
      destinationChanged &&
      hasDestination(prevDest) &&
      hasDestination(dest) &&
      prevDest.trim().toLowerCase() !== dest.trim().toLowerCase()
    ) {
      setConfig((prev) => (prev.interests.length === 0 ? prev : { ...prev, interests: [] }));
    }

    if (!hasDestination(dest)) {
      categoriesRequestRef.current += 1;
      setDestinationCategories([]);
      setCategoriesLoading(false);
      setCategoriesFallbackNotice(false);
      setCategorySource(null);
      return;
    }

    const catalog = !forceAi ? getCatalogCategories(dest) : null;
    if (catalog) {
      categoriesRequestRef.current += 1;
      setDestinationCategories(catalog);
      setCategoriesLoading(false);
      setCategoriesFallbackNotice(false);
      setCategorySource("catalog");
      return;
    }

    const requestId = ++categoriesRequestRef.current;
    const controller = new AbortController();
    setCategoriesLoading(true);
    setCategoriesFallbackNotice(false);
    setDestinationCategories([]);
    setCategorySource(null);

    (async () => {
      try {
        const res = await fetch("/api/destination-categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ destination: dest.trim() }),
          signal: controller.signal,
        });
        if (categoriesRequestRef.current !== requestId) return;

        if (!res.ok) {
          const fallback = getCatalogCategories(dest) || [...GENERIC_DESTINATION_CATEGORIES];
          setDestinationCategories(fallback);
          setCategoriesFallbackNotice(true);
          setCategorySource(getCatalogCategories(dest) ? "catalog" : "fallback");
          return;
        }

        const data = await res.json();
        if (categoriesRequestRef.current !== requestId) return;

        const cats = Array.isArray(data?.categories) ? data.categories : [];
        if (cats.length >= 4) {
          setDestinationCategories(cats as DestinationCategory[]);
          setCategoriesFallbackNotice(false);
          setCategorySource("ai");
        } else {
          const fallback = getCatalogCategories(dest) || [...GENERIC_DESTINATION_CATEGORIES];
          setDestinationCategories(fallback);
          setCategoriesFallbackNotice(true);
          setCategorySource(getCatalogCategories(dest) ? "catalog" : "fallback");
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        if (categoriesRequestRef.current !== requestId) return;
        const fallback = getCatalogCategories(dest) || [...GENERIC_DESTINATION_CATEGORIES];
        setDestinationCategories(fallback);
        setCategoriesFallbackNotice(true);
        setCategorySource(getCatalogCategories(dest) ? "catalog" : "fallback");
      } finally {
        if (categoriesRequestRef.current === requestId) {
          setCategoriesLoading(false);
        }
      }
    })();

    return () => controller.abort();
  }, [config.destination, categoryReloadToken, setConfig]);

  const regenerateInterestsWithAi = () => {
    if (!hasDestination(config.destination) || categoriesLoading) return;
    setConfig((prev) => (prev.interests.length === 0 ? prev : { ...prev, interests: [] }));
    forceAiRef.current = true;
    setCategoryReloadToken((n) => n + 1);
  };

  // Keep interests aligned with resolved categories
  useEffect(() => {
    if (!destinationReady || categoriesLoading || destinationCategories.length === 0) {
      if (!destinationReady) {
        setConfig((prev) => (prev.interests.length === 0 ? prev : { ...prev, interests: [] }));
      }
      return;
    }
    const validCats = destinationCategories.map((c) => c.name);
    setConfig((prev) => {
      const matching = prev.interests.filter((i) => validCats.includes(i));
      if (matching.length === prev.interests.length) return prev;
      // Keep custom / QA interests when none match the category chips
      if (matching.length === 0 && prev.interests.length > 0) return prev;
      return { ...prev, interests: matching };
    });
  }, [destinationReady, categoriesLoading, destinationCategories, setConfig]);

  // Handle typing in destination field (does not trigger AI categories yet)
  const handleDestinationTyping = (val: string) => {
    setCustomDest(val);
    if (!val.trim()) {
      setConfig((prev) =>
        prev.destination === "" && prev.interests.length === 0
          ? prev
          : { ...prev, destination: "", interests: [] }
      );
    }
  };

  // Confirm destination → triggers category resolution (catalog or AI)
  const confirmDestination = (val: string) => {
    const trimmed = val.trim();
    setCustomDest(trimmed);
    setConfig((prev) => {
      if (prev.destination === trimmed) return prev;
      return { ...prev, destination: trimmed, interests: [] };
    });
  };

  const calculateDays = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const d1 = new Date(start + "T00:00:00");
    const d2 = new Date(end + "T00:00:00");
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
    return isNaN(diffDays) ? 0 : Math.max(1, diffDays);
  };

  const handleArrivalChange = (val: string) => {
    const dep = config.departureDate || "";
    const computedDays = val && dep ? calculateDays(val, dep) : 0;
    setConfig(prev => ({
      ...prev,
      arrivalDate: val,
      days: computedDays
    }));
  };

  const handleDepartureChange = (val: string) => {
    const arr = config.arrivalDate || "";
    const computedDays = arr && val ? calculateDays(arr, val) : 0;
    setConfig(prev => ({
      ...prev,
      departureDate: val,
      days: computedDays
    }));
  };

  // Toggle interest category (only when destination is set)
  const toggleInterest = (interestName: string) => {
    if (!hasDestination(config.destination)) return;
    setConfig((prev) => {
      const exists = prev.interests.includes(interestName);
      if (exists) {
        return {
          ...prev,
          interests: prev.interests.filter((i) => i !== interestName),
        };
      }
      return {
        ...prev,
        interests: [...prev.interests, interestName],
      };
    });
  };

  const handleContinue = async () => {
    if (currentStep === 1) {
      const dest = (customDest.trim() || config.destination).trim();
      if (!hasDestination(dest)) return;
      confirmDestination(dest);
      setCurrentStep(2);
      return;
    }
    if (currentStep === 3 && !hasDestination(config.destination)) {
      setCurrentStep(1);
      return;
    }
    if (currentStep === 4 && (categoriesLoading || config.interests.length === 0)) {
      return;
    }
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as StepId);
    } else {
      await generateItinerary();
    }
  };

  const canContinue =
    !(currentStep === 1 && !hasDestination(customDest.trim() || config.destination)) &&
    !(currentStep === 3 && !hasDestination(config.destination)) &&
    !(currentStep === 4 && (categoriesLoading || config.interests.length === 0));

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-fade-in text-[#240046] relative z-10">
      
      {/* 1. Left Sidebar: Interactive tracker (compact top bar on mobile) */}
      <aside className="lg:col-span-5 flex flex-col gap-4" id="wizard-sidebar">
        <div className="bg-white/15 backdrop-blur-[24px] border border-white/30 rounded-2xl lg:rounded-[2rem] px-4 py-3 lg:p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] flex flex-col gap-0 lg:gap-5">
          <div className="hidden lg:block border-b border-[#240046]/10 pb-3">
            <span className="font-mono text-[9px] tracking-[0.1em] text-[#240046]/60 uppercase font-bold">
              ESTADO DEL VIAJE
            </span>
            <h3 className="font-display font-light text-xl md:text-2xl text-[#240046] tracking-tight mt-0.5">
              Tu Bitácora
            </h3>
            <p className="text-xs font-sans font-light text-[#240046]/70 mt-0.5 leading-relaxed">
              Cuéntanos lo básico ✨ Armamos 2 planes a tu ritmo.
            </p>
          </div>

          <div className="flex flex-row items-center justify-between gap-1 lg:flex-col lg:items-stretch lg:gap-4 lg:relative lg:pl-6">

            {(() => {
              const isStepFilled = (stepNum: number): boolean => {
                if (stepNum === 1) {
                  return hasDestination(config.destination);
                }
                if (stepNum === 2) {
                  return !!config.arrivalDate && !!config.departureDate && config.days > 0;
                }
                if (stepNum === 3) {
                  return !!config.budget && config.budget.trim() !== "" && config.budget !== "Sin especificar" && config.budget !== "Sin definir";
                }
                if (stepNum === 4) {
                  return destinationReady && !categoriesLoading && config.interests.length > 0;
                }
                if (stepNum === 5) {
                  return !!config.pace && config.pace.trim() !== "" && !config.pace.includes("Pendiente") && config.pace !== "Sin especificar" && config.pace !== "Sin definir";
                }
                return false;
              };

              return ([
                { num: 1, name: "Destino", summary: destinationReady ? config.destination : "Aún no" },
                { num: 2, name: "Ida y Regreso", summary: config.days > 0 ? `${config.days} días (${config.arrivalDate ? config.arrivalDate.split('-').slice(1).reverse().join('/') : ''})` : "Aún no" },
                { num: 3, name: "Presupuesto", summary: config.budget && config.budget !== "Sin especificar" && config.budget !== "Sin definir" ? config.budget : "Aún no" },
                {
                  num: 4,
                  name: "Intereses",
                  summary: !destinationReady
                    ? "Elige destino primero"
                    : categoriesLoading
                      ? "Cargando vibes…"
                      : config.interests.length > 0
                        ? `${config.interests.length} elegidos`
                        : "Aún no",
                },
                { num: 5, name: "Ritmo & mood", summary: config.pace && !config.pace.includes("Pendiente") && config.pace !== "Sin especificar" && config.pace !== "Sin definir" ? (config.pace.includes("·") ? config.pace.split("·")[1]?.trim().replace(/\s*\(\d+\)$/, "") || config.pace : config.pace.split(" (")[0]) : "Aún no" }
              ] as const).map((step, idx) => {
                const isActive = step.num === currentStep;
                const isFilled = isStepFilled(step.num);

                let bubbleClasses = "";
                let iconOrNum: React.ReactNode = step.num;

                if (isActive) {
                  if (isFilled) {
                    bubbleClasses = "bg-[#240046] text-white border-2 border-[#240046] shadow-[0_4px_12px_rgba(36,0,70,0.25)] dark:bg-indigo-600 dark:border-indigo-500 dark:text-white";
                    iconOrNum = <Check className="w-3 h-3 lg:w-3.5 lg:h-3.5 stroke-[3]" />;
                  } else {
                    bubbleClasses = "bg-[#240046]/5 border-2 border-[#240046] text-[#240046] shadow-[0_0_10px_rgba(36,0,70,0.15)] ring-2 ring-[#240046]/10 animate-pulse dark:bg-indigo-950/20 dark:border-indigo-400 dark:text-indigo-300";
                    iconOrNum = step.num;
                  }
                } else {
                  if (isFilled) {
                    bubbleClasses = "bg-[#240046]/10 border border-[#240046]/40 text-[#240046] shadow-sm dark:bg-indigo-950/40 dark:border-indigo-500/50 dark:text-indigo-300 group-hover:border-[#240046] group-hover:bg-[#240046]/20 dark:group-hover:bg-indigo-900/40";
                    iconOrNum = <Check className="w-3 h-3 lg:w-3.5 lg:h-3.5 stroke-[2.5]" />;
                  } else {
                    bubbleClasses = "bg-white/5 border border-[#240046]/15 text-[#240046]/30 dark:border-white/10 dark:text-white/20 group-hover:bg-[#240046]/5 group-hover:border-[#240046]/45 group-hover:text-[#240046]/60 dark:group-hover:bg-white/10 dark:group-hover:border-white/30 dark:group-hover:text-white/50 group-hover:scale-105";
                    iconOrNum = step.num;
                  }
                }

                let labelClasses = "font-mono text-[9px] tracking-[0.1em] uppercase font-bold transition-all duration-300";
                if (isActive) {
                  labelClasses += " text-[#240046] dark:text-[#a5b4fc]";
                } else if (isFilled) {
                  labelClasses += " text-[#240046]/85 dark:text-white/80 group-hover:text-[#240046] dark:group-hover:text-indigo-400";
                } else {
                  labelClasses += " text-[#240046]/35 dark:text-white/25 group-hover:text-[#240046]/60 dark:group-hover:text-white/40";
                }

                let summaryClasses = "text-xs leading-tight mt-0.5 transition-all duration-300";
                if (isActive) {
                  if (isFilled) {
                    summaryClasses += " font-normal text-[#240046]/90 dark:text-indigo-300";
                  } else {
                    summaryClasses += " font-normal text-[#240046]/60 dark:text-white/70 italic";
                  }
                } else if (isFilled) {
                  summaryClasses += " font-light text-[#240046]/75 dark:text-white/70";
                } else {
                  summaryClasses += " font-light text-[#240046]/30 dark:text-white/20 group-hover:text-[#240046]/50 dark:group-hover:text-white/40 italic";
                }

                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => setCurrentStep(step.num)}
                    className={`flex items-center lg:items-start gap-0 lg:gap-3 text-left focus:outline-none transition-all duration-300 relative group cursor-pointer flex-1 lg:flex-none justify-center lg:justify-start ${
                      isActive ? "lg:scale-[1.01]" : ""
                    }`}
                    id={`step-indicator-${step.num}`}
                    aria-label={`Paso ${step.num}: ${step.name}`}
                    title={step.name}
                  >
                    {/* Desktop vertical connector */}
                    {idx < 4 && (
                      <div className={`hidden lg:block absolute left-[-11px] top-8 bottom-[-16px] w-px bg-gradient-to-b ${
                        isFilled
                          ? "from-[#240046]/40 to-[#240046]/5 dark:from-indigo-500/40 dark:to-indigo-500/5"
                          : "from-[#240046]/10 to-transparent dark:from-white/5 dark:to-transparent"
                      } z-0`} />
                    )}

                    {/* Mobile horizontal connector */}
                    {idx < 4 && (
                      <div
                        className={`lg:hidden absolute left-[calc(50%+14px)] right-[-50%] top-1/2 h-px -translate-y-1/2 z-0 ${
                          isFilled ? "bg-[#240046]/35" : "bg-[#240046]/12"
                        }`}
                        aria-hidden
                      />
                    )}

                    {/* Step bubble — relative on mobile, absolute on desktop */}
                    <div
                      className={`relative lg:absolute lg:left-[-26px] lg:top-0.5 w-7 h-7 lg:w-7.5 lg:h-7.5 rounded-full border flex items-center justify-center font-mono font-bold text-[10px] transition-all shrink-0 z-10 ${bubbleClasses}`}
                    >
                      {iconOrNum}
                    </div>

                    <div className="hidden lg:block pl-3.5">
                      <p className={labelClasses}>{step.name}</p>
                      <p className={summaryClasses}>{step.summary}</p>
                    </div>
                  </button>
                );
              });
            })()}
          </div>

          <div className="hidden lg:flex bg-white/20 border border-white/45 rounded-[1.25rem] px-3 py-2.5 items-center gap-2.5 shadow-sm">
            <Sparkles className="w-4 h-4 text-[#240046] shrink-0" />
            <p className="text-[10px] font-sans font-light leading-snug text-[#240046]/80">
              Con tus respuestas armamos <strong>2 planes</strong> (Principal y Opción B) ✨
            </p>
          </div>
        </div>
      </aside>

      {/* 2. Main Workspace Canvas */}
      <section className="lg:col-span-7 flex flex-col gap-4" id="wizard-form-workspace">
        <div className="bg-white/15 backdrop-blur-[24px] border border-white/30 rounded-[2rem] p-5 md:p-6 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] relative min-h-[460px] flex flex-col justify-between">
          
          {/* Form Content */}
          <div className="flex-grow flex flex-col justify-between">
            
            {/* STEP 1: DESTINATION */}
            {currentStep === 1 && (
              <div className="flex-grow flex flex-col gap-4 animate-fade-in">
                <div>
                  <span className="font-mono text-[9px] tracking-[0.1em] text-[#240046]/60 font-bold uppercase block mb-0.5">
                    📍 Paso 1 / Destino
                  </span>
                  <h2 className="font-display font-light text-2xl sm:text-3xl text-[#240046] tracking-tight leading-tight">
                    ¿A dónde te gustaría escapar?
                  </h2>
                  <p className="text-xs font-light text-[#240046]/80 mt-1 leading-relaxed">
                    Escribe cualquier ciudad, o elige un hit de la comunidad.
                  </p>
                </div>

                {/* Input with Google Places / city autocomplete */}
                <DestinationAutocomplete
                  value={customDest}
                  onChange={handleDestinationTyping}
                  onSelect={confirmDestination}
                  id="destination-input"
                />

                {/* Suggestions Grid */}
                <div className="mt-3 flex-grow flex flex-col">
                  <span className="font-mono text-[9px] tracking-[0.1em] text-[#240046]/60 font-bold uppercase block mb-2.5">
                    📍 Hits de la comunidad
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 flex-grow">
                    {SUGGESTIONS.slice(0, 3).map((suggestion) => {
                      const isSelected = config.destination.toLowerCase() === suggestion.name.toLowerCase();
                      return (
                        <div
                          key={suggestion.id}
                          onClick={() => confirmDestination(suggestion.name)}
                          className={`relative h-full min-h-[110px] rounded-[1.25rem] overflow-hidden cursor-pointer group border transition-all duration-300 ${
                            isSelected 
                              ? "border-[#240046] ring-2 ring-[#240046]/10 shadow-[0_6px_20px_rgba(31,38,135,0.12)]" 
                              : "border-white/30 hover:border-white/50 hover:scale-[1.01]"
                          }`}
                          id={`suggestion-card-${suggestion.id}`}
                        >
                          <img 
                            src={suggestion.image} 
                            alt={suggestion.name} 
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#240046]/90 via-[#240046]/25 to-transparent" />
                          <div className="absolute inset-0 p-3 flex flex-col justify-end gap-1.5">
                            <h4 className="text-xs sm:text-sm text-white font-medium tracking-wide drop-shadow-sm">
                              {suggestion.name}
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {suggestion.tags.map((tag, idx) => (
                                <span key={idx} className="bg-white/20 text-white backdrop-blur-[6px] px-1.5 py-0.5 rounded-full text-[7.5px] font-mono uppercase tracking-[0.05em] font-medium border border-white/10">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ARRIVAL & RETURN DETAILS */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div>
                  <span className="font-mono text-[9px] tracking-[0.1em] text-[#240046]/60 dark:text-white/45 font-bold uppercase block mb-0.5">
                    📅 Paso 2 / Fechas
                  </span>
                  <h2 className="font-display font-light text-2xl sm:text-3xl text-[#240046] dark:text-[#e2e8f0] tracking-tight leading-tight">
                    Define la ida y regreso
                  </h2>
                  <p className="text-xs font-light text-[#240046]/80 dark:text-white/65 mt-1 leading-relaxed">
                    Elige el rango en un solo calendario. La hora es opcional.
                  </p>
                </div>

                <div className="bg-white/20 dark:bg-white/5 border border-white/30 dark:border-white/10 rounded-[1.5rem] p-4 shadow-sm">
                  <DateRangePicker
                    startDate={config.arrivalDate || ""}
                    endDate={config.departureDate || ""}
                    startTime={config.arrivalTime || ""}
                    endTime={config.departureTime || ""}
                    onStartDateChange={handleArrivalChange}
                    onEndDateChange={handleDepartureChange}
                    onStartTimeChange={(val) => setConfig((prev) => ({ ...prev, arrivalTime: val }))}
                    onEndTimeChange={(val) => setConfig((prev) => ({ ...prev, departureTime: val }))}
                    daysCount={config.days}
                  />
                </div>

                {config.days > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <Calendar className="w-4 h-4 text-[#240046]/50 dark:text-white/40" />
                    <p className="text-xs font-sans font-light text-[#240046]/70 dark:text-white/55">
                      Listo: <strong className="font-medium">{config.days} día{config.days === 1 ? "" : "s"} de viaje</strong> 📅
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: BUDGET */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div>
                  <span className="font-mono text-[9px] tracking-[0.1em] text-[#240046]/60 font-bold uppercase block mb-0.5">
                    💸 Paso 3 / Presupuesto
                  </span>
                  <h2 className="font-display font-light text-2xl sm:text-3xl text-[#240046] tracking-tight leading-tight">
                    ¿Cuál es tu rango de presupuesto?
                  </h2>
                  <p className="text-xs font-light text-[#240046]/80 mt-1 leading-relaxed">
                    Nos ayuda a sugerir hospedaje, coworkings y costos de comida.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-1.5">
                  {BUDGET_OPTIONS.map((option) => {
                    const isSelected = config.budget === option.name;
                    return (
                      <div
                        key={option.id}
                        onClick={() => setConfig(prev => ({ ...prev, budget: option.name }))}
                        className={`bg-white/10 backdrop-blur-[24px] rounded-[1.25rem] p-4 cursor-pointer border flex flex-col justify-between transition-all gap-3 ${
                          isSelected
                            ? "border-[#240046] ring-2 ring-[#240046]/10 bg-white/20 shadow-[0_6px_20px_0_rgba(31,38,135,0.1)]"
                            : "border-white/30 hover:border-white/50 hover:scale-[1.01]"
                        }`}
                        id={`budget-option-${option.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="p-1.5 rounded-full bg-white/30 text-[#240046] border border-white/40">
                            <span className="material-symbols-outlined text-[18px] block">{option.icon}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono tracking-wider font-bold uppercase ${
                            isSelected ? "bg-[#240046] text-white" : "bg-white/35 text-[#240046]/60"
                          }`}>
                            {option.label}
                          </span>
                        </div>

                        <div className="mt-2">
                          <h3 className="font-normal text-sm text-[#240046]">{option.name}</h3>
                          <p className="text-[10px] text-[#240046]/70 mt-0.5 font-light leading-relaxed">
                            {option.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: INTERESTS (DEPENDENT ON DESTINATION) */}
            {currentStep === 4 && (
              <div className="flex flex-col gap-4 animate-fade-in">
                {!destinationReady ? (
                  <div className="flex flex-col items-center text-center gap-4 py-10 px-4 rounded-[1.5rem] border border-dashed border-[#240046]/20 dark:border-white/15 bg-white/10 dark:bg-white/5">
                    <div className="w-12 h-12 rounded-full bg-[#240046]/8 dark:bg-white/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-[#240046]/60 dark:text-white/50" />
                    </div>
                    <div className="max-w-sm">
                      <h2 className="font-display font-light text-xl sm:text-2xl text-[#240046] dark:text-[#e2e8f0] tracking-tight">
                        Primero elige un destino
                      </h2>
                      <p className="text-xs font-light text-[#240046]/70 dark:text-white/55 mt-2 leading-relaxed">
                        El vibe depende del destino. Vuelve al paso 1, elige ciudad y después qué te late vivir allí.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-5 py-2.5 rounded-full bg-[#240046] dark:bg-[#ed93af] text-white dark:text-[#240046] text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                    >
                      Elegir destino
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <span className="font-mono text-[9px] tracking-[0.1em] text-[#240046]/60 dark:text-white/45 font-bold uppercase block mb-0.5">
                        ✨ Paso 4 / En {config.destination}
                      </span>
                      <h2 className="font-display font-light text-2xl sm:text-3xl text-[#240046] dark:text-[#e2e8f0] tracking-tight leading-tight">
                        ¿Qué te late vivir en {config.destination}?
                      </h2>
                      <p className="text-xs font-light text-[#240046]/80 dark:text-white/65 mt-1 leading-relaxed">
                        Con esto armamos el day-by-day ✨
                      </p>
                      {!categoriesLoading && categorySource === "catalog" && (
                        <p className="mt-2 text-[10px] font-light text-[#240046]/55 dark:text-white/40">
                          Mood curado para este destino. ¿Quieres otra tanda con IA?
                        </p>
                      )}
                      {!categoriesLoading && categorySource === "ai" && (
                        <p className="mt-2 text-[10px] font-light text-[#240046]/55 dark:text-white/40">
                          Categorías hechas con IA para {config.destination}.
                        </p>
                      )}
                      {categoriesFallbackNotice && !categoriesLoading && (
                        <p className="mt-2 text-[10px] font-light text-[#240046]/55 dark:text-white/40 flex items-center gap-1.5">
                          <Info className="w-3 h-3 shrink-0" />
                          No salió el mood personalizado 🙈 Te dejamos unas ideas de respaldo.
                        </p>
                      )}
                      {destinationReady && (
                        <button
                          type="button"
                          onClick={regenerateInterestsWithAi}
                          disabled={categoriesLoading}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#240046]/15 dark:border-white/15 bg-white/20 dark:bg-white/5 text-[10px] font-mono uppercase tracking-wider text-[#240046]/80 dark:text-white/70 hover:border-[#240046]/35 dark:hover:border-white/30 disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${categoriesLoading ? "animate-spin" : ""}`} />
                          {categoriesLoading
                            ? "Generando…"
                            : categorySource === "ai"
                              ? "Otra tanda con IA"
                              : hasCatalogMatch
                                ? "Regenerar con IA"
                                : "Generar con IA"}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-1.5">
                      {categoriesLoading
                        ? Array.from({ length: 6 }).map((_, i) => (
                            <div
                              key={`cat-skel-${i}`}
                              className="rounded-[1.25rem] p-3 border border-white/20 dark:border-white/10 bg-white/10 animate-pulse min-h-[104px] flex flex-col gap-2.5"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#240046]/10 dark:bg-white/10" />
                              <div className="h-3 w-2/3 rounded bg-[#240046]/10 dark:bg-white/10" />
                              <div className="h-2 w-full rounded bg-[#240046]/8 dark:bg-white/10" />
                              <div className="h-2 w-3/4 rounded bg-[#240046]/8 dark:bg-white/10" />
                            </div>
                          ))
                        : destinationCategories.map((interest) => {
                        const isSelected = config.interests.includes(interest.name);
                        return (
                          <div
                            key={interest.id}
                            onClick={() => toggleInterest(interest.name)}
                            className={`bg-white/10 backdrop-blur-[24px] rounded-[1.25rem] p-3 cursor-pointer border flex flex-col justify-between gap-2.5 transition-all ${
                              isSelected
                                ? "border-[#240046] dark:border-[#ed93af] ring-2 ring-[#240046]/10 dark:ring-[#ed93af]/20 bg-white/20 shadow-[0_6px_20px_0_rgba(31,38,135,0.1)]"
                                : "border-white/30 dark:border-white/15 hover:border-white/50 hover:scale-[1.01]"
                            }`}
                            id={`interest-option-${interest.id}`}
                          >
                            <div className="flex justify-between items-center">
                              <div className={`p-1.5 rounded-full ${isSelected ? "bg-[#240046] text-white dark:bg-[#ed93af] dark:text-[#240046]" : "bg-white/30 dark:bg-white/10 text-[#240046] dark:text-white/70"}`}>
                                <span className="material-symbols-outlined text-[16px] block">{interest.icon}</span>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#240046] dark:text-[#ed93af]" />}
                            </div>

                            <div>
                              <h3 className="font-normal text-xs text-[#240046] dark:text-[#e2e8f0]">{interest.name}</h3>
                              <p className="text-[10px] text-[#240046]/60 dark:text-white/50 mt-0.5 font-light leading-relaxed">
                                {interest.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* STEP 5: ENERGY PALETTE PICKER */}
            {currentStep === 5 && (
              <div className="flex flex-col gap-4 animate-fade-in">
                <div>
                  <span className="font-mono text-[9px] tracking-[0.1em] text-[#240046]/60 font-bold uppercase block mb-0.5">
                    ⚡ Paso 5 / Ritmo & mood
                  </span>
                  <h2 className="font-display font-light text-2xl sm:text-3xl text-[#240046] tracking-tight leading-tight">
                    ¿Cuál será tu nivel de energía?
                  </h2>
                  <p className="text-xs font-light text-[#240046]/80 mt-1 leading-relaxed">
                    Desliza para elegir con qué intensidad quieres vivir el destino.
                  </p>
                </div>

                <EnergyPalettePicker
                  value={config.pace}
                  onChange={(pace) => setConfig((prev) => ({ ...prev, pace }))}
                />
              </div>
            )}

          </div>

          {/* Wizard Navigation Footer */}
          <div className="flex justify-end items-center mt-4 pt-3.5 border-t border-[#240046]/10">
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={`px-5 py-2.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase flex items-center gap-2 transition-all shadow-md ${
                !canContinue
                  ? "opacity-35 cursor-not-allowed bg-slate-400 text-slate-200 dark:bg-white/20 dark:text-white/40"
                  : "bg-[#240046] text-white border border-transparent hover:bg-[#240046]/90 dark:bg-[#ed93af] dark:text-[#240046] dark:hover:bg-[#f3a8c0] hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              }`}
              id="wizard-next-button"
            >
              {currentStep === 5
                ? updatingExisting
                  ? "Actualizar con IA"
                  : "Generar Propuestas con IA"
                : "Continuar"}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Error message block */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-800 p-4 rounded-[1rem] flex gap-3 items-center mt-4 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-rose-700 shrink-0" />
              <div className="text-xs flex-1 leading-normal font-light">
                <strong>Oops 🙈</strong> {error}
              </div>
              <button 
                onClick={generateItinerary}
                className="px-3 py-1 bg-rose-700 text-white rounded-full text-[10px] font-mono uppercase tracking-wider hover:bg-rose-800 transition-colors"
              >
                Reintentar
              </button>
            </div>
          )}

        </div>
      </section>

    </div>
  );
}

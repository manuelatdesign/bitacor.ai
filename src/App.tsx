import { useState, useEffect } from "react";
import { FlaskConical } from "lucide-react";
import BackgroundMesh from "./components/BackgroundMesh";
import Header, { type AppTab } from "./components/Header";
import WizardView from "./components/WizardView";
import ResultView from "./components/ResultView";
import TripView from "./components/TripView";
import SavedItinerariesView from "./components/SavedItinerariesView";
import FriendsFeedView from "./components/FriendsFeedView";
import { TravelConfig, StepId, GeneratedItinerary, type ProposalSource } from "./types";
import { generateMockProposals } from "./data";
import { resolveEnergyProfile } from "./components/EnergyPalettePicker";
import { apiUrl } from "./lib/apiBase";

function emptyConfig(): TravelConfig {
  return {
    destination: "",
    days: 0,
    budget: "",
    interests: [],
    pace: "",
    lodging: "",
  };
}

function restoreConfigFromItinerary(itinerary: GeneratedItinerary): TravelConfig {
  if (itinerary.travelConfig && typeof itinerary.travelConfig === "object") {
    return {
      destination: itinerary.travelConfig.destination || itinerary.destinationTitle || "",
      days:
        typeof itinerary.travelConfig.days === "number" && itinerary.travelConfig.days > 0
          ? itinerary.travelConfig.days
          : itinerary.itinerary?.length || 0,
      budget: itinerary.travelConfig.budget || "",
      interests: Array.isArray(itinerary.travelConfig.interests)
        ? itinerary.travelConfig.interests
        : [],
      pace: itinerary.travelConfig.pace || "",
      arrivalDate: itinerary.travelConfig.arrivalDate,
      arrivalTime: itinerary.travelConfig.arrivalTime,
      departureDate: itinerary.travelConfig.departureDate,
      departureTime: itinerary.travelConfig.departureTime,
      lodging: itinerary.travelConfig.lodging || "",
    };
  }
  return {
    destination: itinerary.destinationTitle || "",
    days: itinerary.itinerary?.length || 0,
    budget: "",
    interests: [],
    pace: "",
  };
}

function ensureId(it: GeneratedItinerary): string {
  if (it.id) return it.id;
  return `it-${it.savedAt || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme");
      if (saved) {
        return saved === "dark";
      }
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const [activeTab, setActiveTab] = useState<AppTab>("planner");
  const [config, setConfig] = useState<TravelConfig>(emptyConfig);
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [customDest, setCustomDest] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<GeneratedItinerary[]>([]);
  const [proposalSource, setProposalSource] = useState<ProposalSource>(null);
  /** draft = just generated; saved = opened from Guardados */
  const [resultMode, setResultMode] = useState<"draft" | "saved" | null>(null);
  const [viewingSavedId, setViewingSavedId] = useState<string | null>(null);
  /** When regenerating an existing saved bitácora */
  const [updatingSavedId, setUpdatingSavedId] = useState<string | null>(null);

  const [savedItinerariesList, setSavedItinerariesList] = useState<GeneratedItinerary[]>(() => {
    try {
      const saved = localStorage.getItem("bitacor_saved_itineraries");
      const list: GeneratedItinerary[] = saved ? JSON.parse(saved) : [];
      return list.map((it) => ({ ...it, id: ensureId(it) }));
    } catch {
      return [];
    }
  });

  const persistSaved = (list: GeneratedItinerary[]) => {
    setSavedItinerariesList(list);
    localStorage.setItem("bitacor_saved_itineraries", JSON.stringify(list));
  };

  const generateItinerary = async (opts?: { regenerate?: boolean }) => {
    if (!config.destination.trim()) {
      setError("Por favor, selecciona o ingresa un destino para continuar.");
      setCurrentStep(1);
      return;
    }

    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    // Align with Vercel Hobby maxDuration (60s) + small buffer; avoid waiting 2 min after gateway cut.
    const timeout = setTimeout(() => controller.abort(), 70_000);

    try {
      const res = await fetch(apiUrl("/api/generate-proposals"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...config, regenerate: opts?.regenerate === true }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 504 || res.status === 408) {
          throw new Error("GATEWAY_TIMEOUT");
        }
        throw new Error(
          typeof data.error === "string" ? data.error : `HTTP ${res.status}`
        );
      }

      const list = Array.isArray(data.proposals) ? data.proposals : [];
      if (list.length < 2) {
        throw new Error("La API no devolvió 2 propuestas.");
      }
      const { enrichProposalCategories } = await import("./lib/activityCategories");
      setProposals(enrichProposalCategories(list.slice(0, 2)));
      setProposalSource(data.meta?.cached ? "ai-cached" : "ai");
      setResultMode("draft");
      setActiveTab("planner");
    } catch (err: any) {
      console.warn("generate-proposals falló:", err);
      const raw = String(err?.message || "");
      const isTimeout =
        err?.name === "AbortError" ||
        raw === "GATEWAY_TIMEOUT" ||
        /HTTP 504|timeout|Gateway Time-out/i.test(raw);
      const msg = isTimeout
        ? "La IA tardó demasiado. Prueba de nuevo; a veces el segundo intento es más rápido."
        : raw || "Error al generar";

      if (import.meta.env.DEV) {
        console.warn("DEV: usando mock de respaldo");
        try {
          const generated = generateMockProposals(config);
          const { enrichProposalCategories } = await import("./lib/activityCategories");
          setProposals(enrichProposalCategories(generated));
          setProposalSource("mock");
          setResultMode("draft");
          setActiveTab("planner");
          setError(`Modo dev: IA falló (${msg}). Mostrando plan mock.`);
          return;
        } catch (mockErr: any) {
          console.error(mockErr);
        }
      }

      setProposalSource(null);
      setError(`No pudimos generar con IA: ${msg} ¿Lo intentamos de nuevo?`);
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  const handleSaveItinerary = (itinerary: GeneratedItinerary) => {
    const id = updatingSavedId || itinerary.id || ensureId(itinerary);
    const freshSave: GeneratedItinerary = {
      ...itinerary,
      id,
      travelConfig: { ...config },
      savedAt: new Date().toISOString(),
    };

    const filtered = savedItinerariesList.filter((item) => ensureId(item) !== id);
    // Also drop same destination+type duplicates when creating new
    const withoutDupes = updatingSavedId
      ? filtered
      : filtered.filter(
          (item) =>
            !(
              item.destinationTitle === itinerary.destinationTitle &&
              item.proposalType === itinerary.proposalType
            )
        );
    persistSaved([freshSave, ...withoutDupes]);
    setUpdatingSavedId(null);
    setViewingSavedId(id);
    setResultMode("saved");
    setActiveTab("saved");
    setProposals([freshSave]);
  };

  const openSavedItinerary = (itinerary: GeneratedItinerary) => {
    const id = ensureId(itinerary);
    const withId = { ...itinerary, id };
    const restored = restoreConfigFromItinerary(withId);
    setConfig(restored);
    setCustomDest(restored.destination);
    setProposals([withId]);
    setResultMode("saved");
    setViewingSavedId(id);
    setUpdatingSavedId(null);
    setError(null);
    setActiveTab("saved");
  };

  const deleteSavedItinerary = (itinerary: GeneratedItinerary) => {
    const id = ensureId(itinerary);
    const next = savedItinerariesList.filter((item) => ensureId(item) !== id);
    persistSaved(next);
    if (viewingSavedId === id) {
      setViewingSavedId(null);
      setProposals([]);
      setResultMode(null);
    }
  };

  const startNewBitacora = () => {
    setActiveTab("planner");
    setConfig(emptyConfig());
    setCustomDest("");
    setCurrentStep(1);
    setProposals([]);
    setProposalSource(null);
    setResultMode(null);
    setUpdatingSavedId(null);
    setError(null);
  };

  const editPreferencesFromSaved = () => {
    if (!viewingSavedId) return;
    setUpdatingSavedId(viewingSavedId);
    setProposals([]);
    setResultMode(null);
    setCurrentStep(1);
    setError(null);
    setActiveTab("planner");
    // config already loaded from openSavedItinerary
  };

  const handleTabChange = (tab: AppTab) => {
    if (tab === "planner") {
      startNewBitacora();
      return;
    }
    if (tab === "saved") {
      setViewingSavedId(null);
      setProposals([]);
      setResultMode(null);
      setActiveTab("saved");
      return;
    }
    setActiveTab(tab);
  };

  const fillQaSample = () => {
    // Fixed QA trip: Bucaramanga · 24–27 Jul · explorador
    const arrivalDate = "2026-07-24";
    const departureDate = "2026-07-27";
    const days = 4;

    const qaConfig: TravelConfig = {
      destination: "Bucaramanga, Santander, Colombia",
      days,
      budget: "Nómada / Estándar",
      interests: [
        "Cañón y naturaleza",
        "Pueblos coloniales",
        "Comida santandereana",
      ],
      pace: resolveEnergyProfile(100).pace,
      arrivalDate,
      arrivalTime: "10:00",
      departureDate,
      departureTime: "18:00",
      lodging: "",
    };

    startNewBitacora();
    setCustomDest(qaConfig.destination);
    setConfig(qaConfig);
    setCurrentStep(5);
  };

  const showDraftResult = activeTab === "planner" && resultMode === "draft" && proposals.length > 0;
  const showSavedResult = activeTab === "saved" && resultMode === "saved" && proposals.length > 0;

  return (
    <div className="min-h-screen flex flex-col relative font-sans text-[#240046] dark:text-[#e2e8f0] overflow-x-hidden selection:bg-[#240046]/10 dark:selection:bg-white/10 transition-colors duration-300">
      <BackgroundMesh isDarkMode={isDarkMode} />

      <Header
        onNew={startNewBitacora}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        savedCount={savedItinerariesList.length}
      />

      <main className="flex-1 max-w-[1280px] w-full mx-auto px-6 lg:px-16 py-3 md:py-5 flex flex-col gap-4 relative z-10">
        {activeTab === "trip" ? (
          <TripView
            savedItinerariesList={savedItinerariesList}
            onBackToPlanner={startNewBitacora}
            isDarkMode={isDarkMode}
          />
        ) : activeTab === "friends" ? (
          <FriendsFeedView />
        ) : activeTab === "saved" ? (
          showSavedResult ? (
            <ResultView
              proposals={proposals}
              config={config}
              setConfig={setConfig}
              mode="saved"
              onDelete={() => {
                const current = proposals[0];
                if (current) deleteSavedItinerary(current);
              }}
              onEditPreferences={editPreferencesFromSaved}
              onBackToList={() => {
                setViewingSavedId(null);
                setProposals([]);
                setResultMode(null);
              }}
            />
          ) : (
            <SavedItinerariesView
              items={savedItinerariesList}
              onOpen={openSavedItinerary}
              onDelete={deleteSavedItinerary}
              onStartNew={startNewBitacora}
            />
          )
        ) : showDraftResult ? (
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 z-50 overflow-hidden rounded-[2rem] border border-white/45 dark:border-white/10 shadow-2xl animate-fade-in min-h-[320px] flex items-center justify-center text-center p-8">
                <div className="absolute inset-0 bg-white/40 dark:bg-[#0f172a]/55 backdrop-blur-[28px]" />
                <div className="relative z-10 max-w-md">
                  <p className="font-display font-extralight text-2xl sm:text-3xl text-[#240046] dark:text-[#e2e8f0] tracking-tight leading-snug">
                    Generando otra tanda con IA para {config.destination || "tu viaje"}… ✨
                  </p>
                  <p className="mt-2 text-xs text-[#240046]/60 dark:text-white/50">
                    Puede tardar hasta 1 minuto
                  </p>
                </div>
              </div>
            )}
            <ResultView
              proposals={proposals}
              config={config}
              setConfig={setConfig}
              mode="draft"
              updatingExisting={!!updatingSavedId}
              proposalSource={proposalSource}
              isRegenerating={isLoading}
              onRegenerate={() => generateItinerary({ regenerate: true })}
              resetAll={startNewBitacora}
              onSaveItinerary={handleSaveItinerary}
            />
          </div>
        ) : (
          <div className="relative">
            {isLoading && (
              <div className="absolute inset-0 z-50 overflow-hidden rounded-[2rem] border border-white/45 dark:border-white/10 shadow-2xl animate-fade-in min-h-[500px] flex items-center justify-center text-center p-8">
                <div className="absolute inset-0 bg-white/40 dark:bg-[#0f172a]/55 backdrop-blur-[28px]" />
                <div className="absolute -top-16 -left-10 w-72 h-72 rounded-full bg-[#240046]/25 dark:bg-indigo-500/25 blur-3xl animate-float-1" />
                <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-[#ed93af]/45 dark:bg-rose-400/25 blur-3xl animate-float-2" />
                <div className="absolute -bottom-24 left-1/4 w-96 h-64 rounded-full bg-teal-400/30 dark:bg-teal-500/20 blur-3xl animate-float-3" />
                <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_40%,rgba(255,255,255,0.35)_50%,transparent_60%)] dark:bg-[linear-gradient(120deg,transparent_40%,rgba(255,255,255,0.06)_50%,transparent_60%)] animate-loader-sheen" />

                <div className="relative z-10 max-w-md">
                  <p className="font-display font-extralight text-2xl sm:text-3xl text-[#240046] dark:text-[#e2e8f0] tracking-tight leading-snug">
                    {updatingSavedId
                      ? `Actualizando bitácora para ${config.destination || "tu viaje"}…`
                      : `Armando 2 planes para ${config.destination || "tu viaje"}… ✨`}
                  </p>
                </div>
              </div>
            )}

            <WizardView
              config={config}
              setConfig={setConfig}
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              customDest={customDest}
              setCustomDest={setCustomDest}
              isLoading={isLoading}
              generateItinerary={generateItinerary}
              error={error}
              updatingExisting={!!updatingSavedId}
            />
          </div>
        )}
      </main>

      {import.meta.env.DEV && activeTab === "planner" && !showDraftResult && (
        <button
          type="button"
          onClick={fillQaSample}
          title="QA: prellenar wizard con datos de ejemplo"
          className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 px-4 py-3 rounded-full bg-[#240046] text-white text-[11px] font-mono font-bold uppercase tracking-wider shadow-lg border border-white/20 hover:scale-[1.03] active:scale-[0.98] transition-transform cursor-pointer"
        >
          <FlaskConical className="w-4 h-4" />
          QA Fill
        </button>
      )}
    </div>
  );
}

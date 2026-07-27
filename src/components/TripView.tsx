import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  MapPin,
  Sparkles,
  Image as ImageIcon,
  X,
  Trash2,
  Images,
  Compass,
  FlaskConical,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { GeneratedItinerary } from "../types";
import { formatTripTitle } from "../lib/destinationFlag";
import TripMap from "./trip/TripMap";
import CaptureModal from "./trip/CaptureModal";
import TripSummaryFullscreen from "./trip/TripSummaryFullscreen";
import {
  compressToDataUrl,
  deleteTripPhoto,
  getTripKey,
  loadTripPhotos,
  saveTripPhoto,
  type TripPhoto,
} from "../lib/tripPhotos";
import {
  getCurrentPosition,
  jitterAround,
  readExifGps,
  resolveTripCenter,
  reverseGeocodeLabel,
  type LatLng,
} from "../lib/geo";
import { buildDemoTripPhotos } from "../data/tripDemoPhotos";

interface TripViewProps {
  savedItinerariesList: GeneratedItinerary[];
  onBackToPlanner: () => void;
  isDarkMode: boolean;
}

export default function TripView({
  savedItinerariesList,
  onBackToPlanner,
  isDarkMode,
}: TripViewProps) {
  const [activeItinerary, setActiveItinerary] = useState<GeneratedItinerary | null>(
    () => (savedItinerariesList.length > 0 ? savedItinerariesList[0] : null)
  );
  const [photos, setPhotos] = useState<TripPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [center, setCenter] = useState<LatLng>({ lat: 6.2476, lng: -75.5658 });
  const [captureOpen, setCaptureOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [inspectedPhoto, setInspectedPhoto] = useState<TripPhoto | null>(null);
  const [isFrontLarge, setIsFrontLarge] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [summaryOutput, setSummaryOutput] = useState<{
    text: string;
    highlights: string[];
    stats: { name: string; val: string }[];
  } | null>(null);
  const [userNote, setUserNote] = useState("");
  const [demoLoading, setDemoLoading] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const hasDemoPhotos = photos.some((p) => p.source === "demo");

  // Keep "último viaje" in sync when saves change
  useEffect(() => {
    if (savedItinerariesList.length === 0) {
      setActiveItinerary(null);
      return;
    }
    setActiveItinerary((prev) => {
      if (!prev) return savedItinerariesList[0];
      const stillThere = savedItinerariesList.find(
        (it) =>
          it.destinationTitle === prev.destinationTitle &&
          it.proposalType === prev.proposalType &&
          it.savedAt === prev.savedAt
      );
      return stillThere || savedItinerariesList[0];
    });
  }, [savedItinerariesList]);

  // Load center + persisted photos for active trip
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSummaryOutput(null);
      setSummaryOpen(false);
      const nextCenter = await resolveTripCenter(activeItinerary);
      if (!cancelled) setCenter(nextCenter);

      if (!activeItinerary) {
        if (!cancelled) setPhotos([]);
        return;
      }

      setPhotosLoading(true);
      try {
        const loaded = await loadTripPhotos(getTripKey(activeItinerary));
        if (!cancelled) setPhotos(loaded);
      } catch {
        if (!cancelled) setPhotos([]);
      } finally {
        if (!cancelled) setPhotosLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeItinerary]);

  const persistPhoto = useCallback(async (photo: TripPhoto) => {
    setPhotos((prev) => [photo, ...prev]);
    try {
      await saveTripPhoto(photo);
    } catch (err) {
      console.error("No se pudo guardar la foto", err);
    }
  }, []);

  const buildPhotoCoords = useCallback(
    async (preferred: LatLng | null, index: number) => {
      if (preferred) return preferred;
      const live = await getCurrentPosition();
      if (live) return live;
      return jitterAround(center, index);
    },
    [center]
  );

  const handleCameraCaptured = async (payload: {
    backImage: string;
    frontImage?: string;
  }) => {
    if (!activeItinerary) return;
    const coords = await buildPhotoCoords(null, photos.length);
    const label = await reverseGeocodeLabel(coords);
    const now = Date.now();
    const photo: TripPhoto = {
      id: `cam-${now}`,
      tripKey: getTripKey(activeItinerary),
      backImage: payload.backImage,
      frontImage: payload.frontImage,
      lat: coords.lat,
      lng: coords.lng,
      locationName: label,
      time: new Date(now).toLocaleString("es-CO", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      note: userNote.trim(),
      source: "camera",
      createdAt: now,
    };
    setUserNote("");
    await persistPhoto(photo);
  };

  const handleGalleryImport = async (files: FileList | null) => {
    if (!files?.length || !activeItinerary) return;
    setImporting(true);
    try {
      const tripKey = getTripKey(activeItinerary);
      const live = await getCurrentPosition();
      let i = 0;
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const [backImage, exifGps] = await Promise.all([
          compressToDataUrl(file),
          readExifGps(file),
        ]);
        const coords = await buildPhotoCoords(exifGps || live, photos.length + i);
        const label = exifGps
          ? await reverseGeocodeLabel(coords)
          : live
            ? await reverseGeocodeLabel(coords)
            : `${activeItinerary.destinationTitle} · importada`;
        const createdAt = Date.now() + i;
        const photo: TripPhoto = {
          id: `gal-${createdAt}`,
          tripKey,
          backImage,
          lat: coords.lat,
          lng: coords.lng,
          locationName: label,
          time: new Date(file.lastModified || createdAt).toLocaleString("es-CO", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
          note: "",
          source: "gallery",
          createdAt,
        };
        await persistPhoto(photo);
        i += 1;
      }
    } finally {
      setImporting(false);
      if (galleryInputRef.current) galleryInputRef.current.value = "";
    }
  };

  const handleDeletePhoto = async (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    if (inspectedPhoto?.id === id) setInspectedPhoto(null);
    try {
      await deleteTripPhoto(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoadDemo = async () => {
    if (!activeItinerary || demoLoading) return;
    setDemoLoading(true);
    try {
      const tripKey = getTripKey(activeItinerary);
      // Replace previous demos only; keep camera/gallery photos
      const existingDemos = photos.filter((p) => p.source === "demo");
      for (const d of existingDemos) {
        await deleteTripPhoto(d.id);
      }
      const demos = buildDemoTripPhotos(
        tripKey,
        activeItinerary.destinationTitle,
        center
      );
      for (const photo of demos) {
        await saveTripPhoto(photo);
      }
      setPhotos((prev) => [
        ...demos,
        ...prev.filter((p) => p.source !== "demo"),
      ]);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleClearDemos = async () => {
    const demos = photos.filter((p) => p.source === "demo");
    for (const d of demos) {
      await deleteTripPhoto(d.id);
    }
    setPhotos((prev) => prev.filter((p) => p.source !== "demo"));
    if (inspectedPhoto?.source === "demo") setInspectedPhoto(null);
  };

  const handleGenerateSummary = () => {
    setIsSummaryLoading(true);
    setTimeout(() => {
      const destination = activeItinerary?.destinationTitle || "Tu viaje";
      const count = photos.length;
      const places = [...new Set(photos.map((p) => p.locationName))].slice(0, 5);
      const placesStr = places.join(", ") || "tus paradas";

      if (count === 0) {
        setSummaryOutput({
          text: `Tu bitácora en ${destination} está lista ✨ Todavía no hay fotos: usa el botón flotante para un momento BeReal o importa desde tu galería.`,
          highlights: [
            "Toma fotos con ubicación para anclarlas al mapa.",
            "Importa de la galería si ya tienen ubicación.",
            "Genera el resumen cuando tengas un par de momentos.",
          ],
          stats: [
            { name: "Fotos", val: "0" },
            { name: "Lugares", val: "0" },
            { name: "Cámara", val: "—" },
            { name: "Galería", val: "—" },
          ],
        });
      } else {
        const fromCam = photos.filter((p) => p.source === "camera").length;
        const fromGal = photos.filter((p) => p.source === "gallery").length;
        setSummaryOutput({
          text: `Resumen de ${destination}: registraste ${count} momento${count === 1 ? "" : "s"} en ${placesStr}. La bitácora mezcla captura en vivo y fotos de galería para contar el ritmo real de tu viaje.`,
          highlights: [
            `${count} foto${count === 1 ? "" : "s"} ancladas al mapa.`,
            places.length > 0 ? `Paradas destacadas: ${placesStr}.` : "Ubicaciones sync con el mapa.",
            fromCam > 0
              ? `${fromCam} capturada${fromCam === 1 ? "" : "s"} con la cámara BeReal.`
              : "Suma capturas en vivo con el botón flotante ✨",
          ],
          stats: [
            { name: "Fotos", val: String(count) },
            { name: "Lugares", val: String(places.length || count) },
            { name: "Cámara", val: String(fromCam) },
            { name: "Galería", val: String(fromGal) },
          ],
        });
      }
      setIsSummaryLoading(false);
      setSummaryOpen(true);
    }, 900);
  };

  if (!activeItinerary) {
    return (
      <div className="w-full bg-white/40 dark:bg-[#0f172a]/40 backdrop-blur-[40px] rounded-[2rem] border border-white/60 dark:border-white/10 p-8 md:p-12 shadow-xl text-center">
        <Compass className="w-10 h-10 mx-auto text-[#240046]/40 dark:text-white/30 mb-4" />
        <h2 className="font-display font-light text-2xl text-[#240046] dark:text-white tracking-tight mb-2">
          Aún no hay un viaje guardado
        </h2>
        <p className="text-sm font-sans font-light text-[#240046]/65 dark:text-white/55 max-w-md mx-auto mb-6">
          Guarda un plan desde el Planificador para verlo aquí, tomar fotos BeReal y armar el resumen ✨
        </p>
        <button
          type="button"
          onClick={onBackToPlanner}
          className="px-5 py-2.5 rounded-full bg-[#240046] text-white text-xs font-mono uppercase tracking-wider cursor-pointer"
        >
          Ir al Planificador
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white/40 dark:bg-[#0f172a]/40 backdrop-blur-[40px] rounded-[2rem] border border-white/60 dark:border-white/10 p-5 md:p-8 shadow-xl relative overflow-hidden pb-28">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b border-[#240046]/10 dark:border-white/5 pb-5">
        <div>
          <span className="font-mono text-[9px] tracking-[0.12em] text-[#240046]/50 dark:text-white/45 uppercase font-bold">
            Viaje activo
          </span>
          <h2 className="font-display font-light text-2xl text-[#240046] dark:text-white tracking-tight">
            {formatTripTitle(
              activeItinerary.travelConfig?.destination || activeItinerary.destinationTitle,
              activeItinerary.travelConfig?.arrivalDate || activeItinerary.savedAt
            )}
          </h2>
          <p className="text-xs font-sans text-[#240046]/55 dark:text-white/45 mt-0.5">
            {activeItinerary.proposalType} · {photos.length} foto{photos.length === 1 ? "" : "s"}
          </p>
        </div>

        {savedItinerariesList.length > 1 && (
          <select
            value={savedItinerariesList.findIndex(
              (it) =>
                it.destinationTitle === activeItinerary.destinationTitle &&
                it.proposalType === activeItinerary.proposalType &&
                it.savedAt === activeItinerary.savedAt
            )}
            onChange={(e) => {
              const idx = Number(e.target.value);
              if (!Number.isNaN(idx) && savedItinerariesList[idx]) {
                setActiveItinerary(savedItinerariesList[idx]);
              }
            }}
            className="bg-[#240046]/5 dark:bg-white/5 border border-[#240046]/15 dark:border-white/15 px-3 py-2 rounded-xl text-xs font-sans font-medium text-[#240046] dark:text-white outline-none cursor-pointer max-w-full"
          >
            {savedItinerariesList.map((it, idx) => (
              <option key={`${it.destinationTitle}-${it.savedAt}-${idx}`} value={idx}>
                {formatTripTitle(
                  it.travelConfig?.destination || it.destinationTitle,
                  it.travelConfig?.arrivalDate || it.savedAt
                )}{" "}
                ({it.proposalType})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
        <button
          type="button"
          onClick={handleGenerateSummary}
          disabled={isSummaryLoading}
          className="group relative flex-1 flex items-center justify-center gap-2.5 px-5 py-3.5 sm:py-4 rounded-2xl bg-[#240046] dark:bg-[#ed93af] text-white dark:text-[#240046] shadow-[0_10px_28px_rgba(36,0,70,0.28)] dark:shadow-[0_10px_28px_rgba(237,147,175,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 disabled:hover:scale-100 overflow-hidden"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
          <Sparkles className="w-5 h-5 shrink-0 relative z-10" />
          <span className="relative z-10 flex flex-col items-start text-left">
            <span className="font-display font-medium text-sm sm:text-base tracking-tight normal-case">
              {isSummaryLoading ? "Generando resumen…" : "Ver resumen IA"}
            </span>
            <span className="font-mono text-[8px] tracking-[0.12em] uppercase opacity-70">
              Recorrido con tus fotos
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={hasDemoPhotos ? handleClearDemos : handleLoadDemo}
          disabled={demoLoading}
          className="sm:self-stretch flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:px-4 rounded-2xl bg-transparent border border-[#240046]/15 dark:border-white/15 text-[#240046]/55 dark:text-white/45 text-[9px] font-mono uppercase tracking-wider cursor-pointer hover:bg-[#240046]/5 dark:hover:bg-white/5 disabled:opacity-60"
          title={hasDemoPhotos ? "Quitar fotos demo" : "Cargar fotos de ejemplo"}
        >
          <FlaskConical className="w-3.5 h-3.5" />
          {demoLoading ? "Cargando…" : hasDemoPhotos ? "Quitar demo" : "Demo"}
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {photosLoading ? (
          <div className="h-[min(62vh,560px)] min-h-[320px] rounded-[1.5rem] bg-[#240046]/5 dark:bg-white/5 animate-pulse" />
        ) : (
          <TripMap
            center={center}
            photos={photos}
            cafes={activeItinerary.recommendedCafesAndCoworks}
            onSelectPhoto={setInspectedPhoto}
            isDarkMode={isDarkMode}
          />
        )}

        {photos.length === 0 && !photosLoading && (
          <div className="text-center px-4 flex flex-col items-center gap-3">
            <p className="text-xs font-sans font-light text-[#240046]/55 dark:text-white/45">
              Usa el botón flotante para una foto BeReal o importa de tu galería. Se anclan al mapa si traen ubicación 📍
            </p>
            <button
              type="button"
              onClick={handleLoadDemo}
              disabled={demoLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-900 dark:text-amber-100 text-[10px] font-mono uppercase tracking-wider cursor-pointer disabled:opacity-60"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {demoLoading ? "Cargando demo…" : "Cargar demo"}
            </button>
          </div>
        )}

        {photos.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[9px] tracking-[0.12em] uppercase text-[#240046]/45 dark:text-white/40 font-bold">
              Línea del viaje
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setInspectedPhoto(p)}
                  className="relative shrink-0 w-20 h-24 rounded-xl overflow-hidden border border-white/50 dark:border-white/10 cursor-pointer"
                >
                  <img src={p.backImage} alt="" className="w-full h-full object-cover" />
                  {p.frontImage && (
                    <img
                      src={p.frontImage}
                      alt=""
                      className="absolute bottom-1 right-1 w-7 h-9 object-cover rounded-md border border-white shadow"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating actions + overlays outside overflow/backdrop container */}
      {createPortal(
        <>
          {!summaryOpen && (
            <div className="fixed bottom-6 right-6 z-[70] flex flex-col items-end gap-2.5 pointer-events-none">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={importing}
                className="pointer-events-auto flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-white/90 dark:bg-[#0f172a]/95 border border-[#240046]/15 dark:border-white/15 shadow-lg text-[#240046] dark:text-white text-[10px] font-mono uppercase tracking-wider cursor-pointer disabled:opacity-60"
                title="Importar de la galería"
              >
                <Images className="w-4 h-4" />
                {importing ? "Importando…" : "Galería"}
              </button>
              <button
                type="button"
                onClick={() => setCaptureOpen(true)}
                className="pointer-events-auto w-14 h-14 rounded-full bg-[#240046] dark:bg-[#ed93af] text-white dark:text-[#240046] shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                aria-label="Tomar foto BeReal"
                title="Tomar foto"
              >
                <Camera className="w-6 h-6" />
              </button>
            </div>
          )}

          <CaptureModal
            open={captureOpen}
            onClose={() => setCaptureOpen(false)}
            onCaptured={handleCameraCaptured}
          />

          <TripSummaryFullscreen
            open={summaryOpen}
            destinationTitle={formatTripTitle(
              activeItinerary.travelConfig?.destination || activeItinerary.destinationTitle,
              activeItinerary.travelConfig?.arrivalDate || activeItinerary.savedAt
            )}
            photos={photos}
            summary={summaryOutput}
            onClose={() => setSummaryOpen(false)}
          />

          <AnimatePresence>
            {inspectedPhoto && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[90] bg-[#240046]/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={() => setInspectedPhoto(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="relative w-full max-w-sm bg-[#0f172a] rounded-[1.75rem] overflow-hidden shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="relative aspect-[3/4]">
                    <img
                      src={isFrontLarge && inspectedPhoto.frontImage ? inspectedPhoto.frontImage : inspectedPhoto.backImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    {inspectedPhoto.frontImage && (
                      <button
                        type="button"
                        onClick={() => setIsFrontLarge((v) => !v)}
                        className="absolute top-3 right-3 w-20 h-28 rounded-xl overflow-hidden border-2 border-white shadow-lg cursor-pointer"
                      >
                        <img
                          src={isFrontLarge ? inspectedPhoto.backImage : inspectedPhoto.frontImage}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    )}
                  </div>
                  <div className="p-4 text-white">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#ed93af] mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{inspectedPhoto.locationName}</p>
                        <p className="text-[10px] font-mono text-white/50 mt-0.5">
                          {inspectedPhoto.time} ·{" "}
                          {inspectedPhoto.source === "camera"
                            ? "Cámara"
                            : inspectedPhoto.source === "gallery"
                              ? "Galería"
                              : "Demo"}
                        </p>
                        {inspectedPhoto.note && (
                          <p className="text-xs font-light text-white/70 mt-2 italic">
                            &ldquo;{inspectedPhoto.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setInspectedPhoto(null)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-white/10 text-xs cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cerrar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(inspectedPhoto.id)}
                        className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-rose-500/20 text-rose-200 text-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Borrar
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}

      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleGalleryImport(e.target.files)}
      />

      {/* Note field near FAB on map — compact */}
      <div className="mt-4">
        <label className="font-mono text-[8px] tracking-[0.12em] uppercase text-[#240046]/40 dark:text-white/35 font-bold">
          Nota para la próxima foto
        </label>
        <div className="flex gap-2 mt-1">
          <input
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            placeholder="Opcional…"
            className="flex-1 bg-white/40 dark:bg-white/5 border border-[#240046]/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs outline-none text-[#240046] dark:text-white"
          />
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#240046]/8 dark:bg-white/10 text-[10px] font-mono uppercase text-[#240046] dark:text-white cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            🔄 Sync
          </button>
        </div>
      </div>
    </div>
  );
}

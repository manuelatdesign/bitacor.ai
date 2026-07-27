import { useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight, MapPin, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { TripPhoto } from "../../lib/tripPhotos";

export interface TripSummaryData {
  text: string;
  highlights: string[];
  stats: { name: string; val: string }[];
}

interface TripSummaryFullscreenProps {
  open: boolean;
  destinationTitle: string;
  photos: TripPhoto[];
  summary: TripSummaryData | null;
  onClose: () => void;
}

type Scene =
  | { kind: "cover" }
  | { kind: "photo"; photo: TripPhoto; photoIndex: number }
  | { kind: "finale" };

function CollageBackdrop({ photos }: { photos: TripPhoto[] }) {
  const shots = photos.slice(0, 4);
  if (shots.length === 0) {
    return <div className="absolute inset-0 bg-gradient-to-br from-[#240046] via-[#3b1d5c] to-[#0f172a]" />;
  }
  if (shots.length === 1) {
    return (
      <img src={shots[0].backImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
    );
  }
  if (shots.length === 2) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 gap-0.5 bg-black">
        {shots.map((p) => (
          <img key={p.id} src={p.backImage} alt="" className="w-full h-full object-cover" />
        ))}
      </div>
    );
  }
  if (shots.length === 3) {
    return (
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 bg-black">
        <img src={shots[0].backImage} alt="" className="row-span-2 w-full h-full object-cover" />
        <img src={shots[1].backImage} alt="" className="w-full h-full object-cover" />
        <img src={shots[2].backImage} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5 bg-black">
      {shots.map((p) => (
        <img key={p.id} src={p.backImage} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  );
}

export default function TripSummaryFullscreen({
  open,
  destinationTitle,
  photos,
  summary,
  onClose,
}: TripSummaryFullscreenProps) {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [showFront, setShowFront] = useState(false);

  const ordered = useMemo(
    () => [...photos].sort((a, b) => a.createdAt - b.createdAt),
    [photos]
  );

  const scenes: Scene[] = useMemo(() => {
    const list: Scene[] = [{ kind: "cover" }];
    ordered.forEach((photo, photoIndex) => {
      list.push({ kind: "photo", photo, photoIndex });
    });
    if (ordered.length > 0) list.push({ kind: "finale" });
    return list;
  }, [ordered]);

  const scene = scenes[Math.min(sceneIdx, scenes.length - 1)];
  const total = scenes.length;

  useEffect(() => {
    if (open) {
      setSceneIdx(0);
      setShowFront(false);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setSceneIdx((i) => Math.min(i + 1, total - 1));
      if (e.key === "ArrowLeft") setSceneIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, total, onClose]);

  if (!open || !summary) return null;

  const goPrev = () => {
    setSceneIdx((i) => Math.max(i - 1, 0));
    setShowFront(false);
  };
  const goNext = () => {
    setSceneIdx((i) => Math.min(i + 1, total - 1));
    setShowFront(false);
  };

  const highlightForPhoto =
    scene.kind === "photo"
      ? summary.highlights[scene.photoIndex % Math.max(summary.highlights.length, 1)]
      : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black text-white overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Resumen del viaje"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`scene-${sceneIdx}-${scene.kind}`}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0"
          >
            {/* ===== COVER: collage + typography on images ===== */}
            {scene.kind === "cover" && (
              <>
                <CollageBackdrop photos={ordered} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/30" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_20%,rgba(0,0,0,0.55)_100%)]" />

                <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-1.5 font-mono text-[9px] tracking-[0.16em] uppercase text-[#ed93af] font-bold mb-3">
                      <Sparkles className="w-3.5 h-3.5" />
                      Resumen IA · Portada
                    </div>
                    <h2 className="font-display font-extralight text-4xl sm:text-5xl md:text-6xl tracking-tight leading-[0.95] drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
                      {destinationTitle}
                    </h2>
                    <p className="mt-4 text-sm sm:text-base font-sans font-light leading-relaxed text-white/90 max-w-md drop-shadow-md">
                      {summary.text}
                    </p>

                    {ordered.length > 0 && (
                      <div className="mt-5 flex -space-x-3">
                        {ordered.slice(0, 5).map((p, i) => (
                          <img
                            key={p.id}
                            src={p.backImage}
                            alt=""
                            className="w-11 h-11 rounded-full object-cover border-2 border-white/80 shadow-lg"
                            style={{ zIndex: 5 - i }}
                          />
                        ))}
                        {ordered.length > 5 && (
                          <div className="w-11 h-11 rounded-full bg-white/20 border-2 border-white/60 backdrop-blur flex items-center justify-center text-[10px] font-mono font-bold">
                            +{ordered.length - 5}
                          </div>
                        )}
                      </div>
                    )}

                    <p className="mt-6 font-mono text-[9px] tracking-[0.14em] uppercase text-white/45">
                      Desliza para recorrer {ordered.length || 0} momento{ordered.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* ===== PHOTO: info painted on the image ===== */}
            {scene.kind === "photo" && (
              <>
                <img
                  src={
                    showFront && scene.photo.frontImage
                      ? scene.photo.frontImage
                      : scene.photo.backImage
                  }
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40" />

                {/* Polaroid stack of neighbors */}
                <div className="absolute top-24 left-4 z-10 hidden sm:flex flex-col gap-2 opacity-80">
                  {ordered
                    .filter((_, i) => i !== scene.photoIndex)
                    .slice(0, 2)
                    .map((p, i) => (
                      <img
                        key={p.id}
                        src={p.backImage}
                        alt=""
                        className="w-16 h-20 object-cover rounded-lg border border-white/40 shadow-xl"
                        style={{ transform: `rotate(${i === 0 ? -6 : 5}deg)` }}
                      />
                    ))}
                </div>

                {scene.photo.frontImage && (
                  <button
                    type="button"
                    onClick={() => setShowFront((v) => !v)}
                    className="absolute top-24 right-4 z-20 w-[72px] h-[96px] rounded-2xl overflow-hidden border-2 border-white shadow-xl cursor-pointer active:scale-95"
                  >
                    <img
                      src={showFront ? scene.photo.backImage : scene.photo.frontImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                )}

                <div className="absolute bottom-0 inset-x-0 p-5 sm:p-8 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  <div className="max-w-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/35 backdrop-blur-md border border-white/20 mb-3">
                      <MapPin className="w-3.5 h-3.5 text-[#ed93af]" />
                      <span className="text-xs font-medium">{scene.photo.locationName}</span>
                      <span className="text-[9px] font-mono text-white/50">
                        {scene.photoIndex + 1}/{ordered.length}
                      </span>
                    </div>

                    {scene.photo.note && (
                      <p className="font-display font-light text-2xl sm:text-3xl tracking-tight leading-snug text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] mb-3">
                        “{scene.photo.note}”
                      </p>
                    )}

                    <p className="text-[10px] font-mono text-white/55 mb-4">{scene.photo.time}</p>

                    {highlightForPhoto && (
                      <p className="text-sm font-sans font-light text-white/85 leading-relaxed border-l-2 border-teal-400/80 pl-3">
                        {highlightForPhoto}
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ===== FINALE: mosaic + stats overlaid ===== */}
            {scene.kind === "finale" && (
              <>
                <CollageBackdrop photos={ordered} />
                <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

                <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-8 pt-[max(5rem,env(safe-area-inset-top)+4rem)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                  <div>
                    <p className="font-mono text-[9px] tracking-[0.16em] uppercase text-teal-300 font-bold mb-2">
                      Cierre del viaje
                    </p>
                    <h3 className="font-display font-extralight text-3xl sm:text-4xl tracking-tight">
                      Tu bitácora en números
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md">
                    {summary.stats.map((stat, i) => (
                      <motion.div
                        key={stat.name}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 * i }}
                        className="relative overflow-hidden rounded-2xl border border-white/20 min-h-[110px] sm:min-h-[130px]"
                      >
                        {ordered[i % ordered.length] && (
                          <img
                            src={ordered[i % ordered.length].backImage}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover scale-110"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/55" />
                        <div className="relative z-10 h-full flex flex-col justify-end p-4">
                          <div className="font-display font-light text-4xl sm:text-5xl tracking-tight leading-none">
                            {stat.val}
                          </div>
                          <div className="font-mono text-[8px] uppercase tracking-[0.14em] text-white/65 mt-1.5">
                            {stat.name}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {summary.highlights[0] && (
                    <p className="max-w-md text-sm font-light text-white/80 leading-relaxed mt-4">
                      {summary.highlights[0]}
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Chrome: top bar + progress */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] pointer-events-none">
          <div className="min-w-0 pointer-events-none opacity-0 sm:opacity-100">
            {/* spacer for balance with close btn on mobile */}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto shrink-0 p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/20 cursor-pointer active:scale-95"
            aria-label="Cerrar resumen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute top-[max(0.75rem,env(safe-area-inset-top))] inset-x-14 sm:inset-x-16 z-30 flex gap-1 pointer-events-auto">
          {scenes.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setSceneIdx(i);
                setShowFront(false);
              }}
              className={`h-0.5 flex-1 rounded-full transition-all cursor-pointer ${
                i === sceneIdx ? "bg-white" : i < sceneIdx ? "bg-white/55" : "bg-white/25"
              }`}
              aria-label={`Escena ${i + 1}`}
            />
          ))}
        </div>

        {/* Nav */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              disabled={sceneIdx === 0}
              className="absolute left-0 top-20 bottom-0 w-[28%] z-20 cursor-pointer disabled:cursor-default"
              aria-label="Anterior"
            />
            <button
              type="button"
              onClick={goNext}
              disabled={sceneIdx === total - 1}
              className="absolute right-0 top-20 bottom-0 w-[28%] z-20 cursor-pointer disabled:cursor-default"
              aria-label="Siguiente"
            />
            <button
              type="button"
              onClick={goPrev}
              disabled={sceneIdx === 0}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/35 border border-white/20 disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={sceneIdx === total - 1}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/35 border border-white/20 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

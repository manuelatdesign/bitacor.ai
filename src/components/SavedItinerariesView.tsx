import { Bookmark, Calendar, MapPin, Trash2, ChevronRight } from "lucide-react";
import type { GeneratedItinerary } from "../types";
import { formatTripTitle } from "../lib/destinationFlag";

interface SavedItinerariesViewProps {
  items: GeneratedItinerary[];
  onOpen: (itinerary: GeneratedItinerary) => void;
  onDelete: (itinerary: GeneratedItinerary) => void;
  onStartNew: () => void;
}

function itemKey(it: GeneratedItinerary, idx: number): string {
  return it.id || `${it.savedAt || "x"}-${it.proposalType}-${idx}`;
}

export default function SavedItinerariesView({
  items,
  onOpen,
  onDelete,
  onStartNew,
}: SavedItinerariesViewProps) {
  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in text-[#240046] dark:text-[#e2e8f0] relative z-10 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <span className="font-mono text-[9px] tracking-[0.12em] text-[#240046]/50 dark:text-white/40 uppercase font-bold">
            Tus viajes 📓
          </span>
          <h1 className="font-display font-extralight text-3xl sm:text-4xl tracking-tight mt-0.5">
            Guardados
          </h1>
          <p className="text-xs font-light text-[#240046]/65 dark:text-white/50 mt-1">
            {items.length === 0
              ? "Aún no tienes bitácoras. Crea una desde el planificador."
              : `${items.length} bitácora${items.length === 1 ? "" : "s"} guardada${items.length === 1 ? "" : "s"}.`}
          </p>
        </div>
        <button
          type="button"
          onClick={onStartNew}
          className="self-start sm:self-auto px-4 py-2.5 rounded-full bg-[#240046] text-white dark:bg-[#ed93af] dark:text-[#240046] text-[10px] font-mono uppercase tracking-wider font-bold cursor-pointer"
        >
          Nueva bitácora
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[#240046]/20 dark:border-white/15 bg-white/10 px-6 py-16 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#240046]/8 dark:bg-white/10 flex items-center justify-center">
            <Bookmark className="w-5 h-5 text-[#240046]/50 dark:text-white/45" />
          </div>
          <p className="text-sm font-light text-[#240046]/70 dark:text-white/55 max-w-sm">
            Genera un itinerario en el planificador y pulsa Guardar para verlo aquí.
          </p>
          <button
            type="button"
            onClick={onStartNew}
            className="mt-2 px-5 py-2.5 rounded-full border border-[#240046]/20 dark:border-white/20 text-[10px] font-mono uppercase tracking-wider cursor-pointer hover:bg-white/20"
          >
            Ir al planificador
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item, idx) => {
            const title = formatTripTitle(
              item.travelConfig?.destination || item.destinationTitle,
              item.travelConfig?.arrivalDate || item.savedAt
            );
            const days = item.itinerary?.length || item.travelConfig?.days || 0;
            const savedLabel = item.savedAt
              ? new Date(item.savedAt).toLocaleDateString("es", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : null;

            return (
              <article
                key={itemKey(item, idx)}
                className="group relative bg-white/15 hover:bg-white/25 backdrop-blur-[24px] border border-white/30 rounded-[1.5rem] p-5 flex flex-col gap-3 shadow-sm transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider bg-[#240046]/10 dark:bg-white/10 text-[#240046]/70 dark:text-white/60 border border-[#240046]/10 dark:border-white/15">
                    {item.proposalType}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item);
                    }}
                    className="p-1.5 rounded-lg text-[#240046]/40 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer opacity-70 group-hover:opacity-100"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onOpen(item)}
                  className="text-left flex flex-col gap-2 flex-1 cursor-pointer"
                >
                  <h2 className="font-display font-light text-xl tracking-tight leading-snug text-[#240046] dark:text-[#e2e8f0] group-hover:text-[#240046] dark:group-hover:text-white">
                    {title}
                  </h2>
                  {item.shortDescription && (
                    <p className="text-[11px] font-light text-[#240046]/60 dark:text-white/50 line-clamp-2 leading-relaxed">
                      {item.shortDescription}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-auto pt-2 text-[10px] font-mono uppercase tracking-wider text-[#240046]/45 dark:text-white/40">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {days} día{days === 1 ? "" : "s"}
                    </span>
                    {item.travelConfig?.destination && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
                        <MapPin className="w-3 h-3 shrink-0" />
                        {item.travelConfig.destination.split(",")[0]}
                      </span>
                    )}
                    {savedLabel && <span className="truncate">Guardado {savedLabel}</span>}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-[#240046]/70 dark:text-[#ed93af] font-bold mt-1">
                    Abrir <ChevronRight className="w-3 h-3" />
                  </span>
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

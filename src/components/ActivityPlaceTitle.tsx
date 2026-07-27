import { useId, useState } from "react";
import { AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import { ExternalLink, MapPin } from "lucide-react";
import type { ResolvedActivityPlace } from "../lib/activityPlace";
import GoogleMapShell from "./GoogleMapShell";

interface ActivityPlaceTitleProps {
  title: string;
  place: ResolvedActivityPlace;
  isDarkMode: boolean;
}

export default function ActivityPlaceTitle({
  title,
  place,
  isDarkMode,
}: ActivityPlaceTitleProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const hasCoords = typeof place.lat === "number" && typeof place.lng === "number";

  return (
    <div
      className="relative inline-block max-w-full pr-28"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <a
        href={place.mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-describedby={open ? panelId : undefined}
        className="group/place inline-flex items-center gap-1.5 font-normal text-sm sm:text-[15px] text-[#240046] dark:text-[#e2e8f0] leading-snug underline decoration-[#240046]/25 dark:decoration-[#ed93af]/35 underline-offset-2 hover:decoration-[#240046] dark:hover:decoration-[#ed93af] transition-colors"
      >
        <span>{title}</span>
        <MapPin className="w-3.5 h-3.5 shrink-0 opacity-40 group-hover/place:opacity-80 text-[#240046] dark:text-[#ed93af] transition-opacity" />
      </a>

      {open && (
        <div
          id={panelId}
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-1.5 w-[220px] sm:w-[240px] rounded-xl border border-white/50 dark:border-white/15 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg overflow-hidden animate-fade-in"
        >
          {hasCoords ? (
            <GoogleMapShell
              className="h-[120px] w-full relative"
              isDarkMode={isDarkMode}
              defaultCenter={{ lat: place.lat!, lng: place.lng! }}
              defaultZoom={15}
              gestureHandling="none"
              disableDefaultUI
              fallbackHref={place.mapsUrl}
              fallbackTitle="Vista previa"
              fallbackSubtitle="Abre en Google Maps"
            >
              <AdvancedMarker position={{ lat: place.lat!, lng: place.lng! }}>
                <Pin
                  background="#ed93af"
                  borderColor="#ffffff"
                  glyphColor="#ffffff"
                  scale={0.85}
                />
              </AdvancedMarker>
            </GoogleMapShell>
          ) : (
            <div className="h-[72px] flex items-center justify-center gap-2 bg-[#240046]/5 dark:bg-white/5 px-3">
              <MapPin className="w-4 h-4 text-[#240046]/50 dark:text-white/45" />
              <span className="text-[10px] font-light text-[#240046]/60 dark:text-white/50">
                Ver ubicación en Maps
              </span>
            </div>
          )}
          <a
            href={place.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-[#240046] dark:text-[#e2e8f0] hover:bg-[#240046]/5 dark:hover:bg-white/5 border-t border-[#240046]/8 dark:border-white/10"
          >
            <span className="truncate">{place.label}</span>
            <ExternalLink className="w-3 h-3 shrink-0 opacity-60" />
          </a>
        </div>
      )}
    </div>
  );
}

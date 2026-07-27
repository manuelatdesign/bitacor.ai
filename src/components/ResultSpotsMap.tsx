import { useMemo, useState } from "react";
import { AdvancedMarker, InfoWindow, Pin } from "@vis.gl/react-google-maps";
import type { CafeOrCowork } from "../types";
import type { LatLng } from "../lib/geo";
import { googleMapsLatLngUrl, toGoogleMapsUrl } from "../lib/googleMaps";
import GoogleMapShell, { FitBounds, MapsKeyFallback } from "./GoogleMapShell";

interface ResultSpotsMapProps {
  spots: CafeOrCowork[];
  center: LatLng;
  isDarkMode: boolean;
}

export default function ResultSpotsMap({ spots, center, isDarkMode }: ResultSpotsMapProps) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const pins = useMemo(
    () =>
      spots.filter(
        (s): s is CafeOrCowork & { lat: number; lng: number } =>
          typeof s.lat === "number" && typeof s.lng === "number"
      ),
    [spots]
  );

  if (pins.length === 0) {
    return (
      <MapsKeyFallback
        className="w-full h-[220px] sm:h-[260px] rounded-[1.5rem]"
        title="Sin ubicación en el mapa aún"
        subtitle="Cuando los spots traigan coords, aquí verás los pines en Google Maps."
        href={googleMapsLatLngUrl(center.lat, center.lng)}
      />
    );
  }

  const active = activeIdx != null ? pins[activeIdx] : null;

  return (
    <GoogleMapShell
      className="relative w-full h-[220px] sm:h-[280px] rounded-[1.5rem] overflow-hidden border border-white/50 dark:border-white/10 shadow-inner"
      isDarkMode={isDarkMode}
      defaultCenter={center}
      defaultZoom={13}
      fallbackHref={toGoogleMapsUrl(undefined, {
        lat: pins[0].lat,
        lng: pins[0].lng,
        name: pins[0].name,
      })}
      fallbackTitle="Spots en Google Maps"
      fallbackSubtitle="Configura VITE_GOOGLE_MAPS_API_KEY para el mapa embebido."
    >
      <FitBounds
        points={pins.map((p) => ({ lat: p.lat, lng: p.lng }))}
        center={center}
        padding={40}
      />

      {pins.map((spot, idx) => (
        <AdvancedMarker
          key={`spot-${spot.placeId || spot.name}-${idx}`}
          position={{ lat: spot.lat, lng: spot.lng }}
          title={spot.name}
          onClick={() => setActiveIdx(idx)}
        >
          <Pin
            background={spot.type === "coworking" ? "#14b8a6" : "#ed93af"}
            borderColor="#ffffff"
            glyphColor="#ffffff"
            scale={1}
          />
        </AdvancedMarker>
      ))}

      {active ? (
        <InfoWindow
          position={{ lat: active.lat, lng: active.lng }}
          onCloseClick={() => setActiveIdx(null)}
          maxWidth={220}
        >
          <div className="text-xs font-sans min-w-[120px] text-[#240046]">
            <strong>{active.name}</strong>
            <div className="opacity-70 capitalize mt-0.5">
              {active.type === "coworking" ? "Coworking" : "Café"}
            </div>
            <a
              href={toGoogleMapsUrl(active.mapsUrl, {
                name: active.name,
                lat: active.lat,
                lng: active.lng,
                placeId: active.placeId,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#240046] underline mt-1 inline-block"
            >
              Ver en Google Maps
            </a>
          </div>
        </InfoWindow>
      ) : null}
    </GoogleMapShell>
  );
}

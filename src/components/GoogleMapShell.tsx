import { useEffect, type ReactNode } from "react";
import {
  APIProvider,
  ColorScheme,
  Map,
  useMap,
  type MapProps,
} from "@vis.gl/react-google-maps";
import { ExternalLink, MapPin } from "lucide-react";
import {
  getGoogleMapsApiKey,
  getGoogleMapsMapId,
  hasGoogleMapsApiKey,
} from "../lib/mapsConfig";
import type { LatLng } from "../lib/geo";

export function MapsKeyFallback({
  className,
  href,
  title = "Mapa de Google Maps",
  subtitle = "Configura VITE_GOOGLE_MAPS_API_KEY para ver el mapa aquí.",
}: {
  className?: string;
  href?: string;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 px-6 text-center bg-white/10 border border-dashed border-[#240046]/20 dark:border-white/15 ${className || ""}`}
    >
      <MapPin className="w-5 h-5 text-[#240046]/45 dark:text-white/40" />
      <p className="text-xs font-light text-[#240046]/70 dark:text-white/55">{title}</p>
      <p className="text-[10px] font-light text-[#240046]/45 dark:text-white/35 max-w-xs">
        {subtitle}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-1 text-[10px] font-mono uppercase tracking-wider text-[#240046] dark:text-[#ed93af] underline underline-offset-2"
        >
          Abrir en Google Maps
          <ExternalLink className="w-3 h-3" />
        </a>
      ) : null}
    </div>
  );
}

/** Fit map camera to a set of lat/lng points (or fall back to center). */
export function FitBounds({
  points,
  center,
  maxZoom = 15,
  padding = 48,
}: {
  points: LatLng[];
  center: LatLng;
  maxZoom?: number;
  padding?: number;
}) {
  const map = useMap();

  const pointsKey = points.map((p) => `${p.lat},${p.lng}`).join("|");

  useEffect(() => {
    if (!map) return;
    if (points.length === 0) {
      map.setCenter({ lat: center.lat, lng: center.lng });
      map.setZoom(13);
      return;
    }
    if (points.length === 1) {
      map.setCenter({ lat: points[0].lat, lng: points[0].lng });
      map.setZoom(15);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    for (const p of points) bounds.extend({ lat: p.lat, lng: p.lng });
    map.fitBounds(bounds, padding);
    const listener = google.maps.event.addListenerOnce(map, "idle", () => {
      const z = map.getZoom();
      if (typeof z === "number" && z > maxZoom) map.setZoom(maxZoom);
    });
    return () => {
      google.maps.event.removeListener(listener);
    };
    // pointsKey tracks coordinate identity without new-array identity churn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pointsKey, center.lat, center.lng, maxZoom, padding]);

  return null;
}

type ShellProps = {
  className?: string;
  isDarkMode?: boolean;
  defaultCenter: LatLng;
  defaultZoom?: number;
  gestureHandling?: MapProps["gestureHandling"];
  disableDefaultUI?: boolean;
  fallbackHref?: string;
  fallbackTitle?: string;
  fallbackSubtitle?: string;
  mapId?: string;
  children?: ReactNode;
};

/** APIProvider + Map, or key-missing fallback. */
export default function GoogleMapShell({
  className,
  isDarkMode,
  defaultCenter,
  defaultZoom = 13,
  gestureHandling = "greedy",
  disableDefaultUI,
  fallbackHref,
  fallbackTitle,
  fallbackSubtitle,
  mapId,
  children,
}: ShellProps) {
  if (!hasGoogleMapsApiKey()) {
    return (
      <MapsKeyFallback
        className={className}
        href={fallbackHref}
        title={fallbackTitle}
        subtitle={fallbackSubtitle}
      />
    );
  }

  const apiKey = getGoogleMapsApiKey();
  const resolvedMapId = mapId || getGoogleMapsMapId();

  return (
    <div className={className}>
      <APIProvider apiKey={apiKey} libraries={["marker"]}>
        <Map
          style={{ width: "100%", height: "100%" }}
          defaultCenter={{ lat: defaultCenter.lat, lng: defaultCenter.lng }}
          defaultZoom={defaultZoom}
          mapId={resolvedMapId}
          colorScheme={isDarkMode ? ColorScheme.DARK : ColorScheme.LIGHT}
          gestureHandling={gestureHandling}
          disableDefaultUI={disableDefaultUI}
          mapTypeControl={false}
          streetViewControl={false}
          fullscreenControl={false}
        >
          {children}
        </Map>
      </APIProvider>
    </div>
  );
}

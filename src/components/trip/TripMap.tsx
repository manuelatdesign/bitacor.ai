import { useMemo, useState } from "react";
import { AdvancedMarker, InfoWindow, Pin } from "@vis.gl/react-google-maps";
import type { TripPhoto } from "../../lib/tripPhotos";
import type { CafeOrCowork } from "../../types";
import type { LatLng } from "../../lib/geo";
import { googleMapsLatLngUrl } from "../../lib/googleMaps";
import GoogleMapShell, { FitBounds } from "../GoogleMapShell";

interface TripMapProps {
  center: LatLng;
  photos: TripPhoto[];
  cafes?: CafeOrCowork[];
  onSelectPhoto: (photo: TripPhoto) => void;
  isDarkMode: boolean;
}

export default function TripMap({
  center,
  photos,
  cafes = [],
  onSelectPhoto,
  isDarkMode,
}: TripMapProps) {
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);

  const cafePins = useMemo(
    () =>
      cafes.filter(
        (c): c is CafeOrCowork & { lat: number; lng: number } =>
          typeof c.lat === "number" && typeof c.lng === "number"
      ),
    [cafes]
  );

  const fitPoints = useMemo(() => {
    if (photos.length > 0) return photos.map((p) => ({ lat: p.lat, lng: p.lng }));
    return cafePins.map((c) => ({ lat: c.lat, lng: c.lng }));
  }, [photos, cafePins]);

  const activePhoto = photos.find((p) => p.id === activePhotoId) || null;

  return (
    <GoogleMapShell
      className="relative w-full h-[min(62vh,560px)] min-h-[320px] rounded-[1.5rem] overflow-hidden border border-white/50 dark:border-white/10 shadow-inner"
      isDarkMode={isDarkMode}
      defaultCenter={center}
      defaultZoom={13}
      fallbackHref={googleMapsLatLngUrl(center.lat, center.lng)}
      fallbackTitle="Mapa del viaje"
      fallbackSubtitle="Añade VITE_GOOGLE_MAPS_API_KEY (Maps JavaScript API) para ver pines aquí."
    >
      <FitBounds points={fitPoints} center={center} />

      {cafePins.map((cafe, idx) => (
        <AdvancedMarker
          key={`cafe-${cafe.placeId || cafe.name}-${idx}`}
          position={{ lat: cafe.lat, lng: cafe.lng }}
          title={cafe.name}
        >
          <Pin
            background={cafe.type === "coworking" ? "#14b8a6" : "#ed93af"}
            borderColor="#ffffff"
            glyphColor="#ffffff"
            scale={0.9}
          />
        </AdvancedMarker>
      ))}

      {photos.map((photo) => (
        <AdvancedMarker
          key={photo.id}
          position={{ lat: photo.lat, lng: photo.lng }}
          title={photo.locationName}
          onClick={() => {
            setActivePhotoId(photo.id);
            onSelectPhoto(photo);
          }}
        >
          <div className="bitacor-photo-marker" style={{ transform: "rotate(-4deg)" }}>
            <img src={photo.backImage} alt="" />
          </div>
        </AdvancedMarker>
      ))}

      {activePhoto ? (
        <InfoWindow
          position={{ lat: activePhoto.lat, lng: activePhoto.lng }}
          onCloseClick={() => setActivePhotoId(null)}
          maxWidth={200}
        >
          <button
            type="button"
            className="text-left text-xs font-sans cursor-pointer bg-transparent border-0 p-0"
            onClick={() => onSelectPhoto(activePhoto)}
          >
            <img
              src={activePhoto.backImage}
              alt=""
              className="w-36 h-24 object-cover rounded-lg mb-1.5"
            />
            <div className="font-medium text-[#240046]">{activePhoto.locationName}</div>
            <div className="opacity-60 text-[#240046]">{activePhoto.time}</div>
          </button>
        </InfoWindow>
      ) : null}
    </GoogleMapShell>
  );
}

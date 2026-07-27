/** Google Maps / Places deep links for the client. */

export function googleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query.trim() || "map")}`;
}

export function googleMapsLatLngUrl(lat: number, lng: number, label?: string): string {
  if (label?.trim()) {
    return googleMapsSearchUrl(`${label.trim()} @${lat},${lng}`);
  }
  return googleMapsSearchUrl(`${lat},${lng}`);
}

export function googleMapsPlaceIdUrl(placeId: string): string {
  return `https://www.google.com/maps/place/?q=place_id:${placeId}`;
}

/** Normalize OSM or other map URLs to Google Maps. */
export function toGoogleMapsUrl(
  url: string | undefined,
  opts: { name?: string; destination?: string; lat?: number; lng?: number; placeId?: string }
): string {
  if (opts.placeId && !String(opts.placeId).startsWith("osm-")) {
    return googleMapsPlaceIdUrl(opts.placeId);
  }

  if (url && /google\.com\/maps/i.test(url)) {
    return url;
  }

  if (url) {
    const mlat = url.match(/mlat=([-0-9.]+)/i);
    const mlon = url.match(/mlon=([-0-9.]+)/i);
    if (mlat && mlon) {
      return googleMapsLatLngUrl(parseFloat(mlat[1]), parseFloat(mlon[1]), opts.name);
    }
  }

  if (opts.lat != null && opts.lng != null) {
    return googleMapsLatLngUrl(opts.lat, opts.lng, opts.name);
  }

  const q = [opts.name, opts.destination].filter(Boolean).join(" ");
  return googleMapsSearchUrl(q);
}

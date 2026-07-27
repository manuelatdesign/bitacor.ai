/** Deep links for lodging search (no paid hotel API). */

export function lodgingDeepLinks(
  destination: string,
  arrivalDate?: string,
  departureDate?: string
): {
  hotelsUrl: string;
  bookingUrl: string;
  mapsUrl: string;
} {
  const dest = destination.trim() || "destino";
  const dateOut = arrivalDate || "";
  const dateBack = departureDate || "";

  const hotelsUrl = `https://www.google.com/travel/hotels/${encodeURIComponent(dest)}${
    dateOut && dateBack
      ? `?dates=${dateOut.replace(/-/g, "")},${dateBack.replace(/-/g, "")}`
      : ""
  }`;

  let bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(dest)}`;
  if (dateOut && dateBack) {
    bookingUrl += `&checkin=${dateOut}&checkout=${dateBack}`;
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `hoteles alojamiento ${dest}`
  )}`;

  return { hotelsUrl, bookingUrl, mapsUrl };
}

export function isLodgingUrl(value: string): boolean {
  const v = value.trim();
  if (!/^https?:\/\//i.test(v)) return false;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Open the user's lodging: pasted link, or Maps search by name. */
export function resolveLodgingHref(lodging: string, destination?: string): string {
  const raw = lodging.trim();
  if (!raw) return lodgingMapsUrl("", destination);
  if (isLodgingUrl(raw)) return raw;
  return lodgingMapsUrl(raw, destination);
}

export function lodgingDisplayLabel(lodging: string): string {
  const raw = lodging.trim();
  if (!raw) return "";
  if (!isLodgingUrl(raw)) return raw;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "");
    return host || "Mi reserva";
  } catch {
    return "Mi reserva";
  }
}

export function lodgingMapsUrl(lodgingName: string, destination?: string): string {
  const q = [lodgingName.trim(), destination?.trim()].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q || "hotel")}`;
}

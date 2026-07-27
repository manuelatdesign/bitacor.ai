import type { ReactNode } from "react";
import { googleMapsSearchUrl, toGoogleMapsUrl } from "./googleMaps";

const MD_LINK = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi;
const BARE_URL = /(https?:\/\/[^\s<>"')\]]+)/gi;

/** Venue-like phrases: Hostal Selina, Hotel X, Café Y, Metro de Medellín… */
const VENUE_PHRASE =
  /\b((?:Hostal(?:es)?|Hostel(?:s)?|Hotel(?:es)?|Selina|WeWork|Outpost|Dojo|Airbnb|Coliving|Cowork(?:ing)?|Café|Cafe|Cafetería|Metro(?:\s+de)?|Aeropuerto|Terminal|Parque|Plaza|Mercado|Museo|Templo|Barrio|Estación)\s+[A-ZÁÉÍÓÚÑÜ][\wÁÉÍÓÚÑÜáéíóúñü'&.-]{1,}(?:\s+(?:de|del|la|el|los|las|y|&|en)?\s*[A-ZÁÉÍÓÚÑÜ][\wÁÉÍÓÚÑÜáéíóúñü'&.-]{1,}){0,4})/g;

/** Capitalized multi-word proper nouns (e.g. El Poblado, Costa da Caparica) */
const PROPER_PLACE =
  /\b((?:El|La|Los|Las|San|Santa|São|Sao|Costa|Praia|Playa)\s+[A-ZÁÉÍÓÚÑÜ][\wÁÉÍÓÚÑÜáéíóúñü'&.-]{2,}(?:\s+[A-ZÁÉÍÓÚÑÜ][\wÁÉÍÓÚÑÜáéíóúñü'&.-]{2,}){0,3})/g;

export interface TipPlaceLink {
  name: string;
  url: string;
}

function mapsSearchUrl(query: string): string {
  return googleMapsSearchUrl(query);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const STOP_PHRASES = new Set([
  "el wifi",
  "la zona",
  "los días",
  "las horas",
  "san jose", // too generic alone without context — still ok for CR
]);

function knownWebLinks(destination: string): TipPlaceLink[] {
  const destQ = encodeURIComponent(destination.trim() || "travel");
  return [
    { name: "Booking", url: `https://www.booking.com/searchresults.html?ss=${destQ}` },
    { name: "Booking.com", url: `https://www.booking.com/searchresults.html?ss=${destQ}` },
    { name: "Airbnb", url: `https://www.airbnb.com/s/${destQ}/homes` },
    { name: "Google Hotels", url: `https://www.google.com/travel/hotels/${destQ}` },
    { name: "Google Flights", url: `https://www.google.com/travel/flights?q=${encodeURIComponent(`Flights to ${destination}`)}` },
    { name: "GetYourGuide", url: `https://www.getyourguide.com/s/?q=${destQ}` },
    { name: "Airalo", url: "https://www.airalo.com/" },
    { name: "Uber", url: "https://www.uber.com/" },
    { name: "Didi", url: "https://web.didiglobal.com/" },
    { name: "Selina", url: mapsSearchUrl(`Selina ${destination}`.trim()) },
    { name: "WeWork", url: mapsSearchUrl(`WeWork ${destination}`.trim()) },
  ];
}

/** Pull venue-like names from tip text for Maps links. */
export function extractPlacesFromTip(tip: string, destination = ""): TipPlaceLink[] {
  const out: TipPlaceLink[] = [];
  const seen = new Set<string>();
  const add = (name: string) => {
    const n = name.trim().replace(/[.,;:!?]+$/, "");
    if (n.length < 4) return;
    const key = n.toLowerCase();
    if (seen.has(key) || STOP_PHRASES.has(key)) return;
    seen.add(key);
    out.push({
      name: n,
      url: mapsSearchUrl(destination ? `${n} ${destination}` : n),
    });
  };

  for (const re of [VENUE_PHRASE, PROPER_PLACE]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(tip)) !== null) {
      add(m[1]);
    }
  }

  return out;
}

const LINK_CLASS =
  "text-[#240046] dark:text-[#ed93af] font-medium underline underline-offset-2 decoration-[#240046]/35 dark:decoration-[#ed93af]/45 hover:decoration-[#240046] dark:hover:decoration-[#ed93af]";

/** Split text into React nodes with clickable links (new tab). */
export function linkifyTipText(
  tip: string,
  places: TipPlaceLink[] = [],
  destination = ""
): ReactNode[] {
  const raw = (tip || "").trim();
  if (!raw) return [];

  // 1) Protect markdown links and bare URLs as placeholders
  const stubs: { label: string; url: string }[] = [];
  let working = raw.replace(MD_LINK, (_, label: string, url: string) => {
    const i = stubs.length;
    const name = label.trim() || url;
    const isMap =
      /openstreetmap\.org|google\.com\/maps|maps\.google/i.test(url) ||
      /mlat=|mlon=/.test(url);
    stubs.push({
      label: name,
      url: isMap ? toGoogleMapsUrl(url, { name, destination }) : url,
    });
    return `\u0000L${i}\u0000`;
  });

  working = working.replace(BARE_URL, (url: string) => {
    if (url.includes("\u0000")) return url;
    const i = stubs.length;
    let label = url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    try {
      label = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      label = label.slice(0, 40);
    }
    // Keep non-map URLs (Booking, etc.); rewrite OSM → Google Maps
    const isMap =
      /openstreetmap\.org|google\.com\/maps|maps\.google/i.test(url) ||
      /mlat=|mlon=/.test(url);
    stubs.push({
      label,
      url: isMap ? toGoogleMapsUrl(url, { destination }) : url,
    });
    return `\u0000L${i}\u0000`;
  });

  // 2) Merge known places + brands + auto-extracted venue names
  const merged = new Map<string, TipPlaceLink>();
  const register = (p: TipPlaceLink) => {
    const key = p.name.trim().toLowerCase();
    if (!key || key.length < 3) return;
    if (!merged.has(key)) merged.set(key, p);
  };
  for (const p of places) register(p);
  for (const p of knownWebLinks(destination)) register(p);
  // Extract from original tip (not stubbed) so venue regex sees real text
  for (const p of extractPlacesFromTip(raw.replace(MD_LINK, "$1").replace(BARE_URL, ""), destination)) {
    register(p);
  }

  const sortedPlaces = [...merged.values()].sort((a, b) => b.name.length - a.name.length);

  type Token = { type: "text"; value: string } | { type: "link"; label: string; url: string };
  let tokens: Token[] = [{ type: "text", value: working }];

  for (const place of sortedPlaces) {
    const next: Token[] = [];
    const re = new RegExp(`(?<![\\w#\\u0000])(${escapeRegExp(place.name)})(?![\\w])`, "gi");
    for (const tok of tokens) {
      if (tok.type !== "text") {
        next.push(tok);
        continue;
      }
      let last = 0;
      let m: RegExpExecArray | null;
      const s = tok.value;
      re.lastIndex = 0;
      while ((m = re.exec(s)) !== null) {
        // Skip matches inside stubs
        if (s.slice(Math.max(0, m.index - 2), m.index).includes("\u0000")) {
          continue;
        }
        if (m.index > last) next.push({ type: "text", value: s.slice(last, m.index) });
        next.push({ type: "link", label: m[1], url: place.url });
        last = m.index + m[1].length;
      }
      if (last < s.length) next.push({ type: "text", value: s.slice(last) });
    }
    tokens = next;
  }

  // 3) Expand stubs + render
  const nodes: ReactNode[] = [];
  let key = 0;

  const pushTextWithStubs = (text: string) => {
    const parts = text.split(/(\u0000L\d+\u0000)/g);
    for (const part of parts) {
      if (!part) continue;
      const stub = part.match(/^\u0000L(\d+)\u0000$/);
      if (stub) {
        const item = stubs[Number(stub[1])];
        if (item) {
          nodes.push(
            <a
              key={`a-${key++}`}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${LINK_CLASS} break-all`}
            >
              {item.label}
            </a>
          );
        }
        continue;
      }
      nodes.push(<span key={`t-${key++}`}>{part}</span>);
    }
  };

  for (const tok of tokens) {
    if (tok.type === "link") {
      nodes.push(
        <a
          key={`p-${key++}`}
          href={tok.url}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {tok.label}
        </a>
      );
    } else {
      pushTextWithStubs(tok.value);
    }
  }

  return nodes;
}

/** Build place links from cafes/coworks + activity titles/maps. */
export function collectTipPlaces(
  cafes: Array<{ name?: string; mapsUrl?: string }> = [],
  activities: Array<{ title?: string; mapsUrl?: string }> = [],
  destination = ""
): TipPlaceLink[] {
  const out: TipPlaceLink[] = [];
  const seen = new Set<string>();

  const add = (name: string, url?: string) => {
    const n = name.trim();
    if (!n || n.length < 3 || seen.has(n.toLowerCase())) return;
    seen.add(n.toLowerCase());
    out.push({
      name: n,
      url: toGoogleMapsUrl(url, { name: n, destination }),
    });
  };

  for (const c of cafes) {
    if (c.name) add(c.name, c.mapsUrl);
  }
  for (const a of activities) {
    if (!a.title) continue;
    // Prefer short venue-like titles over long activity slogans
    const title = a.title.trim();
    if (title.length <= 48) add(title, a.mapsUrl);
    else {
      const venue = title.match(VENUE_PHRASE)?.[1];
      if (venue) add(venue, a.mapsUrl);
    }
  }

  if (destination.trim()) {
    const city = destination.split(",")[0]?.trim() || destination.trim();
    add(city, mapsSearchUrl(city));
  }

  return out;
}

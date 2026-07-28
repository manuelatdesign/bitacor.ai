import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Self-contained autocomplete for Vercel.
 * Do not import from ../../server here — relative server imports crash the
 * serverless bundle (FUNCTION_INVOCATION_FAILED). Local Express uses
 * server/cityAutocomplete.ts instead.
 */

type CitySuggestion = {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  source: "google" | "nominatim";
};

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 8000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function autocompleteCities(query: string): Promise<{
  suggestions: CitySuggestion[];
  source: "google" | "nominatim" | "none";
  warning?: string;
}> {
  const q = query.trim();
  if (q.length < 2) return { suggestions: [], source: "none" };

  const apiKey = process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const params = new URLSearchParams({
        input: q,
        types: "(cities)",
        language: "es",
        key: apiKey,
      });
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params}`;
      const res = await fetchWithTimeout(url, { timeoutMs: 6000 });
      if (!res.ok) throw new Error(`Autocomplete HTTP ${res.status}`);
      const data = await res.json();
      if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
        throw new Error(
          `Autocomplete falló: ${data.status}${data.error_message ? ` — ${data.error_message}` : ""}`
        );
      }
      const suggestions: CitySuggestion[] = (data.predictions || []).slice(0, 8).map((p: any) => ({
        placeId: p.place_id || p.description,
        description: p.description,
        mainText: p.structured_formatting?.main_text || p.description,
        secondaryText: p.structured_formatting?.secondary_text || "",
        source: "google" as const,
      }));
      return { suggestions, source: "google" };
    } catch (err: any) {
      console.warn("[api/places/autocomplete] Google falló, Nominatim:", err?.message || err);
    }
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=8&featuretype=city&q=${encodeURIComponent(q)}`;
    const res = await fetchWithTimeout(url, {
      timeoutMs: 6000,
      headers: {
        Accept: "application/json",
        "User-Agent": "Bitacor.ai/1.0 (travel planner)",
      },
    });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const data = (await res.json()) as any[];
    const suggestions: CitySuggestion[] = (data || []).map((item) => {
      const city =
        item.address?.city ||
        item.address?.town ||
        item.address?.village ||
        item.address?.municipality ||
        item.name ||
        item.display_name?.split(",")[0];
      const region = [item.address?.state, item.address?.country].filter(Boolean).join(", ");
      return {
        placeId: `osm-${item.place_id}`,
        description: item.display_name,
        mainText: city,
        secondaryText: region,
        source: "nominatim" as const,
      };
    });
    return {
      suggestions,
      source: "nominatim",
      warning: apiKey ? undefined : "GOOGLE_PLACES_API_KEY no configurada; usando OpenStreetMap.",
    };
  } catch (err: any) {
    return {
      suggestions: [],
      source: "none",
      warning: err?.message || "No se pudieron obtener sugerencias.",
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const result = await autocompleteCities(q);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("[api/places/autocomplete]", err);
    return res.status(500).json({
      suggestions: [],
      source: "none",
      warning: err?.message || "Error",
    });
  }
}

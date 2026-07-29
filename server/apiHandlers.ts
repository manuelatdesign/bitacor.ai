import { autocompleteCities } from "./cityAutocomplete";
import { normalizeActivityCategory } from "./activityCategories";
import {
  cacheKey,
  categoryCacheKey,
  getCachedCategories,
  getCachedEnrichment,
  getCachedProposals,
  setCachedCategories,
  setCachedEnrichment,
  setCachedProposals,
} from "./cache";
import { enrichPlaces } from "./places";
import { checkRateLimit } from "./rateLimit";
import { getTokenBudgetStatus, isTokenBudgetError } from "./tokenBudget";
import type { EnrichmentContext, GeneratedItinerary, TravelConfigInput } from "./types";
import { toGoogleMapsUrl } from "./googleMaps";
import { buildTravelDeepLinks } from "./travelExtras";

/** Minimal req/res shared by Express (local) and Vercel serverless. */
export type ApiRequest = {
  method?: string;
  query?: Record<string, unknown>;
  body?: unknown;
  headers: Record<string, unknown>;
  socket?: { remoteAddress?: string | null };
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => unknown;
};

function clientIp(req: ApiRequest): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

function queryString(req: ApiRequest, key: string): string {
  const raw = req.query?.[key];
  return typeof raw === "string" ? raw : "";
}

export async function handlePlacesAutocomplete(req: ApiRequest, res: ApiResponse) {
  try {
    const q = queryString(req, "q");
    const result = await autocompleteCities(q);
    return res.json(result);
  } catch (err: any) {
    console.error("[places/autocomplete]", err);
    return res.status(500).json({
      suggestions: [],
      source: "none",
      warning: err?.message || "Error",
    });
  }
}

export async function handleDestinationCategories(req: ApiRequest, res: ApiResponse) {
  const started = Date.now();
  try {
    const ip = clientIp(req);
    const limit = checkRateLimit(ip);
    if (!limit.ok) {
      return res.status(429).json({
        error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
        retryAfterSec: limit.retryAfterSec,
      });
    }

    const body = (req.body ?? {}) as { destination?: unknown };
    const destination = typeof body.destination === "string" ? body.destination.trim() : "";
    if (!destination) {
      return res.status(400).json({ error: "El destino es requerido." });
    }

    if (!process.env.CURSOR_API_KEY) {
      return res.status(503).json({
        error: "CURSOR_API_KEY no configurada.",
        fallback: true,
      });
    }

    const key = categoryCacheKey(destination);
    const cached = getCachedCategories(key);
    if (cached) {
      return res.json({
        categories: cached,
        meta: { cached: true, source: "ai", totalMs: Date.now() - started },
      });
    }

    const { generateCategoriesWithCursor } = await import("./cursorAgent");
    const categories = await generateCategoriesWithCursor(destination);
    setCachedCategories(key, categories);
    console.log(
      `[destination-categories] ${destination} → ${categories.length} cats (${Date.now() - started}ms)`
    );
    return res.json({
      categories,
      meta: { cached: false, source: "ai", totalMs: Date.now() - started },
    });
  } catch (err: any) {
    console.error("[destination-categories]", err);
    if (isTokenBudgetError(err)) {
      const budget = getTokenBudgetStatus();
      return res.status(429).json({
        error: "IA temporalmente no disponible; prueba cache/mock o más tarde.",
        code: "TOKEN_BUDGET_EXCEEDED",
        fallback: true,
        meta: { budget: { blocked: true, day: budget.day } },
      });
    }
    return res.status(500).json({
      error: err?.message || "No se pudieron generar categorías.",
      fallback: true,
    });
  }
}

function parseConfig(body: TravelConfigInput): TravelConfigInput | null {
  const destination = typeof body.destination === "string" ? body.destination.trim() : "";
  if (!destination) return null;
  return {
    destination,
    days: typeof body.days === "number" && body.days > 0 ? body.days : 3,
    budget: body.budget || "",
    interests: Array.isArray(body.interests)
      ? body.interests.filter((i) => typeof i === "string")
      : [],
    pace: body.pace || "",
    arrivalDate: body.arrivalDate,
    arrivalTime: body.arrivalTime,
    departureDate: body.departureDate,
    departureTime: body.departureTime,
    lodging: typeof body.lodging === "string" ? body.lodging.trim() : undefined,
  };
}

function finalizeProposals(
  proposals: GeneratedItinerary[],
  enrichment: EnrichmentContext,
  config: TravelConfigInput,
  geoWarnings: string[]
): { proposals: GeneratedItinerary[]; travelLinks: ReturnType<typeof buildTravelDeepLinks> } {
  const travelLinks = buildTravelDeepLinks(config);
  const matchPlace = (name: string) =>
    enrichment.places.find((pl) => {
      const a = name.toLowerCase();
      const b = pl.name.toLowerCase();
      return a.includes(b) || b.includes(a);
    });

  for (const p of proposals) {
    for (const cafe of p.recommendedCafesAndCoworks) {
      const match = matchPlace(cafe.name);
      if (match) {
        if (cafe.lat == null && match.lat != null) cafe.lat = match.lat;
        if (cafe.lng == null && match.lng != null) cafe.lng = match.lng;
        if (!cafe.placeId && match.placeId) cafe.placeId = match.placeId;
      }
      cafe.mapsUrl = toGoogleMapsUrl(cafe.mapsUrl || match?.mapsUrl, {
        name: cafe.name,
        destination: config.destination,
        lat: cafe.lat,
        lng: cafe.lng,
        placeId: cafe.placeId,
      });
    }
    for (const day of p.itinerary || []) {
      for (const act of day.activities || []) {
        const match = matchPlace(act.title);
        if (match) {
          if (act.lat == null && match.lat != null) act.lat = match.lat;
          if (act.lng == null && match.lng != null) act.lng = match.lng;
        }
        if (match || act.mapsUrl || (act.lat != null && act.lng != null)) {
          act.mapsUrl = toGoogleMapsUrl(act.mapsUrl || match?.mapsUrl, {
            name: act.title,
            destination: config.destination,
            lat: act.lat,
            lng: act.lng,
            placeId: match?.placeId,
          });
        }
        const fromPlace =
          match?.type === "coworking" ? "work" : match?.type === "cafe" ? "cafe" : undefined;
        const category = normalizeActivityCategory(act.category || fromPlace, {
          title: `${act.title} ${match?.notes || ""} ${match?.type || ""}`,
          desc: act.desc,
          isCoworkingFriendly: act.isCoworkingFriendly,
        });
        act.category = category;
        act.isCoworkingFriendly = category === "work";
      }
    }
    const tipSet = new Set(p.practicalTips);
    for (const line of travelLinks.tipLines) {
      if (!tipSet.has(line)) p.practicalTips.push(line);
    }
    for (const w of geoWarnings) {
      const tip = `Tip de ruta: ${w}`;
      if (!tipSet.has(tip)) p.practicalTips.push(tip);
    }
  }
  return { proposals, travelLinks };
}

function isGeneratedItinerary(v: unknown): v is GeneratedItinerary {
  return (
    typeof v === "object" &&
    v !== null &&
    Array.isArray((v as GeneratedItinerary).itinerary) &&
    typeof (v as GeneratedItinerary).proposalType === "string"
  );
}

export async function handleGenerateProposals(req: ApiRequest, res: ApiResponse) {
  const started = Date.now();
  const timings: Record<string, number> = {};

  try {
    const ip = clientIp(req);
    const limit = checkRateLimit(ip);
    if (!limit.ok) {
      return res.status(429).json({
        error: "Demasiadas solicitudes. Intenta de nuevo en unos segundos.",
        retryAfterSec: limit.retryAfterSec,
      });
    }

    const body = (req.body ?? {}) as TravelConfigInput & {
      principal?: unknown;
    };
    const config = parseConfig(body);
    if (!config) {
      return res.status(400).json({ error: "El destino es requerido." });
    }

    const regenerate = body.regenerate === true;
    const stage: "principal" | "optionB" =
      body.stage === "optionB" ? "optionB" : "principal";
    const key = cacheKey(config);

    // Full-pair cache only on principal stage (instant both proposals)
    if (stage === "principal" && !regenerate) {
      const cached = getCachedProposals(key);
      if (cached && cached.length >= 2) {
        console.log(`[generate-proposals] cache hit (${Date.now() - started}ms)`);
        return res.json({
          proposals: cached,
          meta: {
            cached: true,
            source: "ai",
            stage: "complete",
            pendingOptionB: false,
            timings: { totalMs: Date.now() - started },
          },
        });
      }
    } else if (regenerate && stage === "principal") {
      console.log("[generate-proposals] regenerate=true — cache bypass");
    }

    if (!process.env.CURSOR_API_KEY) {
      return res.status(503).json({
        error: "CURSOR_API_KEY no configurada. Usa el fallback mock en el cliente.",
        code: "CURSOR_API_KEY_MISSING",
        meta: { timings },
      });
    }

    // Enrichment: reuse in-memory cache when possible (optionB / same config)
    let enrichment = !regenerate ? getCachedEnrichment(key) : null;
    if (!enrichment) {
      const tPlaces = Date.now();
      const placesPart = await enrichPlaces(config);
      timings.placesMs = Date.now() - tPlaces;
      enrichment = {
        places: placesPart.places,
        lat: placesPart.lat,
        lng: placesPart.lng,
        formattedAddress: placesPart.formattedAddress,
        warnings: [...placesPart.warnings],
      };
      setCachedEnrichment(key, enrichment);
    } else {
      timings.placesMs = 0;
    }

    const {
      generatePrincipalWithCursor,
      generateOptionBWithCursor,
    } = await import("./cursorAgent");

    if (stage === "optionB") {
      if (!isGeneratedItinerary(body.principal)) {
        return res.status(400).json({
          error: "stage=optionB requiere el objeto principal generado.",
        });
      }
      const principalIn = body.principal;
      principalIn.proposalType = "Principal";

      const tCursor = Date.now();
      const { proposal: optionB, geoWarnings } = await generateOptionBWithCursor(
        config,
        enrichment,
        principalIn,
        { regenerate }
      );
      timings.cursorMs = Date.now() - tCursor;
      timings.totalMs = Date.now() - started;

      const { proposals, travelLinks } = finalizeProposals(
        [principalIn, optionB],
        enrichment,
        config,
        geoWarnings
      );

      if (!regenerate) {
        setCachedProposals(key, proposals);
      }

      console.log(
        `[generate-proposals] optionB ok destination=${config.destination} places=${enrichment.places.length} timings=${JSON.stringify(timings)}`
      );

      return res.json({
        proposals,
        meta: {
          cached: false,
          source: "ai",
          stage: "optionB",
          pendingOptionB: false,
          regenerated: regenerate,
          timings,
          warnings: [...enrichment.warnings, ...geoWarnings],
          placesCount: enrichment.places.length,
          enrichmentSource: "osm+overpass",
          travelLinks: {
            flightsUrl: travelLinks.flightsUrl,
            hotelsUrl: travelLinks.hotelsUrl,
          },
        },
      });
    }

    // stage === principal
    const tCursor = Date.now();
    const { proposal: principal, geoWarnings } = await generatePrincipalWithCursor(
      config,
      enrichment,
      { regenerate }
    );
    timings.cursorMs = Date.now() - tCursor;
    timings.totalMs = Date.now() - started;

    const { proposals, travelLinks } = finalizeProposals(
      [principal],
      enrichment,
      config,
      geoWarnings
    );

    console.log(
      `[generate-proposals] principal ok destination=${config.destination} places=${enrichment.places.length} timings=${JSON.stringify(timings)}`
    );

    return res.json({
      proposals,
      meta: {
        cached: false,
        source: "ai",
        stage: "principal",
        pendingOptionB: true,
        regenerated: regenerate,
        timings,
        warnings: [...enrichment.warnings, ...geoWarnings],
        placesCount: enrichment.places.length,
        enrichmentSource: "osm+overpass",
        travelLinks: {
          flightsUrl: travelLinks.flightsUrl,
          hotelsUrl: travelLinks.hotelsUrl,
        },
      },
    });
  } catch (error: any) {
    console.error("[generate-proposals] error:", error);
    timings.totalMs = Date.now() - started;
    if (isTokenBudgetError(error)) {
      const budget = getTokenBudgetStatus();
      return res.status(429).json({
        error: "IA temporalmente no disponible; prueba cache/mock o más tarde.",
        code: "TOKEN_BUDGET_EXCEEDED",
        meta: {
          timings,
          budget: { blocked: true, day: budget.day },
        },
      });
    }
    return res.status(500).json({
      error: "Ocurrió un error al generar los itinerarios.",
      details: error?.message || String(error),
      meta: { timings },
    });
  }
}

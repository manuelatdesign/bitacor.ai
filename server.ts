import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { normalizeActivityCategory } from "./server/activityCategories";
import { cacheKey, categoryCacheKey, getCachedCategories, getCachedProposals, setCachedCategories, setCachedProposals } from "./server/cache";
import { generateCategoriesWithCursor, generateProposalsWithCursor } from "./server/cursorAgent";
import { autocompleteCities, enrichPlaces } from "./server/places";
import { checkRateLimit } from "./server/rateLimit";
import { getTokenBudgetStatus, isTokenBudgetError } from "./server/tokenBudget";
import type { EnrichmentContext, TravelConfigInput } from "./server/types";
import { toGoogleMapsUrl } from "./server/googleMaps";
import { buildTravelDeepLinks } from "./server/travelExtras";
import { enrichWeather } from "./server/weather";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "256kb" }));

app.get("/api/places/autocomplete", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const result = await autocompleteCities(q);
    res.json(result);
  } catch (err: any) {
    console.error("[places/autocomplete]", err);
    res.status(500).json({ suggestions: [], source: "none", warning: err?.message || "Error" });
  }
});

app.post("/api/destination-categories", async (req, res) => {
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

    const destination =
      typeof req.body?.destination === "string" ? req.body.destination.trim() : "";
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
        error:
          "IA temporalmente no disponible; prueba cache/mock o más tarde.",
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
});

function clientIp(req: express.Request): string {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) return xf.split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

/**
 * Unified generation: Places + Weather (soft) → Cursor SDK → 2 proposals.
 * Partial failures in enrichment do not abort generation.
 */
app.post("/api/generate-proposals", async (req, res) => {
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

    const body = req.body as TravelConfigInput;
    const destination = typeof body.destination === "string" ? body.destination.trim() : "";
    if (!destination) {
      return res.status(400).json({ error: "El destino es requerido." });
    }

    const config: TravelConfigInput = {
      destination,
      days: typeof body.days === "number" && body.days > 0 ? body.days : 3,
      budget: body.budget || "",
      interests: Array.isArray(body.interests) ? body.interests.filter((i) => typeof i === "string") : [],
      pace: body.pace || "",
      arrivalDate: body.arrivalDate,
      arrivalTime: body.arrivalTime,
      departureDate: body.departureDate,
      departureTime: body.departureTime,
      lodging: typeof body.lodging === "string" ? body.lodging.trim() : undefined,
    };

    const key = cacheKey(config);
    const cached = getCachedProposals(key);
    if (cached) {
      console.log(`[generate-proposals] cache hit (${Date.now() - started}ms)`);
      return res.json({ proposals: cached, meta: { cached: true, timings: { totalMs: Date.now() - started } } });
    }

    // --- Enrichment (partial timeouts / soft fail) ---
    const tPlaces = Date.now();
    const placesPart = await enrichPlaces(config);
    timings.placesMs = Date.now() - tPlaces;

    const tWeather = Date.now();
    const weatherPart = await enrichWeather(placesPart.lat, placesPart.lng, config);
    timings.weatherMs = Date.now() - tWeather;

    const enrichment: EnrichmentContext = {
      places: placesPart.places,
      weather: weatherPart.weather,
      lat: placesPart.lat,
      lng: placesPart.lng,
      formattedAddress: placesPart.formattedAddress,
      warnings: [...placesPart.warnings, ...weatherPart.warnings],
    };

    // --- Cursor generation ---
    if (!process.env.CURSOR_API_KEY) {
      return res.status(503).json({
        error: "CURSOR_API_KEY no configurada. Usa el fallback mock en el cliente.",
        code: "CURSOR_API_KEY_MISSING",
        meta: { timings, warnings: enrichment.warnings },
      });
    }

    const tCursor = Date.now();
    const { proposals, geoWarnings } = await generateProposalsWithCursor(config, enrichment);
    timings.cursorMs = Date.now() - tCursor;
    timings.totalMs = Date.now() - started;

    // Attach maps / coords from OSM enrichment + travel booking tips
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
          // Re-resolve category after attach (and when model stamped explore everywhere).
          const fromPlace =
            match?.type === "coworking"
              ? "work"
              : match?.type === "cafe"
                ? "cafe"
                : undefined;
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

    setCachedProposals(key, proposals);
    console.log(
      `[generate-proposals] ok destination=${config.destination} places=${enrichment.places.length} timings=${JSON.stringify(timings)}`
    );

    return res.json({
      proposals,
      meta: {
        cached: false,
        timings,
        warnings: [...enrichment.warnings, ...geoWarnings],
        placesCount: enrichment.places.length,
        weatherDays: enrichment.weather.length,
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
        error:
          "IA temporalmente no disponible; prueba cache/mock o más tarde.",
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
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import type { TravelConfigInput, WeatherDaySummary } from "./types";

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function summarizeDay(tempMax: number, tempMin: number, precip: number): string {
  if (precip >= 8) return "Día lluvioso — prioriza indoor/coworking.";
  if (precip >= 2) return "Posibles lluvias — mezcla indoor/outdoor.";
  if (tempMax >= 32) return "Calor intenso — actividad temprana o sombra.";
  if (tempMax <= 10) return "Fresco — capas y planes indoor cómodos.";
  return "Clima favorable para explorar.";
}

/**
 * Open-Meteo forecast for trip dates. Soft-fails with empty array + warning.
 */
export async function enrichWeather(
  lat: number | undefined,
  lng: number | undefined,
  config: TravelConfigInput
): Promise<{ weather: WeatherDaySummary[]; warnings: string[] }> {
  const warnings: string[] = [];
  if (lat == null || lng == null) {
    warnings.push("Sin coordenadas; se omite clima.");
    return { weather: [], warnings };
  }

  const start = config.arrivalDate;
  const end = config.departureDate || config.arrivalDate;
  if (!start) {
    warnings.push("Sin fechas de viaje; se omite clima detallado.");
    return { weather: [], warnings };
  }

  try {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      daily: "temperature_2m_max,temperature_2m_min,precipitation_sum",
      timezone: "auto",
      start_date: start,
      end_date: end || start,
    });

    const url = `https://api.open-meteo.com/v1/forecast?${params}`;
    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();

    const dates: string[] = data.daily?.time || [];
    const maxs: number[] = data.daily?.temperature_2m_max || [];
    const mins: number[] = data.daily?.temperature_2m_min || [];
    const precs: number[] = data.daily?.precipitation_sum || [];

    const weather: WeatherDaySummary[] = dates.map((date, i) => {
      const tempMaxC = Math.round(maxs[i] ?? 0);
      const tempMinC = Math.round(mins[i] ?? 0);
      const precipitationMm = Math.round((precs[i] ?? 0) * 10) / 10;
      return {
        date,
        tempMaxC,
        tempMinC,
        precipitationMm,
        summary: summarizeDay(tempMaxC, tempMinC, precipitationMm),
      };
    });

    return { weather, warnings };
  } catch (err: any) {
    warnings.push(`Clima no disponible: ${err?.message || err}`);
    return { weather: [], warnings };
  }
}

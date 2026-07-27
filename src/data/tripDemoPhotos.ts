import type { LatLng } from "../lib/geo";
import { jitterAround } from "../lib/geo";
import type { TripPhoto } from "../lib/tripPhotos";

type DemoScene = {
  back: string;
  front: string;
  label: string;
  note: string;
};

const BY_DESTINATION: Record<string, DemoScene[]> = {
  medellin: [
    {
      back: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80",
      front: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      label: "Semilla Café (El Poblado)",
      note: "Primer café del día y Slack con buen Wi‑Fi.",
    },
    {
      back: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
      front: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
      label: "Cowork Laureles",
      note: "Bloque de enfoque profundo hasta el mediodía.",
    },
    {
      back: "https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?auto=format&fit=crop&w=800&q=80",
      front: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
      label: "Comuna 13",
      note: "Pausa cultural después del standup.",
    },
    {
      back: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80",
      front: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      label: "Parque Arví",
      note: "Cierre del día al aire libre.",
    },
  ],
  kyoto: [
    {
      back: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80",
      front: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      label: "Templo Kiyomizu",
      note: "Mañana temprana antes del café.",
    },
    {
      back: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80",
      front: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
      label: "Cowork Gion",
      note: "Sprints con matcha al lado.",
    },
    {
      back: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=800&q=80",
      front: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
      label: "Arashiyama",
      note: "Atardecer entre bambúes.",
    },
  ],
  bali: [
    {
      back: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80",
      front: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      label: "Canggu Beach Club",
      note: "Calls con vista al surf.",
    },
    {
      back: "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=800&q=80",
      front: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      label: "Ubud Rice Terraces",
      note: "Pausa creativa a mitad de semana.",
    },
  ],
  amalfi: [
    {
      back: "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80",
      front: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
      label: "Positano",
      note: "Espresso y backlog en la terraza.",
    },
    {
      back: "https://images.unsplash.com/photo-1486082570281-d90cb0917450?auto=format&fit=crop&w=800&q=80",
      front: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
      label: "Cowork Ravello",
      note: "Bloque profundo con vista al Mediterráneo.",
    },
  ],
};

const FALLBACK: DemoScene[] = [
  {
    back: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80",
    front: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    label: "Café nómada",
    note: "Primer checkpoint del viaje.",
  },
  {
    back: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
    front: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    label: "Espacio de cowork",
    note: "Entrega cerrada antes del paseo.",
  },
  {
    back: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80",
    front: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    label: "Mirador local",
    note: "Cierre del día fuera de la laptop.",
  },
  {
    back: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80",
    front: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80",
    label: "Ruta escénica",
    note: "Momento BeReal espontáneo.",
  },
];

function destinationKey(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("medellin") || t.includes("medellín")) return "medellin";
  if (t.includes("kyoto") || t.includes("kioto")) return "kyoto";
  if (t.includes("bali")) return "bali";
  if (t.includes("amalfi") || t.includes("positano")) return "amalfi";
  return "custom";
}

export function buildDemoTripPhotos(
  tripKey: string,
  destinationTitle: string,
  center: LatLng
): TripPhoto[] {
  const scenes = BY_DESTINATION[destinationKey(destinationTitle)] || FALLBACK;
  const now = Date.now();

  return scenes.map((scene, idx) => {
    const coords = jitterAround(center, idx + 1);
    const createdAt = now - idx * 3_600_000;
    return {
      id: `demo-${tripKey}-${idx}`,
      tripKey,
      backImage: scene.back,
      frontImage: scene.front,
      lat: coords.lat,
      lng: coords.lng,
      locationName: scene.label,
      time: new Date(createdAt).toLocaleString("es-CO", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
      note: scene.note,
      source: "demo" as const,
      createdAt,
    };
  });
}

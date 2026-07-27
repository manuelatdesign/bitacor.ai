/** Demo friends feed — no backend yet. Dates relative to "now" so status stays fresh. */

export type FriendTripStatus = "traveling" | "upcoming" | "home";

export interface FriendTrip {
  id: string;
  name: string;
  handle: string;
  /** Initials for avatar fallback */
  initials: string;
  /** Tailwind-ish accent for avatar gradient */
  accent: string;
  status: FriendTripStatus;
  destination: string;
  neighborhood?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  /** Short vibe line */
  note: string;
  coverUrl: string;
  /** Days until start (upcoming) or day of trip (traveling) — computed at load */
  dayLabel: string;
}

function isoOffset(daysFromToday: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

function formatRange(start: string, end: string): string {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const a = new Date(start + "T12:00:00");
  const b = new Date(end + "T12:00:00");
  return `${a.toLocaleDateString("es", opts)} – ${b.toLocaleDateString("es", opts)}`;
}

export function tripDateLabel(start: string, end: string): string {
  return formatRange(start, end);
}

/** Build demo friends with live-relative dates. */
export function getFriendsFeed(): FriendTrip[] {
  const friends: Omit<FriendTrip, "dayLabel">[] = [
    {
      id: "f1",
      name: "Camila R.",
      handle: "@cami.codes",
      initials: "CR",
      accent: "from-teal-400 to-emerald-600",
      status: "traveling",
      destination: "Medellín",
      neighborhood: "Laureles",
      startDate: isoOffset(-4),
      endDate: isoOffset(3),
      note: "Deep work mañanas + cafecito en Provenza ☕",
      coverUrl:
        "https://images.unsplash.com/photo-1568632234157-ce7aecd03d0d?w=640&q=80&auto=format&fit=crop",
    },
    {
      id: "f2",
      name: "Diego M.",
      handle: "@diegom",
      initials: "DM",
      accent: "from-violet-400 to-[#240046]",
      status: "traveling",
      destination: "Lisboa",
      neighborhood: "Alfama",
      startDate: isoOffset(-1),
      endDate: isoOffset(8),
      note: "Coworking con vista al Tejo 🌊",
      coverUrl:
        "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=640&q=80&auto=format&fit=crop",
    },
    {
      id: "f3",
      name: "Sofía L.",
      handle: "@sofi.nomad",
      initials: "SL",
      accent: "from-[#ed93af] to-rose-500",
      status: "upcoming",
      destination: "Bali",
      neighborhood: "Canggu",
      startDate: isoOffset(12),
      endDate: isoOffset(26),
      note: "Surf + async sprints. ¿Quién se apunta?",
      coverUrl:
        "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=640&q=80&auto=format&fit=crop",
    },
    {
      id: "f4",
      name: "Andrés V.",
      handle: "@andres.v",
      initials: "AV",
      accent: "from-amber-300 to-orange-500",
      status: "upcoming",
      destination: "Ciudad de México",
      neighborhood: "Roma Norte",
      startDate: isoOffset(21),
      endDate: isoOffset(32),
      note: "Tacos + meetups de product 🌮",
      coverUrl:
        "https://images.unsplash.com/photo-1518659526054-18714b19385b?w=640&q=80&auto=format&fit=crop",
    },
    {
      id: "f5",
      name: "Luna P.",
      handle: "@lunapix",
      initials: "LP",
      accent: "from-sky-300 to-indigo-500",
      status: "home",
      destination: "Barcelona",
      neighborhood: "Gràcia",
      startDate: isoOffset(45),
      endDate: isoOffset(59),
      note: "En casa por ahora. Próximo: Barcelona en septiembre.",
      coverUrl:
        "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=640&q=80&auto=format&fit=crop",
    },
    {
      id: "f6",
      name: "Mateo K.",
      handle: "@mateok",
      initials: "MK",
      accent: "from-fuchsia-400 to-purple-700",
      status: "traveling",
      destination: "Tokio",
      neighborhood: "Shibuya",
      startDate: isoOffset(-10),
      endDate: isoOffset(5),
      note: "Konbini runs a las 2am 🍜",
      coverUrl:
        "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=640&q=80&auto=format&fit=crop",
    },
  ];

  return friends.map((f) => {
    let dayLabel = tripDateLabel(f.startDate, f.endDate);
    if (f.status === "traveling") {
      const start = new Date(f.startDate + "T12:00:00");
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const dayNum = Math.max(1, Math.floor((today.getTime() - start.getTime()) / 86400000) + 1);
      dayLabel = `Día ${dayNum} · ${tripDateLabel(f.startDate, f.endDate)}`;
    } else if (f.status === "upcoming" || f.status === "home") {
      const start = new Date(f.startDate + "T12:00:00");
      const today = new Date();
      today.setHours(12, 0, 0, 0);
      const days = Math.ceil((start.getTime() - today.getTime()) / 86400000);
      dayLabel =
        days <= 0
          ? tripDateLabel(f.startDate, f.endDate)
          : `en ${days} día${days === 1 ? "" : "s"} · ${tripDateLabel(f.startDate, f.endDate)}`;
    }
    return { ...f, dayLabel };
  });
}

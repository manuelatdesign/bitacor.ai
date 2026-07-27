import { useMemo, useState, type ReactElement } from "react";
import { Users, MapPin, Plane, Home, Radio } from "lucide-react";
import { motion } from "motion/react";
import { flagForDestination } from "../lib/destinationFlag";
import {
  getFriendsFeed,
  type FriendTrip,
  type FriendTripStatus,
} from "../data/friendsFeed";

type FeedFilter = "all" | FriendTripStatus;

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "traveling", label: "En viaje" },
  { id: "upcoming", label: "Próximos" },
  { id: "home", label: "En casa" },
];

function statusMeta(status: FriendTripStatus) {
  if (status === "traveling") {
    return {
      label: "En viaje",
      icon: Radio,
      className:
        "bg-teal-500/15 text-teal-800 dark:text-teal-300 border-teal-500/25",
      live: true,
    };
  }
  if (status === "upcoming") {
    return {
      label: "Próximo viaje",
      icon: Plane,
      className:
        "bg-[#240046]/10 dark:bg-white/10 text-[#240046] dark:text-white/80 border-[#240046]/15 dark:border-white/15",
      live: false,
    };
  }
  return {
    label: "En casa",
    icon: Home,
    className:
      "bg-white/30 dark:bg-white/5 text-[#240046]/70 dark:text-white/55 border-white/40 dark:border-white/10",
    live: false,
  };
}

function FriendCard({ friend, index }: { friend: FriendTrip; index: number }): ReactElement {
  const meta = statusMeta(friend.status);
  const StatusIcon = meta.icon;
  const flag = flagForDestination(friend.destination);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className="group relative overflow-hidden rounded-[1.5rem] border border-white/40 dark:border-white/10 bg-white/20 dark:bg-[#0f172a]/35 backdrop-blur-[24px] shadow-sm hover:bg-white/30 dark:hover:bg-[#0f172a]/50 transition-colors"
    >
      <div className="relative h-28 sm:h-32 overflow-hidden">
        <img
          src={friend.coverUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#240046]/70 via-[#240046]/20 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${friend.accent} text-white text-[11px] font-mono font-bold flex items-center justify-center shrink-0 ring-2 ring-white/40 shadow-md`}
            >
              {friend.initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate leading-tight">
                {friend.name}
              </p>
              <p className="text-[10px] font-mono text-white/70 truncate">
                {friend.handle}
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase tracking-wider border backdrop-blur-md ${meta.className} bg-white/80 dark:bg-[#0f172a]/70`}
          >
            {meta.live && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-teal-500" />
              </span>
            )}
            <StatusIcon className="w-2.5 h-2.5" />
            {meta.label}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2.5">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 mt-0.5 text-[#240046]/45 dark:text-white/40 shrink-0" />
          <div className="min-w-0">
            <p className="font-display font-light text-lg tracking-tight leading-snug">
              {flag} {friend.destination}
              {friend.neighborhood ? (
                <span className="text-[#240046]/50 dark:text-white/40 text-sm font-sans font-light">
                  {" "}
                  · {friend.neighborhood}
                </span>
              ) : null}
            </p>
            <p className="text-[10px] font-mono tracking-wide text-[#240046]/55 dark:text-white/45 mt-0.5 uppercase">
              {friend.dayLabel}
            </p>
          </div>
        </div>
        <p className="text-xs font-light text-[#240046]/75 dark:text-white/60 leading-relaxed pl-6">
          {friend.note}
        </p>
      </div>
    </motion.article>
  );
}

export default function FriendsFeedView() {
  const friends = useMemo(() => getFriendsFeed(), []);
  const [filter, setFilter] = useState<FeedFilter>("all");

  const travelingCount = friends.filter((f) => f.status === "traveling").length;
  const upcomingCount = friends.filter((f) => f.status === "upcoming").length;

  const visible = friends.filter((f) => (filter === "all" ? true : f.status === filter));

  return (
    <div className="w-full flex flex-col gap-6 animate-fade-in text-[#240046] dark:text-[#e2e8f0] relative z-10 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <span className="font-mono text-[9px] tracking-[0.12em] text-[#240046]/50 dark:text-white/40 uppercase font-bold">
            Crew check-in 👀
          </span>
          <h1 className="font-display font-extralight text-3xl sm:text-4xl tracking-tight mt-0.5">
            Amigos
          </h1>
          <p className="text-xs font-light text-[#240046]/65 dark:text-white/50 mt-1 max-w-md">
            Dónde anda tu gente: quién está en viaje ahora y cuál es el próximo destino.
          </p>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/40 dark:border-white/10 bg-white/15 dark:bg-[#0f172a]/30 backdrop-blur-[24px] px-4 py-3.5 flex flex-wrap items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-teal-500/15 border border-teal-500/25 flex items-center justify-center">
            <Radio className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#240046]/45 dark:text-white/40">
              En vivo
            </p>
            <p className="text-sm font-medium">
              {travelingCount} amigo{travelingCount === 1 ? "" : "s"} viajando
            </p>
          </div>
        </div>
        <div className="hidden sm:block w-px h-8 bg-[#240046]/10 dark:bg-white/10" />
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-[#240046]/8 dark:bg-white/10 border border-[#240046]/10 dark:border-white/10 flex items-center justify-center">
            <Plane className="w-4 h-4 text-[#240046]/70 dark:text-white/70" />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#240046]/45 dark:text-white/40">
              Próximos
            </p>
            <p className="text-sm font-medium">
              {upcomingCount} salida{upcomingCount === 1 ? "" : "s"} planeada
              {upcomingCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <p className="w-full sm:w-auto sm:ml-auto text-[10px] font-mono text-[#240046]/40 dark:text-white/35 uppercase tracking-wider">
          Demo feed · sin backend aún
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer border ${
              filter === f.id
                ? "bg-[#240046] text-white border-[#240046] dark:bg-[#ed93af] dark:text-[#240046] dark:border-[#ed93af] font-bold"
                : "bg-white/10 dark:bg-white/5 border-white/30 dark:border-white/10 text-[#240046]/70 dark:text-white/60 hover:bg-white/25"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-[#240046]/20 dark:border-white/15 bg-white/10 px-6 py-16 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#240046]/8 dark:bg-white/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-[#240046]/50 dark:text-white/45" />
          </div>
          <p className="text-sm font-light text-[#240046]/70 dark:text-white/55 max-w-sm">
            Nadie en este filtro por ahora. Prueba “Todos” o “En viaje”.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((friend, idx) => (
            <div key={friend.id}>
              <FriendCard friend={friend} index={idx} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

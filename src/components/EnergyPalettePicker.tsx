import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, Moon, Sun } from "lucide-react";

export interface EnergyProfile {
  energy: number; // 0–100
  label: string;
  badge: string;
  desc: string;
  workHours: string;
  exploreHours: string;
  energyLevel: string;
  color: string;
  pace: string; // value stored in TravelConfig.pace
}

function energyHue(energy: number): number {
  return 175 - (energy / 100) * 150; // teal → rose
}

/** Resolve a 0–100 energy value into traveler profile copy + colors */
export function resolveEnergyProfile(energy: number): EnergyProfile {
  const e = Math.max(0, Math.min(100, Math.round(energy)));

  const hue = energyHue(e);
  const color = `hsl(${hue} 72% 38%)`;

  const workMin = Math.round(8 - (e / 100) * 5);
  const workMax = Math.max(workMin, Math.round(9 - (e / 100) * 5));
  const exploreHrs = Math.round(1 + (e / 100) * 7);

  let label: string;
  let badge: string;
  let desc: string;
  let energyLevel: string;
  let paceKeyword: string;

  if (e < 12) {
    label = "Zen Absoluto";
    badge = "Silencio Total";
    desc = "Deep work largo, un café de confianza y una caminata corta al atardecer.";
    energyLevel = "Muy baja";
    paceKeyword = "Paso Lento";
  } else if (e < 25) {
    label = "Deep Focus";
    badge = "Modo Monje";
    desc = "Productividad serena: pocas salidas, destino en dosis cortas.";
    energyLevel = "Baja";
    paceKeyword = "Paso Lento";
  } else if (e < 38) {
    label = "Calma Creativa";
    badge = "Flujo Suave";
    desc = "Cowork tranquilo en la mañana + una exploración ligera al día.";
    energyLevel = "Baja-media";
    paceKeyword = "Paso Lento";
  } else if (e < 50) {
    label = "Equilibrio Suave";
    badge = "Balance Ligero";
    desc = "Mitad work, mitad discovery — sin quemar la batería social.";
    energyLevel = "Media-baja";
    paceKeyword = "Paso Moderado";
  } else if (e < 62) {
    label = "Híbrido Equilibrado";
    badge = "Nómada Clásico";
    desc = "Work sólido de mañana; tarde para barrio, gente o naturaleza.";
    energyLevel = "Media";
    paceKeyword = "Paso Moderado";
  } else if (e < 74) {
    label = "Nómada Activo";
    badge = "Curioso Constante";
    desc = "Varias paradas al día, networking light y bloques de work más cortos.";
    energyLevel = "Media-alta";
    paceKeyword = "Paso Moderado";
  } else if (e < 86) {
    label = "Explorador";
    badge = "Aventura Diurna";
    desc = "El destino manda: miradores, barrios y work en sprints cortos.";
    energyLevel = "Alta";
    paceKeyword = "Paso Intenso";
  } else {
    label = "Máxima Intensidad";
    badge = "Full On";
    desc = "Agenda packed: rutas, vida local, networking. Work en huecos precisos.";
    energyLevel = "Máxima";
    paceKeyword = "Paso Intenso";
  }

  return {
    energy: e,
    label,
    badge,
    desc,
    workHours: `${workMin}–${workMax} h/día`,
    exploreHours: `${exploreHrs} h/día`,
    energyLevel,
    color,
    pace: `${paceKeyword} · ${label} (${e})`,
  };
}

/** Parse stored pace string back to 0–100 (supports legacy 3-step labels). */
export function parseEnergyFromPace(pace: string): number {
  if (!pace) return 50;
  const num = pace.match(/\((\d{1,3})\)/);
  if (num) return Math.max(0, Math.min(100, parseInt(num[1], 10)));
  const lower = pace.toLowerCase();
  if (lower.includes("lento") || lower.includes("deep focus") || lower.includes("zen")) return 20;
  if (lower.includes("intenso") || lower.includes("explorador")) return 82;
  if (lower.includes("moderado") || lower.includes("equilibr")) return 55;
  return 50;
}

interface EnergyPalettePickerProps {
  value: string;
  onChange: (pace: string) => void;
}

export default function EnergyPalettePicker({ value, onChange }: EnergyPalettePickerProps) {
  const energy = parseEnergyFromPace(value);
  const profile = useMemo(() => resolveEnergyProfile(energy), [energy]);

  const [isDark, setIsDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const sync = () => setIsDark(document.documentElement.classList.contains("dark"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const accent = useMemo(() => {
    const hue = energyHue(profile.energy);
    return isDark ? `hsl(${hue} 70% 62%)` : profile.color;
  }, [isDark, profile.color, profile.energy]);

  const commitEnergy = useCallback(
    (next: number) => {
      onChange(resolveEnergyProfile(next).pace);
    },
    [onChange]
  );

  useEffect(() => {
    if (!value || value.includes("Pendiente")) {
      commitEnergy(50);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const Icon = energy < 38 ? Moon : energy < 74 ? Sun : Flame;

  const labelActive = (zone: "calma" | "equilibrio" | "exploracion") => {
    if (zone === "calma") return energy < 38;
    if (zone === "equilibrio") return energy >= 38 && energy < 74;
    return energy >= 74;
  };

  return (
    <div
      className="border rounded-[1.5rem] p-4 sm:p-5 flex flex-col gap-4 transition-all duration-500 text-[#240046] dark:text-[#e2e8f0]"
      style={{
        backgroundColor: isDark
          ? `color-mix(in srgb, ${profile.color} 28%, #16122a)`
          : `color-mix(in srgb, ${profile.color} 14%, white)`,
        borderColor: isDark
          ? `color-mix(in srgb, ${accent} 35%, transparent)`
          : `color-mix(in srgb, ${profile.color} 40%, transparent)`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2.5 rounded-full bg-white dark:bg-white/10 shadow-sm dark:shadow-none border border-transparent dark:border-white/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" style={{ color: accent }} />
          </div>
          <div className="min-w-0">
            <span className="text-[8px] font-mono uppercase tracking-[0.15em] text-[#240046]/50 dark:text-white/45 block">
              MODO VIAJERO
            </span>
            <h3 className="font-display text-lg sm:text-xl font-light truncate" style={{ color: accent }}>
              {profile.label}
            </h3>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full bg-white/80 dark:bg-white/10 text-[10px] font-mono font-bold text-[#240046] dark:text-white/85 border border-white dark:border-white/15 shadow-sm dark:shadow-none shrink-0">
          {profile.badge}
        </span>
      </div>

      <p className="text-xs font-light text-[#240046]/80 dark:text-white/70 leading-relaxed">
        {profile.desc}
      </p>

      {/* Hero continuum slider */}
      <div className="flex flex-col gap-3 py-2">
        <div className="flex justify-between items-end px-0.5">
          {(
            [
              { id: "calma" as const, label: "Calma" },
              { id: "equilibrio" as const, label: "Equilibrio" },
              { id: "exploracion" as const, label: "Exploración" },
            ]
          ).map((zone) => {
            const active = labelActive(zone.id);
            return (
              <span
                key={zone.id}
                className={`font-mono uppercase tracking-[0.12em] transition-all duration-300 ${
                  active
                    ? "text-[11px] font-bold"
                    : "text-[9px] font-medium text-[#240046]/40 dark:text-white/35"
                }`}
                style={active ? { color: accent } : undefined}
              >
                {zone.label}
              </span>
            );
          })}
        </div>

        <div
          className="relative h-5 sm:h-6 rounded-full overflow-visible border border-white/50 dark:border-white/15 shadow-[inset_0_1px_4px_rgba(36,0,70,0.12)] dark:shadow-[inset_0_1px_4px_rgba(0,0,0,0.35)]"
          style={{
            background:
              "linear-gradient(90deg, #0d9488 0%, #14b8a6 18%, #d97706 50%, #f43f5e 82%, #be123c 100%)",
          }}
        >
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={profile.energy}
            onChange={(e) => commitEnergy(parseInt(e.target.value, 10))}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                e.preventDefault();
                commitEnergy(Math.min(100, energy + 2));
              } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                e.preventDefault();
                commitEnergy(Math.max(0, energy - 2));
              }
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            id="pace-energy-slider"
            aria-label="Nivel de energía: calma a exploración"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={profile.energy}
          />

          <div
            className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full pointer-events-none z-0 blur-md opacity-50"
            style={{
              left: `calc(${profile.energy}% - 16px)`,
              backgroundColor: accent,
            }}
          />

          <div
            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white dark:bg-[#1e1a2e] border-2 pointer-events-none z-10 transition-[left] duration-75"
            style={{
              left: `calc(${profile.energy}% - 12px)`,
              borderColor: accent,
              boxShadow: isDark
                ? `0 2px 10px rgba(0,0,0,0.45), 0 0 0 3px ${accent}40`
                : `0 2px 10px rgba(36,0,70,0.25), 0 0 0 3px ${profile.color}33`,
            }}
          />
        </div>

        <div className="flex justify-center">
          <span
            className="font-mono text-[10px] font-bold tabular-nums tracking-wider px-2.5 py-1 rounded-full bg-white/80 dark:bg-white/10 border border-white dark:border-white/15 shadow-sm dark:shadow-none"
            style={{ color: accent }}
          >
            {profile.energy} / 100
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "Energía", value: `${profile.energy}` },
          { label: "Trabajo", value: profile.workHours.replace(" h/día", "") },
          { label: "Explorar", value: profile.exploreHours.replace(" h/día", "") },
          { label: "Vibra", value: profile.energyLevel },
        ].map((field) => (
          <div
            key={field.label}
            className="rounded-lg bg-white/55 dark:bg-white/8 border border-white/40 dark:border-white/12 px-1.5 py-1.5 text-center min-w-0"
          >
            <div
              className="text-[11px] font-sans font-semibold tabular-nums truncate"
              style={{ color: accent }}
              title={field.value}
            >
              {field.value}
            </div>
            <div className="text-[8px] font-mono uppercase tracking-wider text-[#240046]/45 dark:text-white/45 mt-0.5">
              {field.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

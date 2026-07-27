import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  PlaneLanding,
  PlaneTakeoff,
  X,
} from "lucide-react";
import CustomTimePicker from "./CustomTimePicker";

interface DateRangePickerProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  startTime?: string;
  endTime?: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
  onStartTimeChange: (val: string) => void;
  onEndTimeChange: (val: string) => void;
  daysCount?: number;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DAYS_OF_WEEK = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

function parseYmd(value: string): Date | null {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function formatYmd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDisplay(value: string): string {
  const d = parseYmd(value);
  if (!d) return "";
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

function toKey(y: number, m: number, day: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function DateRangePicker({
  startDate,
  endDate,
  startTime = "",
  endTime = "",
  onStartDateChange,
  onEndDateChange,
  onStartTimeChange,
  onEndTimeChange,
  daysCount = 0,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [showTimes, setShowTimes] = useState(Boolean(startTime || endTime));
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 320 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const initial = parseYmd(startDate) || new Date();
  const [currentMonth, setCurrentMonth] = useState(initial.getMonth());
  const [currentYear, setCurrentYear] = useState(initial.getFullYear());

  useEffect(() => {
    const d = parseYmd(startDate) || parseYmd(endDate);
    if (d) {
      setCurrentMonth(d.getMonth());
      setCurrentYear(d.getFullYear());
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!open) return;
    const updatePos = () => {
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.min(360, Math.max(300, rect.width));
      let left = rect.left;
      if (left + width > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - width - 12);
      }
      setPanelPos({
        top: rect.bottom + 8 + window.scrollY,
        left: left + window.scrollX,
        width,
      });
    };
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const todayKey = useMemo(() => formatYmd(new Date()), []);

  const handleDayClick = (day: number) => {
    const key = toKey(currentYear, currentMonth, day);
    if (key < todayKey) return;

    if (selecting === "start" || !startDate || (startDate && endDate)) {
      onStartDateChange(key);
      onEndDateChange("");
      setSelecting("end");
      return;
    }

    // selecting end
    if (key < startDate) {
      onStartDateChange(key);
      onEndDateChange("");
      setSelecting("end");
      return;
    }

    onEndDateChange(key);
    setSelecting("start");
    setOpen(false);
  };

  const openFor = (which: "start" | "end") => {
    if (which === "end" && !startDate) {
      setSelecting("start");
    } else {
      setSelecting(which);
    }
    setOpen(true);
  };

  const clearRange = () => {
    onStartDateChange("");
    onEndDateChange("");
    onStartTimeChange("");
    onEndTimeChange("");
    setSelecting("start");
  };

  const cells: ReactNode[] = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`e-${i}`} className="h-9" />);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const key = toKey(currentYear, currentMonth, d);
    const disabled = key < todayKey;
    const isStart = key === startDate;
    const isEnd = key === endDate;
    const inRange =
      !!startDate &&
      !!endDate &&
      key > startDate &&
      key < endDate;

    let cls =
      "relative h-9 w-full flex items-center justify-center text-xs font-sans transition-all ";

    if (disabled) {
      cls += "text-[#240046]/25 dark:text-white/20 cursor-not-allowed";
    } else if (isStart || isEnd) {
      cls += "bg-[#240046] text-white font-bold dark:bg-[#ed93af] dark:text-[#240046] z-[1]";
      if (isStart && endDate) cls += " rounded-l-lg";
      else if (isEnd && startDate) cls += " rounded-r-lg";
      else cls += " rounded-lg";
    } else if (inRange) {
      cls += "bg-[#240046]/12 dark:bg-[#ed93af]/20 text-[#240046] dark:text-white cursor-pointer";
    } else {
      cls +=
        "text-[#240046] dark:text-white/85 hover:bg-[#240046]/10 dark:hover:bg-white/10 rounded-lg cursor-pointer";
    }

    cells.push(
      <button
        key={key}
        type="button"
        disabled={disabled}
        onClick={() => handleDayClick(d)}
        className={cls}
      >
        {d}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Airline-style split field */}
      <div
        ref={triggerRef}
        className="grid grid-cols-2 rounded-2xl border border-[#240046]/15 dark:border-white/15 bg-white/70 dark:bg-white/5 backdrop-blur-sm overflow-hidden shadow-sm"
      >
        <button
          type="button"
          onClick={() => openFor("start")}
          className={`text-left px-4 py-3.5 border-r border-[#240046]/10 dark:border-white/10 transition-colors cursor-pointer ${
            open && selecting === "start" ? "bg-[#240046]/5 dark:bg-white/10" : "hover:bg-[#240046]/5 dark:hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.12em] uppercase text-[#240046]/50 dark:text-white/40 font-bold mb-1">
            <PlaneLanding className="w-3 h-3" />
            Ida / Llegada
          </div>
          <div
            className={`text-sm font-medium truncate ${
              startDate ? "text-[#240046] dark:text-[#e2e8f0]" : "text-[#240046]/35 dark:text-white/30"
            }`}
          >
            {startDate ? formatDisplay(startDate) : "Elegir fecha"}
          </div>
          {showTimes && startTime && (
            <div className="text-[10px] font-mono text-[#240046]/50 dark:text-white/40 mt-0.5">{startTime}</div>
          )}
        </button>

        <button
          type="button"
          onClick={() => openFor("end")}
          className={`text-left px-4 py-3.5 transition-colors cursor-pointer ${
            open && selecting === "end" ? "bg-[#240046]/5 dark:bg-white/10" : "hover:bg-[#240046]/5 dark:hover:bg-white/5"
          }`}
        >
          <div className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.12em] uppercase text-[#240046]/50 dark:text-white/40 font-bold mb-1">
            <PlaneTakeoff className="w-3 h-3" />
            Regreso
          </div>
          <div
            className={`text-sm font-medium truncate ${
              endDate ? "text-[#240046] dark:text-[#e2e8f0]" : "text-[#240046]/35 dark:text-white/30"
            }`}
          >
            {endDate ? formatDisplay(endDate) : "Elegir fecha"}
          </div>
          {showTimes && endTime && (
            <div className="text-[10px] font-mono text-[#240046]/50 dark:text-white/40 mt-0.5">{endTime}</div>
          )}
        </button>
      </div>

      {(startDate || endDate) && (
        <div className="flex items-center justify-between gap-2 px-1">
          <p className="text-[11px] font-sans font-light text-[#240046]/60 dark:text-white/50">
            {daysCount > 0
              ? `${daysCount} día${daysCount === 1 ? "" : "s"} de viaje`
              : selecting === "end"
                ? "Ahora elige la fecha de regreso"
                : "Rango incompleto"}
          </p>
          <button
            type="button"
            onClick={clearRange}
            className="text-[10px] font-mono uppercase tracking-wider text-[#240046]/45 dark:text-white/40 hover:text-[#240046] dark:hover:text-white cursor-pointer"
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Optional times */}
      <div className="rounded-2xl border border-dashed border-[#240046]/15 dark:border-white/15 px-3.5 py-3">
        <button
          type="button"
          onClick={() => {
            const next = !showTimes;
            setShowTimes(next);
            if (!next) {
              onStartTimeChange("");
              onEndTimeChange("");
            }
          }}
          className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wider text-[#240046]/70 dark:text-white/60 cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5" />
          {showTimes ? "Ocultar horarios" : "Agregar hora (opcional)"}
        </button>

        {showTimes && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-mono uppercase tracking-wider text-[#240046]/45 dark:text-white/35">
                Hora de llegada
              </label>
              <CustomTimePicker
                value={startTime}
                onChange={onStartTimeChange}
                placeholder="Opcional"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-mono uppercase tracking-wider text-[#240046]/45 dark:text-white/35">
                Hora de regreso
              </label>
              <CustomTimePicker
                value={endTime}
                onChange={onEndTimeChange}
                placeholder="Opcional"
              />
            </div>
          </div>
        )}
      </div>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "absolute",
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
            }}
            className="z-[200] bg-white/95 dark:bg-[#0f172a]/98 backdrop-blur-md rounded-2xl border border-[#240046]/10 dark:border-white/15 p-4 shadow-2xl animate-fade-in"
          >
            <div className="flex items-center justify-between mb-3 border-b border-[#240046]/5 dark:border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-[#ed93af]" />
                <span className="font-sans font-semibold text-xs text-[#240046] dark:text-[#e2e8f0]">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="hidden sm:inline font-mono text-[8px] uppercase tracking-wider text-[#240046]/40 dark:text-white/35 mr-2">
                  {selecting === "start" ? "Elige ida" : "Elige regreso"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (currentMonth === 0) {
                      setCurrentMonth(11);
                      setCurrentYear((y) => y - 1);
                    } else setCurrentMonth((m) => m - 1);
                  }}
                  className="p-1 rounded-lg hover:bg-[#240046]/5 dark:hover:bg-white/5 text-[#240046] dark:text-white/70 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (currentMonth === 11) {
                      setCurrentMonth(0);
                      setCurrentYear((y) => y + 1);
                    } else setCurrentMonth((m) => m + 1);
                  }}
                  className="p-1 rounded-lg hover:bg-[#240046]/5 dark:hover:bg-white/5 text-[#240046] dark:text-white/70 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg hover:bg-[#240046]/5 dark:hover:bg-white/5 text-[#240046]/50 dark:text-white/40 cursor-pointer ml-0.5"
                  aria-label="Cerrar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-0 text-center mb-1">
              {DAYS_OF_WEEK.map((d) => (
                <span
                  key={d}
                  className="font-mono text-[9px] font-bold text-[#240046]/45 dark:text-white/35 uppercase py-1"
                >
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5">{cells}</div>

            <p className="mt-3 text-[10px] font-light text-[#240046]/50 dark:text-white/40 text-center">
              Toca la fecha de ida y luego la de regreso
            </p>
          </div>,
          document.body
        )}
    </div>
  );
}

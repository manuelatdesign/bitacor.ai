import React, { useState, useRef, useEffect } from "react";
import { Clock, Check } from "lucide-react";

interface CustomTimePickerProps {
  value: string; // HH:MM format
  onChange: (val: string) => void;
  placeholder?: string;
}

export default function CustomTimePicker({
  value,
  onChange,
  placeholder = "Seleccionar hora"
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse hour and minute from value
  const parts = value ? value.split(":") : [];
  const currentHour = parts[0] || "10";
  const currentMin = parts[1] || "00";

  // Quick select presets
  const presets = [
    { label: "Mañana", time: "09:00" },
    { label: "Mediodía", time: "13:00" },
    { label: "Tarde", time: "17:00" },
    { label: "Noche", time: "21:00" }
  ];

  const hoursList = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const minutesList = ["00", "15", "30", "45"];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handlePresetSelect = (timeStr: string) => {
    onChange(timeStr);
    setIsOpen(false);
  };

  const handleHourSelect = (h: string) => {
    onChange(`${h}:${currentMin}`);
  };

  const handleMinSelect = (m: string) => {
    onChange(`${currentHour}:${m}`);
  };

  const getFormattedValue = () => {
    if (!value) return "";
    const [h, m] = value.split(":");
    const hourNum = parseInt(h);
    const ampm = hourNum >= 12 ? "PM" : "AM";
    const displayHour = hourNum % 12 || 12;
    return `${displayHour}:${m} ${ampm}`;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/70 dark:bg-white/10 backdrop-blur-sm border border-[#240046]/15 dark:border-white/15 rounded-xl pl-9 pr-3 py-2.5 text-xs font-sans text-[#240046] dark:text-[#e2e8f0] text-left outline-none transition-all duration-300 focus:bg-white dark:focus:bg-white/15 focus:border-[#240046] dark:focus:border-white/40 focus:ring-4 focus:ring-[#240046]/5 shadow-sm flex items-center justify-between min-h-[40px]"
        type="button"
      >
        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#240046]/40 dark:text-white/40 pointer-events-none" />
        <span className={`min-w-0 truncate whitespace-nowrap ${getFormattedValue() ? "text-[#240046] dark:text-[#e2e8f0] font-medium" : "text-[#240046]/40 dark:text-white/35"}`}>
          {getFormattedValue() || placeholder}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-[110%] left-0 z-50 mt-1 w-64 max-h-[min(320px,70vh)] overflow-hidden bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md rounded-2xl border border-[#240046]/10 dark:border-white/10 p-3.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col gap-3">
          
          {/* Presets row */}
          <div className="grid grid-cols-4 gap-1 shrink-0">
            {presets.map(p => {
              const isSelected = value === p.time;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handlePresetSelect(p.time)}
                  className={`py-1 text-[10px] font-medium font-sans rounded-lg transition-all duration-200 ${
                    isSelected
                      ? "bg-[#240046] text-white shadow-sm dark:bg-indigo-600"
                      : "bg-[#240046]/5 hover:bg-[#240046]/10 text-[#240046] dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-200"
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[#240046]/5 dark:border-white/5 my-0.5 shrink-0"></div>

          {/* Core selection list — min-h-0 so overflow-y scrolls instead of spilling */}
          <div className="grid grid-cols-2 gap-3 h-36 min-h-0 shrink">
            
            {/* Hours column */}
            <div className="flex flex-col gap-0.5 min-h-0 h-full overflow-hidden">
              <span className="text-[9px] font-mono font-bold text-[#240046]/55 dark:text-slate-400 uppercase text-center mb-1 shrink-0">
                Hora
              </span>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1 flex flex-col gap-0.5">
                {hoursList.map(h => {
                  const isSelected = value ? currentHour === h : false;
                  const displayNum = parseInt(h);
                  const suffix = displayNum >= 12 ? "PM" : "AM";
                  const displayHour = displayNum % 12 || 12;
                  
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleHourSelect(h)}
                      className={`py-1 text-center font-sans text-xs rounded-md transition-all shrink-0 ${
                        isSelected
                          ? "bg-[#240046] text-white font-semibold dark:bg-indigo-600"
                          : "text-[#240046]/80 hover:bg-[#240046]/5 dark:text-slate-200 dark:hover:bg-white/5"
                      }`}
                    >
                      {displayHour} {suffix}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Minutes column */}
            <div className="flex flex-col gap-0.5 min-h-0 h-full overflow-hidden">
              <span className="text-[9px] font-mono font-bold text-[#240046]/55 dark:text-slate-400 uppercase text-center mb-1 shrink-0">
                Minuto
              </span>
              <div className="min-h-0 flex-1 overflow-y-auto flex flex-col gap-1 justify-center">
                {minutesList.map(m => {
                  const isSelected = value ? currentMin === m : false;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleMinSelect(m)}
                      className={`py-1.5 text-center font-sans text-xs rounded-md transition-all shrink-0 ${
                        isSelected
                          ? "bg-[#240046]/90 text-white font-semibold dark:bg-indigo-500"
                          : "text-[#240046]/80 hover:bg-[#240046]/5 dark:text-slate-200 dark:hover:bg-white/5"
                      }`}
                    >
                      {m} m
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full mt-1 shrink-0 bg-[#240046]/10 hover:bg-[#240046]/20 text-[#240046] font-sans font-semibold text-[10px] uppercase py-1.5 rounded-lg transition-colors dark:bg-white/5 dark:hover:bg-white/10 dark:text-slate-200"
          >
            Aceptar
          </button>
        </div>
      )}
    </div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD format
  onChange: (val: string) => void;
  minDate?: string; // YYYY-MM-DD format
  placeholder?: string;
}

export default function CustomDatePicker({
  value,
  onChange,
  minDate,
  placeholder = "Seleccionar fecha"
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse initial date or default to today
  const getInitialDate = () => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      }
    }
    return new Date();
  };

  const initialDate = getInitialDate();
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  const containerRef = useRef<HTMLDivElement>(null);

  // Close calendar when clicking outside
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

  // Sync year and month with external value updates
  useEffect(() => {
    if (value) {
      const parts = value.split("-");
      if (parts.length === 3) {
        setCurrentMonth(parseInt(parts[1]) - 1);
        setCurrentYear(parseInt(parts[0]));
      }
    }
  }, [value]);

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const daysOfWeek = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];

  // Calendar calculations
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentMonth, currentYear);
  const firstDay = getFirstDayOfMonth(currentMonth, currentYear);

  // Navigate months
  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Check if date is before minDate
  const isDateDisabled = (day: number) => {
    if (!minDate) return false;
    
    const currentDate = new Date(currentYear, currentMonth, day);
    const parts = minDate.split("-");
    if (parts.length === 3) {
      const boundaryDate = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2])
      );
      // Strip time parts for correct comparison
      currentDate.setHours(0, 0, 0, 0);
      boundaryDate.setHours(0, 0, 0, 0);
      return currentDate < boundaryDate;
    }
    return false;
  };

  // Format date selection YYYY-MM-DD
  const handleDaySelect = (day: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDateDisabled(day)) return;

    const formattedMonth = String(currentMonth + 1).padStart(2, "0");
    const formattedDay = String(day).padStart(2, "0");
    const selectedDateStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
    onChange(selectedDateStr);
    setIsOpen(false);
  };

  // Format current value for display "15 Jul 2026"
  const getFormattedValue = () => {
    if (!value) return "";
    const parts = value.split("-");
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const day = d.getDate();
      const monthLabel = monthNames[d.getMonth()].slice(0, 3);
      const year = d.getFullYear();
      return `${day} ${monthLabel}, ${year}`;
    }
    return value;
  };

  // Build calendar days array
  const renderDays = () => {
    const cells = [];
    
    // Empty cells for alignment
    for (let i = 0; i < firstDay; i++) {
      cells.push(
        <div key={`empty-${i}`} className="w-8 h-8 flex items-center justify-center text-transparent text-xs" />
      );
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const isDisabled = isDateDisabled(d);
      
      const formattedMonth = String(currentMonth + 1).padStart(2, "0");
      const formattedDay = String(d).padStart(2, "0");
      const checkStr = `${currentYear}-${formattedMonth}-${formattedDay}`;
      const isSelected = value === checkStr;

      let btnClasses = "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-sans transition-all duration-200 ";
      
      if (isSelected) {
        btnClasses += "bg-[#240046] text-white font-bold shadow-md scale-105 dark:bg-indigo-600";
      } else if (isDisabled) {
        btnClasses += "text-gray-300 dark:text-slate-600 cursor-not-allowed pointer-events-none";
      } else {
        btnClasses += "text-[#240046] dark:text-slate-200 hover:bg-[#240046]/10 hover:text-[#240046] dark:hover:bg-indigo-500/20 dark:hover:text-indigo-200 cursor-pointer";
      }

      cells.push(
        <button
          key={`day-${d}`}
          onClick={(e) => handleDaySelect(d, e)}
          disabled={isDisabled}
          className={btnClasses}
          type="button"
        >
          {d}
        </button>
      );
    }

    return cells;
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white/70 backdrop-blur-sm border border-[#240046]/15 rounded-xl pl-9 pr-3 py-2.5 text-xs font-sans text-[#240046] text-left outline-none transition-all duration-300 focus:bg-white focus:border-[#240046] focus:ring-4 focus:ring-[#240046]/5 hover:bg-white/90 hover:border-[#240046]/30 shadow-sm flex items-center justify-between min-h-[40px]"
        type="button"
      >
        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#240046]/40 pointer-events-none" />
        <span className={`min-w-0 truncate whitespace-nowrap ${getFormattedValue() ? "text-[#240046] font-medium" : "text-[#240046]/40"}`}>
          {getFormattedValue() || placeholder}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-[110%] left-0 z-50 mt-1 w-72 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md rounded-2xl border border-[#240046]/10 dark:border-white/10 p-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3 border-b border-[#240046]/5 dark:border-white/5 pb-2">
            <span className="font-sans font-semibold text-xs text-[#240046] dark:text-slate-200">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="p-1 rounded-lg hover:bg-[#240046]/5 dark:hover:bg-white/5 text-[#240046] dark:text-slate-300 transition-colors"
                type="button"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1 rounded-lg hover:bg-[#240046]/5 dark:hover:bg-white/5 text-[#240046] dark:text-slate-300 transition-colors"
                type="button"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
            {daysOfWeek.map(d => (
              <span key={d} className="font-mono text-[9px] font-bold text-[#240046]/55 dark:text-slate-400 uppercase">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {renderDays()}
          </div>
        </div>
      )}
    </div>
  );
}

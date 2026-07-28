import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { apiUrl } from "../lib/apiBase";

export interface PlaceSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface DestinationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  id?: string;
  placeholder?: string;
}

export default function DestinationAutocomplete({
  value,
  onChange,
  onSelect,
  id = "destination-input",
  placeholder = "Ej. Medellín, Kioto, Costa Rica, Ámsterdam...",
}: DestinationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const skipFetchRef = useRef(false);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }

    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/places/autocomplete?q=${encodeURIComponent(q)}`));
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data.suggestions) ? data.suggestions : [];
        setSuggestions(list);
        setHighlight(0);
        setOpen(list.length > 0);
      } catch {
        if (!cancelled) {
          setSuggestions([]);
          setOpen(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  const pick = (s: PlaceSuggestion) => {
    const label = s.secondaryText ? `${s.mainText}, ${s.secondaryText}` : s.mainText;
    skipFetchRef.current = true;
    onSelect(label);
    setSuggestions([]);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full mt-1" ref={wrapRef}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const trimmed = value.trim();
          if (trimmed.length >= 2) onSelect(trimmed);
        }}
        onFocus={() => {
          if (suggestions.length > 0) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        className="w-full bg-transparent border-b border-[#240046]/25 dark:border-white/25 focus:border-[#240046] dark:focus:border-white focus:pl-3 pb-2 font-sans font-light text-base text-[#240046] dark:text-[#e2e8f0] placeholder-[#240046]/40 dark:placeholder-white/35 outline-none transition-all duration-300"
        placeholder={placeholder}
        id={id}
      />
      <span className="absolute right-2 top-1.5 text-[#240046]/30 dark:text-white/30">
        {loading ? (
          <Loader2 className="w-4.5 h-4.5 animate-spin" />
        ) : (
          <MapPin className="w-4.5 h-4.5" />
        )}
      </span>

      {open && suggestions.length > 0 && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-40 left-0 right-0 top-[calc(100%+6px)] max-h-56 overflow-y-auto rounded-2xl border border-[#240046]/10 dark:border-white/15 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl shadow-xl py-1.5 animate-fade-in"
        >
          {suggestions.map((s, idx) => (
            <li key={s.placeId}>
              <button
                type="button"
                role="option"
                aria-selected={idx === highlight}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlight(idx)}
                onClick={() => pick(s)}
                className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                  idx === highlight
                    ? "bg-[#240046]/8 dark:bg-white/10"
                    : "hover:bg-[#240046]/5 dark:hover:bg-white/5"
                }`}
              >
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[#ed93af]" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-[#240046] dark:text-[#e2e8f0] truncate">
                    {s.mainText}
                  </span>
                  {s.secondaryText && (
                    <span className="block text-[11px] font-light text-[#240046]/55 dark:text-white/45 truncate">
                      {s.secondaryText}
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

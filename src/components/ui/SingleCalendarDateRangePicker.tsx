import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export interface SingleCalendarDateRangePickerProps {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  onChange: (from: string, to: string) => void;
  className?: string;
  placeholder?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function formatIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toDisplayDate(iso: string): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return iso;
}

import { autoScrollDropdownIntoView } from "../../lib/scrollUtils";

export function SingleCalendarDateRangePicker({
  dateFrom,
  dateTo,
  onChange,
  className = "",
  placeholder = "Select date range",
}: SingleCalendarDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse initial view month/year
  const initialDate = useMemo(() => {
    if (dateFrom) {
      const [y, m] = dateFrom.split("-").map(Number);
      if (y && m) return new Date(y, m - 1, 1);
    }
    return new Date();
  }, [dateFrom]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [hoverIso, setHoverIso] = useState<string | null>(null);

  // Sync view when dateFrom changes externally
  useEffect(() => {
    if (dateFrom) {
      const [y, m] = dateFrom.split("-").map(Number);
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [dateFrom]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setHoverIso(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Auto scroll if calendar popover is under the bottom of the screen
  useEffect(() => {
    if (isOpen) {
      const scrollTimer = setTimeout(() => {
        if (popoverRef.current) {
          autoScrollDropdownIntoView(popoverRef.current, { padding: 24 });
        }
      }, 60);
      return () => clearTimeout(scrollTimer);
    }
  }, [isOpen]);

  const prevMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  // Quick preset shortcuts
  const applyPreset = useCallback(
    (preset: "today" | "yesterday" | "7days" | "month") => {
      const now = new Date();
      if (preset === "today") {
        const t = formatIso(now);
        onChange(t, t);
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
      } else if (preset === "yesterday") {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        const y = formatIso(yest);
        onChange(y, y);
        setViewYear(yest.getFullYear());
        setViewMonth(yest.getMonth());
      } else if (preset === "7days") {
        const past = new Date(now);
        past.setDate(past.getDate() - 6);
        onChange(formatIso(past), formatIso(now));
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
      } else if (preset === "month") {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        onChange(formatIso(first), formatIso(now));
        setViewYear(now.getFullYear());
        setViewMonth(now.getMonth());
      }
      setHoverIso(null);
    },
    [onChange],
  );

  const handleDayClick = useCallback(
    (iso: string) => {
      if (!dateFrom || (dateFrom && dateTo)) {
        // Start new range
        onChange(iso, "");
      } else if (dateFrom && !dateTo) {
        // Finish range
        if (iso < dateFrom) {
          onChange(iso, dateFrom);
        } else {
          onChange(dateFrom, iso);
        }
        setHoverIso(null);
      }
    },
    [dateFrom, dateTo, onChange],
  );

  // Generate calendar grid days for viewMonth and viewYear
  const calendarDays = useMemo(() => {
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days = [];

    // Padding for days before start of month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(viewMonth + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      days.push(`${viewYear}-${mStr}-${dStr}`);
    }

    return days;
  }, [viewYear, viewMonth]);

  // Year options for quick select (10 years back, 2 years forward)
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years = [];
    for (let y = currentYear - 5; y <= currentYear + 2; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  // Formatted display text
  const displayText = useMemo(() => {
    if (dateFrom && dateTo) {
      return `${toDisplayDate(dateFrom)} to ${toDisplayDate(dateTo)}`;
    }
    if (dateFrom) {
      return `${toDisplayDate(dateFrom)} to ...`;
    }
    return "";
  }, [dateFrom, dateTo]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger input field */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        className="w-full min-h-11 rounded-[var(--radius-md)] border border-border bg-surface-elevated/85 px-3 py-2 text-sm text-text-heading shadow-sm outline-none transition-all flex items-center justify-between cursor-pointer hover:border-primary focus:border-primary focus:shadow-[var(--shadow-focus)]"
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarDaysIcon className="h-4 w-4 shrink-0 text-text-muted" />
          <span className={displayText ? "font-medium text-text-heading" : "text-text-muted"}>
            {displayText || placeholder}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("", "");
                setHoverIso(null);
              }}
              className="rounded p-1 text-text-muted hover:text-text hover:bg-surface transition-colors"
              title="Clear date range"
              aria-label="Clear date range"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Calendar Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{ scrollMarginBottom: 24 }}
          className="absolute left-0 top-full z-50 mt-1.5 w-[320px] sm:w-[340px] rounded-[var(--radius-lg)] border border-border bg-surface p-3.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Quick presets (Shown only when opened) */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-2.5">
            <button
              type="button"
              onClick={() => applyPreset("today")}
              className="rounded-[var(--radius-xs)] border border-border/80 bg-surface-elevated/70 px-2 py-1 text-xs font-medium text-text-muted hover:border-primary hover:text-primary transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset("yesterday")}
              className="rounded-[var(--radius-xs)] border border-border/80 bg-surface-elevated/70 px-2 py-1 text-xs font-medium text-text-muted hover:border-primary hover:text-primary transition-colors"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => applyPreset("7days")}
              className="rounded-[var(--radius-xs)] border border-border/80 bg-surface-elevated/70 px-2 py-1 text-xs font-medium text-text-muted hover:border-primary hover:text-primary transition-colors"
            >
              Last 7d
            </button>
            <button
              type="button"
              onClick={() => applyPreset("month")}
              className="rounded-[var(--radius-xs)] border border-border/80 bg-surface-elevated/70 px-2 py-1 text-xs font-medium text-text-muted hover:border-primary hover:text-primary transition-colors"
            >
              This Month
            </button>
          </div>

          {/* Month & Year Navigation Header */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={prevMonth}
              className="rounded-md p-1.5 text-text-muted hover:bg-surface-elevated hover:text-text transition-colors"
              title="Previous month"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1">
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="rounded border border-border/60 bg-transparent px-1.5 py-0.5 text-xs font-semibold text-text-heading outline-none cursor-pointer"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx} className="bg-surface text-text">
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="rounded border border-border/60 bg-transparent px-1.5 py-0.5 text-xs font-semibold text-text-heading outline-none cursor-pointer"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y} className="bg-surface text-text">
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="rounded-md p-1.5 text-text-muted hover:bg-surface-elevated hover:text-text transition-colors"
              title="Next month"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {DAY_NAMES.map((name) => (
              <span key={name} className="text-[11px] font-semibold text-text-muted">
                {name}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((iso, idx) => {
              if (!iso) {
                return <div key={`empty-${idx}`} className="h-8" />;
              }

              const dayNum = Number(iso.split("-")[2]);

              // Range checks
              const effectiveStart = dateFrom;
              const effectiveEnd =
                dateTo || (dateFrom && hoverIso ? (hoverIso >= dateFrom ? hoverIso : dateFrom) : "");
              const isStart = iso === dateFrom;
              const isEnd = iso === (dateTo || (!dateTo && hoverIso && hoverIso >= dateFrom ? hoverIso : ""));
              const isInRange =
                effectiveStart &&
                effectiveEnd &&
                iso >= effectiveStart &&
                iso <= effectiveEnd;

              let btnClass = "text-text hover:bg-surface-elevated";
              let wrapperClass = "";

              if (isInRange) {
                wrapperClass = "bg-primary-muted/50";
              }
              if (isStart) {
                wrapperClass += " rounded-l-md";
              }
              if (isEnd) {
                wrapperClass += " rounded-r-md";
              }
              if (isStart || isEnd) {
                btnClass = "bg-primary text-white hover:bg-primary font-bold shadow-xs";
              }

              return (
                <div key={iso} className={`h-8 flex items-center justify-center ${wrapperClass}`}>
                  <button
                    type="button"
                    onClick={() => handleDayClick(iso)}
                    onMouseEnter={() => {
                      if (dateFrom && !dateTo) {
                        setHoverIso(iso);
                      }
                    }}
                    className={`h-8 w-8 rounded-md text-xs transition-colors flex items-center justify-center ${btnClass}`}
                  >
                    {dayNum}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer with date status & Done button */}
          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
            <span className="text-[11px] text-text-muted truncate">
              {dateFrom && dateTo
                ? `${toDisplayDate(dateFrom)} – ${toDisplayDate(dateTo)}`
                : dateFrom
                  ? "Click end date"
                  : "Click start date"}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setHoverIso(null);
              }}
              className="rounded-[var(--radius-xs)] bg-primary px-3 py-1 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

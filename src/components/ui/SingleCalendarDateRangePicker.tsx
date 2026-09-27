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
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { cn } from "../../lib/utils";

export interface SingleCalendarDateRangePickerProps {
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  onChange: (from: string, to: string) => void;
  onReset?: () => void;
  granularity?: "day" | "month" | "year";
  onGranularityChange?: (g: "day" | "month" | "year") => void;
  className?: string;
  placeholder?: string;
  iconOnly?: boolean;
  align?: "left" | "right";
  isActive?: boolean;
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
  onReset,
  granularity = "day",
  onGranularityChange,
  className = "",
  placeholder = "Select date range",
  iconOnly = false,
  align = "left",
  isActive = false,
}: SingleCalendarDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Internal selection state to allow seamless multi-step picking across months
  const [internalFrom, setInternalFrom] = useState<string>(dateFrom);
  const [internalTo, setInternalTo] = useState<string>(dateTo);
  const [hoverIso, setHoverIso] = useState<string | null>(null);

  // Sync internal state with props whenever props change
  useEffect(() => {
    setInternalFrom(dateFrom);
    setInternalTo(dateTo);
  }, [dateFrom, dateTo]);

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
        setInternalFrom(dateFrom);
        setInternalTo(dateTo);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, dateFrom, dateTo]);

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
      if (onGranularityChange) {
        onGranularityChange("day");
      }
      const now = new Date();
      let f = "";
      let t = "";
      if (preset === "today") {
        t = formatIso(now);
        f = t;
      } else if (preset === "yesterday") {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        f = formatIso(yest);
        t = f;
      } else if (preset === "7days") {
        const past = new Date(now);
        past.setDate(past.getDate() - 6);
        f = formatIso(past);
        t = formatIso(now);
      } else if (preset === "month") {
        const first = new Date(now.getFullYear(), now.getMonth(), 1);
        f = formatIso(first);
        t = formatIso(now);
      }
      setInternalFrom(f);
      setInternalTo(t);
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      setHoverIso(null);
      onChange(f, t);
    },
    [onChange, onGranularityChange],
  );

  const handleDayClick = useCallback(
    (iso: string) => {
      if (onGranularityChange && granularity !== "day") {
        onGranularityChange("day");
      }
      if (!internalFrom || (internalFrom && internalTo) || granularity !== "day") {
        // First click: Start new range selection
        setInternalFrom(iso);
        setInternalTo("");
        setHoverIso(null);
      } else {
        // Second click: Complete range selection
        let newFrom = internalFrom;
        let newTo = iso;
        if (iso < internalFrom) {
          newFrom = iso;
          newTo = internalFrom;
        }
        setInternalFrom(newFrom);
        setInternalTo(newTo);
        setHoverIso(null);
        onChange(newFrom, newTo);
      }
    },
    [internalFrom, internalTo, onChange, onGranularityChange, granularity],
  );

  const handleDone = useCallback(() => {
    if (internalFrom && !internalTo) {
      setInternalTo(internalFrom);
      onChange(internalFrom, internalFrom);
    }
    setIsOpen(false);
    setHoverIso(null);
  }, [internalFrom, internalTo, onChange]);

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
    if (granularity === "month") {
      const year = dateFrom ? dateFrom.split("-")[0] : viewYear;
      return `${year} (Month-wise)`;
    }
    if (granularity === "year") {
      const yFrom = dateFrom ? dateFrom.split("-")[0] : viewYear - 4;
      const yTo = dateTo ? dateTo.split("-")[0] : viewYear;
      return `${yFrom} to ${yTo} (Year-wise)`;
    }
    if (dateFrom && dateTo) {
      return `${toDisplayDate(dateFrom)} to ${toDisplayDate(dateTo)}`;
    }
    if (dateFrom) {
      return `${toDisplayDate(dateFrom)} to ...`;
    }
    return "";
  }, [dateFrom, dateTo, granularity, viewYear]);

  return (
    <div ref={containerRef} className={`relative ${iconOnly ? "inline-flex" : "w-full"} ${className}`}>
      {/* Trigger: icon-only button or full input field */}
      {iconOnly ? (
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all flex items-center justify-center cursor-pointer",
            isActive || isOpen
              ? "bg-primary text-white shadow-xs"
              : "text-text-muted hover:text-text-heading hover:bg-surface"
          )}
          title={displayText ? `Date Range: ${displayText}` : "Select custom date range"}
          aria-label="Select custom date range"
        >
          <CalendarDaysIcon className="h-4 w-4" />
        </button>
      ) : (
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
            {onReset ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onReset();
                  setHoverIso(null);
                }}
                className="rounded p-1 text-text-muted hover:text-primary hover:bg-surface transition-colors"
                title="Reset date range"
                aria-label="Reset date range"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            ) : (
              (dateFrom || dateTo) && (
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
              )
            )}
          </div>
        </div>
      )}

      {/* Calendar Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{ scrollMarginBottom: 24 }}
          className={cn(
            "absolute top-full z-50 mt-1.5 w-[320px] sm:w-[340px] rounded-[var(--radius-lg)] border border-border bg-surface p-3.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100",
            align === "right" ? "right-0 left-auto" : "left-0"
          )}
        >
          {/* Quick presets (Shown only when opened) */}
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-2">
            <button
              type="button"
              onClick={() => applyPreset("today")}
              className="rounded-[var(--radius-xs)] border border-border/80 bg-surface-elevated/70 px-2 py-1 text-xs font-medium text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => applyPreset("yesterday")}
              className="rounded-[var(--radius-xs)] border border-border/80 bg-surface-elevated/70 px-2 py-1 text-xs font-medium text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => applyPreset("7days")}
              className="rounded-[var(--radius-xs)] border border-border/80 bg-surface-elevated/70 px-2 py-1 text-xs font-medium text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              Last 7d
            </button>
            <button
              type="button"
              onClick={() => applyPreset("month")}
              className="rounded-[var(--radius-xs)] border border-border/80 bg-surface-elevated/70 px-2 py-1 text-xs font-medium text-text-muted hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              This Month
            </button>
            {onReset && (
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setHoverIso(null);
                  if (onGranularityChange) onGranularityChange("day");
                }}
                className="rounded-[var(--radius-xs)] border border-border/80 bg-surface-elevated/70 px-2 py-1 text-xs font-medium text-text-muted hover:border-primary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
                title="Reset to initial date range"
              >
                <ArrowPathIcon className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>

          {/* Graph View (Day-wise / Month-wise / Year-wise) */}
          {onGranularityChange && (
            <div className="mb-2.5 flex items-center justify-between gap-1 rounded-lg bg-surface-elevated/80 p-1 border border-border/60">
              <span className="px-1.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                Graph:
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onGranularityChange("day")}
                  className={cn(
                    "rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-medium transition-all cursor-pointer",
                    granularity === "day"
                      ? "bg-primary text-white shadow-xs font-semibold"
                      : "text-text-muted hover:text-text hover:bg-surface"
                  )}
                  title="View day-wise sales graph"
                >
                  Day-wise
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = viewYear || new Date().getFullYear();
                    onChange(`${y}-01-01`, `${y}-12-31`);
                    onGranularityChange("month");
                  }}
                  className={cn(
                    "rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-medium transition-all cursor-pointer",
                    granularity === "month"
                      ? "bg-primary text-white shadow-xs font-semibold"
                      : "text-text-muted hover:text-text hover:bg-surface"
                  )}
                  title="View month-wise sales graph (12 months)"
                >
                  Month-wise
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const y = viewYear || new Date().getFullYear();
                    onChange(`${y - 4}-01-01`, `${y}-12-31`);
                    onGranularityChange("year");
                  }}
                  className={cn(
                    "rounded-[var(--radius-xs)] px-2 py-0.5 text-xs font-medium transition-all cursor-pointer",
                    granularity === "year"
                      ? "bg-primary text-white shadow-xs font-semibold"
                      : "text-text-muted hover:text-text hover:bg-surface"
                  )}
                  title="View year-wise sales graph"
                >
                  Year-wise
                </button>
              </div>
            </div>
          )}

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
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setViewYear(y);
                  if (granularity === "month") {
                    onChange(`${y}-01-01`, `${y}-12-31`);
                  } else if (granularity === "year") {
                    onChange(`${y - 4}-01-01`, `${y}-12-31`);
                  }
                }}
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
              const effectiveStart = internalFrom;
              const effectiveEnd =
                internalTo || (internalFrom && hoverIso ? (hoverIso >= internalFrom ? hoverIso : internalFrom) : "");

              let minDate = effectiveStart;
              let maxDate = effectiveEnd;
              if (minDate && maxDate && minDate > maxDate) {
                const tmp = minDate;
                minDate = maxDate;
                maxDate = tmp;
              }

              const isStart = iso === (internalFrom && (!internalTo && hoverIso && hoverIso < internalFrom ? hoverIso : internalFrom));
              const isEnd = iso === (internalTo ? internalTo : (!internalTo && hoverIso ? (hoverIso >= internalFrom ? hoverIso : internalFrom) : ""));
              const isInRange = Boolean(
                minDate &&
                maxDate &&
                iso >= minDate &&
                iso <= maxDate
              );

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
                      if (internalFrom && !internalTo) {
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
              {granularity === "month"
                ? `12 Months of ${dateFrom ? dateFrom.split("-")[0] : viewYear}`
                : granularity === "year"
                ? `Past 5 Years up to ${dateTo ? dateTo.split("-")[0] : viewYear}`
                : internalFrom && internalTo
                ? `${toDisplayDate(internalFrom)} – ${toDisplayDate(internalTo)}`
                : internalFrom
                  ? `From ${toDisplayDate(internalFrom)} (click end date)`
                  : "Click start date"}
            </span>
            <button
              type="button"
              onClick={handleDone}
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

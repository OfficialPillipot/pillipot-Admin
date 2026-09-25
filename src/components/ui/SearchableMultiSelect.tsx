import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  ChevronDownIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

export interface MultiSelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

export interface SearchableMultiSelectProps {
  selectedValues: string[];
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  itemNoun?: string;
  className?: string;
}

import { autoScrollDropdownIntoView } from "../../lib/scrollUtils";

export function SearchableMultiSelect({
  selectedValues,
  onChange,
  options,
  placeholder = "Select options",
  searchPlaceholder = "Type to search...",
  itemNoun = "item",
  className = "",
}: SearchableMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input and auto-scroll if dropdown is under of the screen
  useEffect(() => {
    if (isOpen) {
      const focusTimer = setTimeout(() => {
        searchInputRef.current?.focus({ preventScroll: true });
      }, 50);

      const scrollTimer = setTimeout(() => {
        if (popoverRef.current) {
          autoScrollDropdownIntoView(popoverRef.current, { padding: 24 });
        }
      }, 60);

      return () => {
        clearTimeout(focusTimer);
        clearTimeout(scrollTimer);
      };
    } else {
      setSearchTerm("");
    }
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.subLabel?.toLowerCase().includes(q),
    );
  }, [options, searchTerm]);

  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

  const toggleOption = useCallback(
    (val: string) => {
      if (selectedSet.has(val)) {
        onChange(selectedValues.filter((v) => v !== val));
      } else {
        onChange([...selectedValues, val]);
      }
    },
    [selectedSet, selectedValues, onChange],
  );

  const selectAllFiltered = useCallback(() => {
    const newSelected = new Set(selectedValues);
    for (const opt of filteredOptions) {
      newSelected.add(opt.value);
    }
    onChange(Array.from(newSelected));
  }, [selectedValues, filteredOptions, onChange]);

  const clearSelection = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Display label on the trigger
  const displayLabel = useMemo(() => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      const match = options.find((o) => o.value === selectedValues[0]);
      return match ? match.label : `1 ${itemNoun} selected`;
    }
    if (selectedValues.length === 2) {
      const first = options.find((o) => o.value === selectedValues[0])?.label;
      const second = options.find((o) => o.value === selectedValues[1])?.label;
      if (first && second) return `${first}, ${second}`;
    }
    return `${selectedValues.length} ${itemNoun}s selected`;
  }, [selectedValues, options, placeholder, itemNoun]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Trigger button matching MANAGEMENT_NATIVE_CONTROL_CLASS */}
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
        <span
          className={`truncate pr-2 ${
            selectedValues.length === 0
              ? "text-text-muted"
              : "font-medium text-text-heading"
          }`}
          title={displayLabel}
        >
          {displayLabel}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {selectedValues.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearSelection();
              }}
              className="rounded p-1 text-text-muted hover:text-text hover:bg-surface transition-colors"
              title="Clear selection"
              aria-label="Clear selection"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
          <ChevronDownIcon
            className={`h-4 w-4 text-text-muted transition-transform duration-200 ${
              isOpen ? "rotate-180 text-primary" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{ scrollMarginBottom: 24 }}
          className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[280px] sm:min-w-[320px] rounded-[var(--radius-lg)] border border-border bg-surface p-2 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Search Input field */}
          <div className="relative mb-2">
            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-[var(--radius-sm)] border border-border/80 bg-surface-elevated/80 pl-8 pr-7 py-1.5 text-xs sm:text-sm text-text-heading outline-none focus:border-primary"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-0.5"
                title="Clear search"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Action row */}
          <div className="mb-2 flex items-center justify-between border-b border-border/60 px-1 pb-1.5 text-xs text-text-muted">
            <span>
              {filteredOptions.length} {filteredOptions.length === 1 ? itemNoun : `${itemNoun}s`}
              {selectedValues.length > 0 && ` (${selectedValues.length} selected)`}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-primary hover:underline font-medium text-[11px]"
              >
                Select all
              </button>
              {selectedValues.length > 0 && (
                <>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-red-500 hover:underline font-medium text-[11px]"
                  >
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-text-muted">
                No {itemNoun}s found matching “{searchTerm}”
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selectedSet.has(opt.value);
                return (
                  <div
                    key={opt.value}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleOption(opt.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleOption(opt.value);
                      }
                    }}
                    className={`flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs sm:text-sm cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary-muted/60 text-primary font-medium"
                        : "hover:bg-surface-elevated text-text"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                        isSelected
                          ? "border-primary bg-primary text-white"
                          : "border-border bg-surface"
                      }`}
                    >
                      {isSelected && <CheckIcon className="h-3 w-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-text-heading">{opt.label}</div>
                      {opt.subLabel && (
                        <div className="truncate text-[10px] text-text-muted">
                          {opt.subLabel}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with Done button */}
          <div className="mt-2 flex items-center justify-end border-t border-border/60 pt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
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

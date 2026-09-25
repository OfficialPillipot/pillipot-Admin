import { memo, forwardRef, useState, useRef, useEffect, type SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/20/solid";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
  fullWidth?: boolean;
  value?: string | number;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

import { autoScrollDropdownIntoView } from "../../lib/scrollUtils";

const SelectComponent = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, options, error, placeholder, fullWidth, className = "", id, value, onChange, ...rest },
    ref
  ) => {
    const selectId = id ?? `select-${Math.random().toString(36).slice(2, 9)}`;
    const shouldFullWidth = fullWidth ?? Boolean(label);
    
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };
      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [isOpen]);

    // Auto scroll if dropdown is under the bottom of the screen
    useEffect(() => {
      if (isOpen) {
        const scrollTimer = setTimeout(() => {
          if (dropdownRef.current) {
            autoScrollDropdownIntoView(dropdownRef.current, { padding: 24 });
          }
        }, 60);
        return () => clearTimeout(scrollTimer);
      }
    }, [isOpen]);

    const selectedOption = options.find((opt) => opt.value === String(value));
    const displayLabel = selectedOption ? selectedOption.label : (placeholder || "Select...");

    const handleSelect = (optionValue: string) => {
      if (onChange) {
        // Mock the event object structure to support (e) => setVal(e.target.value)
        const mockEvent = {
          target: { value: optionValue, name: rest.name },
          currentTarget: { value: optionValue, name: rest.name }
        } as unknown as React.ChangeEvent<HTMLSelectElement>;
        onChange(mockEvent);
      }
      setIsOpen(false);
    };

    return (
      <div className={shouldFullWidth ? "w-full" : "w-auto"} ref={containerRef}>
        {label && (
          <label
            htmlFor={selectId}
            className="mb-0.5 block text-xs font-medium text-text-heading md:mb-1 md:text-sm"
          >
            {label}
          </label>
        )}
        
        {/* Hidden native select for form submissions and refs */}
        <select
          ref={ref}
          id={selectId}
          value={value}
          onChange={onChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          {...rest}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              shouldFullWidth ? "h-11 w-full" : "h-11 w-auto min-w-[8rem] md:min-w-[9rem]",
              "flex items-center justify-between gap-2 rounded-[var(--radius-md)] border bg-surface px-3 text-sm shadow-[var(--shadow-card)] transition-all focus:outline-none",
              error
                ? "border-error focus:shadow-[0_0_0_3px_rgba(220,38,38,0.1)] text-error"
                : "border-border hover:bg-surface-soft focus:border-primary focus:shadow-[var(--shadow-focus)] text-text-heading",
              isOpen && !error && "border-primary shadow-[var(--shadow-focus)]",
              className
            )}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <span className="truncate">{displayLabel}</span>
            <ChevronDownIcon className={cn("h-4 w-4 text-text-muted shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
          </button>

          {isOpen && (
            <div
              ref={dropdownRef}
              style={{ scrollMarginBottom: 24 }}
              className="absolute z-[100] mt-1 max-h-60 w-full min-w-[12rem] overflow-auto rounded-[var(--radius-md)] border border-border bg-surface py-1 shadow-[var(--shadow-dropdown)]"
            >
              <ul role="listbox" className="flex flex-col">
                {placeholder && (
                  <li
                    role="option"
                    aria-selected={value === ""}
                    onClick={() => handleSelect("")}
                    className={cn(
                      "flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-surface-soft",
                      (value === "" || value === undefined) ? "bg-surface-soft font-medium text-primary" : "text-text"
                    )}
                  >
                    <span className="truncate">{placeholder}</span>
                    {(value === "" || value === undefined) && <CheckIcon className="h-4 w-4 text-primary shrink-0" />}
                  </li>
                )}
                {options.map((opt) => {
                  const isSelected = String(value) === String(opt.value);
                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-surface-soft",
                        isSelected ? "bg-surface-soft font-medium text-primary" : "text-text"
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && <CheckIcon className="h-4 w-4 text-primary shrink-0" />}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-error md:text-sm">{error}</p>
        )}
      </div>
    );
  }
);

SelectComponent.displayName = "Select";
export const Select = memo(SelectComponent);

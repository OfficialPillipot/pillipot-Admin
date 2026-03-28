import { memo, forwardRef, type SelectHTMLAttributes } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  placeholder?: string;
}

const SelectComponent = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, placeholder, className = "", id, ...rest }, ref) => {
    const selectId = id ?? `select-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1 block text-sm font-medium text-text-heading"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            "min-h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 sm:min-h-0",
            error ? "border-error" : "border-border",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={!!error}
          {...rest}
        >
          {placeholder && (
            <option value="">{placeholder}</option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p className="mt-1 text-sm text-error">{error}</p>
        )}
      </div>
    );
  }
);

SelectComponent.displayName = "Select";
export const Select = memo(SelectComponent);

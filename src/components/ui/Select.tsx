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
  fullWidth?: boolean;
}

const SelectComponent = forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, options, error, placeholder, fullWidth, className = "", id, ...rest },
    ref
  ) => {
    const selectId = id ?? `select-${Math.random().toString(36).slice(2, 9)}`;
    const shouldFullWidth = fullWidth ?? Boolean(label);
    return (
      <div className={shouldFullWidth ? "w-full" : "w-auto"}>
        {label && (
          <label
            htmlFor={selectId}
            className="mb-0.5 block text-xs font-medium text-text-heading md:mb-1 md:text-sm"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            shouldFullWidth ? "h-11 w-full" : "h-11 w-auto min-w-[8rem] md:min-w-[9rem]",
            "rounded-[var(--radius-md)] border border-border bg-surface-elevated/85 px-3 text-sm text-text shadow-sm transition-all focus:outline-none",
            error
              ? "border-error focus:shadow-[0_0_0_4px_rgba(194,65,12,0.12)]"
              : "border-border focus:border-primary focus:shadow-[var(--shadow-focus)]",
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
          <p className="mt-1 text-xs text-error md:text-sm">{error}</p>
        )}
      </div>
    );
  }
);

SelectComponent.displayName = "Select";
export const Select = memo(SelectComponent);

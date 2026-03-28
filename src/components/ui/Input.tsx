import { memo, forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const InputComponent = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...rest }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1 block text-sm font-medium text-text-heading"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "min-h-10 w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2 text-sm text-text transition-colors placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 sm:min-h-0",
            error
              ? "border-error focus:ring-error"
              : "border-border focus:border-primary",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-error">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1 text-sm text-text-muted">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

InputComponent.displayName = "Input";
export const Input = memo(InputComponent);

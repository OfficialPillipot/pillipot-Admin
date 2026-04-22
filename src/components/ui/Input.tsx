import { memo, forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  endNode?: React.ReactNode;
}

const InputComponent = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, endNode, className = "", id, ...rest }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-0.5 block text-xs font-medium text-text-heading md:mb-1 md:text-sm"
          >
            {label}
          </label>
        )}
        <div className="relative w-full">
          <input
            ref={ref}
            id={inputId}
            className={[
              "h-11 w-full rounded-[var(--radius-md)] border border-border bg-surface-elevated/85 text-sm text-text shadow-sm transition-all placeholder:text-text-muted focus:outline-none md:h-11",
              endNode ? "pl-3 pr-10" : "px-3",
              error
                ? "border-error focus:shadow-[0_0_0_4px_rgba(194,65,12,0.12)]"
                : "border-border focus:border-primary focus:shadow-[var(--shadow-focus)]",
              className,
            ]
              .filter(Boolean)
              .join(" ")}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...rest}
          />
          {endNode && (
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-text-muted">
              {endNode}
            </div>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-xs text-error md:text-sm">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1 text-xs text-text-muted md:text-sm">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

InputComponent.displayName = "Input";
export const Input = memo(InputComponent);

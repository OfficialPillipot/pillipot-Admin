import { memo, forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const TextareaComponent = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...rest }, ref) => {
    const textareaId = id ?? `textarea-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1 block text-sm font-medium text-text-heading"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={[
            "min-h-[88px] w-full rounded-[var(--radius-md)] border border-border bg-surface px-3 py-2.5 text-sm text-text transition-colors placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0 sm:min-h-[80px]",
            error ? "border-error" : "border-border",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          aria-invalid={!!error}
          {...rest}
        />
        {error && <p className="mt-1 text-sm text-error">{error}</p>}
      </div>
    );
  }
);

TextareaComponent.displayName = "Textarea";
export const Textarea = memo(TextareaComponent);

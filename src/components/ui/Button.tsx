import { memo, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary text-text-inverse shadow-sm hover:bg-primary-hover focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface",
  secondary:
    "border border-border-strong bg-surface text-text shadow-sm hover:bg-surface-alt focus:ring-2 focus:ring-border-strong focus:ring-offset-2 focus:ring-offset-surface",
  outline:
    "border-2 border-primary text-primary hover:bg-primary-muted focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-surface",
  ghost:
    "text-text hover:bg-surface-alt focus:ring-2 focus:ring-border focus:ring-offset-2 focus:ring-offset-surface",
  danger:
    "bg-error text-text-inverse shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-error focus:ring-offset-2 focus:ring-offset-surface",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-2.5 py-1 text-xs rounded-[var(--radius-sm)] md:px-3 md:py-1.5 md:text-sm",
  md: "px-3 py-1.5 text-xs rounded-[var(--radius-md)] md:px-4 md:py-2 md:text-sm",
  lg: "px-4 py-2 text-sm rounded-[var(--radius-lg)] md:px-6 md:py-3 md:text-base",
};

function ButtonComponent({
  variant = "primary",
  size = "md",
  fullWidth,
  loading,
  disabled,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={[
        "inline-flex touch-manipulation items-center justify-center font-medium transition-colors duration-150 ease-out active:transition-none disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        children
      )}
    </button>
  );
}

export const Button = memo(ButtonComponent);

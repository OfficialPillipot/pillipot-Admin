import { memo } from "react";

type Variant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "packed"
  | "muted";

const variantClasses: Record<Variant, string> = {
  default: "border border-border/90 bg-surface-elevated/85 text-text",
  success: "border border-success/15 bg-success-bg text-success",
  warning: "border border-warning/15 bg-warning-bg text-warning",
  error: "border border-error/15 bg-error-bg text-error",
  info: "border border-info/15 bg-info-bg text-info",
  packed:
    "border-0 bg-violet-100 text-violet-900 dark:bg-violet-950/55 dark:text-violet-200",
  muted:
    "border border-border/80 bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

function BadgeComponent({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-none tracking-tight",
        variantClasses[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export const Badge = memo(BadgeComponent);

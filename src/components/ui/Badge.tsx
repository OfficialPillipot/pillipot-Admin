import { memo } from "react";
import { cn } from "../../lib/utils";

type Variant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "primary"
  | "packed"
  | "muted";

const variantClasses: Record<Variant, string> = {
  default: "border border-border bg-surface-elevated text-text",
  success: "border border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border border-amber-200 bg-amber-100 text-amber-700",
  error: "border border-red-200 bg-red-50 text-red-700",
  info: "border border-blue-200 bg-blue-50 text-blue-700",
  primary: "border border-blue-200 bg-blue-50 text-blue-700",
  packed: "border border-violet-200 bg-violet-50 text-violet-700",
  muted: "border border-border bg-surface-soft text-text-muted",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

function BadgeComponent({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium leading-none tracking-normal",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const Badge = memo(BadgeComponent);

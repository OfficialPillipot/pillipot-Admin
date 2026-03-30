import { memo, type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

function CardComponent({
  padding = "md",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={[
        "rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] ring-1 ring-slate-900/[0.04]",
        paddingMap[padding],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}

export const Card = memo(CardComponent);

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardHeader = memo(function CardHeader({
  title,
  action,
}: CardHeaderProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-2">
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold h-15 tracking-tight text-text-heading sm:text-lg">
          {title}
        </h2>

      </div>
      {action && <div className="shrink-0 sm:self-start">{action}</div>}
    </div>
  );
});

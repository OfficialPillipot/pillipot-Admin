import { memo, type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-3 md:p-4",
  md: "p-4 md:p-6",
  lg: "p-5 md:p-8",
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
        "rounded-[var(--radius-xl)] border border-border/90 bg-surface shadow-[var(--shadow-card)] transition-shadow duration-200 ease-out md:rounded-[var(--radius-2xl)]",
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

export const CardHeader = memo(function CardHeaderInner({
  title,
  subtitle,
  action,
}: CardHeaderProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-border/70 pb-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold tracking-tight text-text-heading md:text-xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-text-muted md:text-[0.9375rem]">
            {subtitle}
          </p>
        )}
      </div>
      {action && (
        <div className="ml-auto shrink-0 sm:self-start">{action}</div>
      )}
    </div>
  );
});

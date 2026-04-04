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
        "rounded-[var(--radius-2xl)] border border-border bg-surface shadow-[var(--shadow-card)] transition-shadow duration-200 ease-out",
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
  subtitle,
  action,
}: CardHeaderProps) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-2 md:gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold tracking-tight text-text-heading md:text-lg lg:text-xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1.5 text-sm text-text-muted leading-relaxed md:text-[0.9375rem]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action && <div className="shrink-0 sm:self-start">{action}</div>}
    </div>
  );
});

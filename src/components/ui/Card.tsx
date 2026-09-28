import { memo, type HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-3 md:p-4",
  md: "p-4 md:p-6",
  lg: "p-6 md:p-8",
};

function CardComponent({
  padding = "md",
  className = "",
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:shadow-[var(--shadow-card-lg)] md:rounded-[var(--radius-xl)]",
        paddingMap[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export const Card = memo(CardComponent);

interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export const CardHeader = memo(function CardHeaderInner({
  title,
  subtitle,
  icon,
  action,
}: CardHeaderProps) {
  if (!title && !subtitle && !icon) {
    if (!action) return null;
    return (
      <div className="mb-4 flex items-center justify-end">
        {action}
      </div>
    );
  }

  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 flex-1 gap-3">
        {icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary md:h-12 md:w-12 md:rounded-xl">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {title && (
            <h2 className="text-lg font-semibold tracking-tight text-text-heading md:text-xl">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-text-muted md:text-[0.9375rem]">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="ml-auto shrink-0 sm:self-start">{action}</div>
      )}
    </div>
  );
});

export const CardTitle = memo(function CardTitle({
  className = "",
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold tracking-tight text-text-heading md:text-xl", className)}
      {...rest}
    />
  );
});

export const CardDescription = memo(function CardDescription({
  className = "",
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-sm leading-relaxed text-text-muted md:text-[0.9375rem]", className)}
      {...rest}
    />
  );
});

export const CardContent = memo(function CardContent({
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-4", className)} {...rest} />;
});

export const CardFooter = memo(function CardFooter({
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4", className)}
      {...rest}
    />
  );
});

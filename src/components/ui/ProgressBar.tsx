import { memo } from "react";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showValue?: boolean;
  className?: string;
}

function ProgressBarComponent({
  value,
  max,
  label,
  showValue = true,
  className = "",
}: ProgressBarProps) {
  const pct = max <= 0 ? 0 : Math.min(100, (value / max) * 100)
  return (
    <div className={className}>
      {(label || showValue) && (
        <div className="mb-1 flex justify-between text-sm">
          {label && <span className="text-text-muted">{label}</span>}
          {showValue && (
            <span className="font-medium text-text-heading">
              {value} / {max}
            </span>
          )}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-alt">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}

export const ProgressBar = memo(ProgressBarComponent);

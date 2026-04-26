import { memo } from "react";
import { Badge } from "../ui";
import type { OrderStatus } from "../../types";
import { formatOrderStatusLabel, orderStatusToBadgeVariant } from "../../lib/orderUtils";

type Props = { uniform: OrderStatus | "mixed" };

/** Single badge for a display order (one status, or “Mixed” if lines differ). */
export const OrderStatusBadge = memo(function OrderStatusBadge({
  uniform,
}: Props) {
  return (
    <Badge
      variant={orderStatusToBadgeVariant(uniform)}
      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
    >
      {formatOrderStatusLabel(uniform)}
    </Badge>
  );
});

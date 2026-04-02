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
    <Badge variant={orderStatusToBadgeVariant(uniform)}>
      {formatOrderStatusLabel(uniform)}
    </Badge>
  );
});

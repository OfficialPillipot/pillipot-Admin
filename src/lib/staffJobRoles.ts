import type { SelectOption } from "../components/ui/Select";

/** Matches API `STAFF_JOB_TYPES` — job type, not login role */
export const STAFF_JOB_ROLE_OPTIONS: SelectOption[] = [
  { value: "sales", label: "Sales" },
  { value: "packing", label: "Packing" },
  { value: "delivery", label: "Delivery" },
  { value: "warehouse", label: "Warehouse" },
  { value: "support", label: "Support" },
  { value: "other", label: "Other" },
];

export function staffJobRoleLabel(slug: string | undefined): string {
  if (!slug) return "—";
  return STAFF_JOB_ROLE_OPTIONS.find((o) => o.value === slug)?.label ?? slug;
}

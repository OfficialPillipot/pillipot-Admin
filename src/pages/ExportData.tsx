import { memo, useMemo, useCallback } from "react";
import { useAppSelector } from "../store/hooks";
import { selectOrders } from "../store/ordersSlice";
import { Card, CardHeader, Button } from "../components/ui";

function ExportDataPage() {
  const orders = useAppSelector(selectOrders);

  const uniqueCustomers = useMemo(() => {
    const seen = new Set<string>();
    return orders
      .filter((o) => {
        const key = `${o.phone}-${o.email}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((o) => ({
        name: o.customerName,
        phone: o.phone,
        email: o.email,
      }));
  }, [orders]);

  const downloadExcel = useCallback(() => {
    const headers = ["Name", "Phone Number", "Email"];
    const rows = uniqueCustomers.map((c) => [c.name, c.phone, c.email]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [uniqueCustomers]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Export Customer Data"
          subtitle="Download customer list (Name, Phone, Email) in CSV format for Excel."
        />
        <p className="mb-4 text-sm text-text-muted">
          {uniqueCustomers.length} unique customer(s) from orders.
        </p>
        <Button onClick={downloadExcel}>Download CSV / Excel</Button>
      </Card>
    </div>
  );
}

export default memo(ExportDataPage);

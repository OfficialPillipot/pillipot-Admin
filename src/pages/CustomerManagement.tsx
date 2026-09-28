import { memo, useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchCustomers, selectCustomers } from "../store/customersSlice";
import { Card, CardHeader, Button, Input, Table } from "../components/ui";
import { formatDate } from "../lib/orderUtils";
import type { Customer } from "../types";
import { orderListPaginationSlots } from "../components/orders/adminOrderManagementUtils";
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { toast } from "../lib/toast";
import { useBulkImportCustomersMutation } from "../store/api/edenApi";

const PAGE_SIZE = 10;

function CustomerManagementPage() {
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);
  const [nameQuery, setNameQuery] = useState("");
  const [page, setPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [bulkImportCustomers] = useBulkImportCustomersMutation();

  useEffect(() => {
    void dispatch(fetchCustomers());
  }, [dispatch]);

  const filteredCustomers = useMemo(() => {
    const q = nameQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => c.customerName.toLowerCase().includes(q));
  }, [customers, nameQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [nameQuery]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedCustomers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredCustomers.slice(start, start + PAGE_SIZE);
  }, [filteredCustomers, page]);

  const goToPage = useCallback(
    (nextPage: number) => {
      const safe = Math.max(1, Math.min(totalPages, nextPage));
      setPage(safe);
    },
    [totalPages]
  );

  const paginationSlots = useMemo(
    () => orderListPaginationSlots(page, totalPages),
    [page, totalPages]
  );

  const columns = useMemo(
    () => [
      { key: "customerName", header: "Name" },
      { key: "phone", header: "Phone" },
      { key: "secondaryPhone", header: "Phone 2" },
      { key: "email", header: "Email" },
      {
        key: "deliveryAddress",
        header: "Address",
        className: "min-w-0 max-w-[200px] align-top",
        render: (row: Customer) => (
          <span
            className="line-clamp-2 max-w-[200px] break-words text-left text-sm leading-snug text-text"
            title={row.deliveryAddress}
          >
            {row.deliveryAddress}
          </span>
        ),
      },
      { key: "district", header: "District" },
      { key: "state", header: "State" },
      { key: "pincode", header: "PIN" },
      { key: "postOffice", header: "Post office" },
      {
        key: "updatedAt",
        header: "Last updated",
        render: (row: Customer) => formatDate(row.updatedAt),
      },
    ],
    []
  );

  const downloadExcel = useCallback(() => {
    if (filteredCustomers.length === 0) {
      toast.error("No customers to export");
      return;
    }
    const headers = ["Name", "Phone", "Phone 2", "Email", "Address", "District", "State", "PIN", "Post Office"];
    const rows = filteredCustomers.map((c) => [
      c.customerName, c.phone, c.secondaryPhone || "", c.email, c.deliveryAddress, c.district, c.state, c.pincode, c.postOffice
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Customers exported successfully");
  }, [filteredCustomers]);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        toast.error("Failed to read file");
        return;
      }
      
      try {
        const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
        if (lines.length < 2) {
          toast.error("File is empty or missing headers");
          return;
        }

        const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim().toLowerCase());
        const parsedCustomers: any[] = [];

        for (let i = 1; i < lines.length; i++) {
          let inQuotes = false;
          let currentWord = "";
          const words = [];
          for (let c of lines[i]) {
            if (c === '"') {
              inQuotes = !inQuotes;
            } else if (c === ',' && !inQuotes) {
              words.push(currentWord);
              currentWord = "";
            } else {
              currentWord += c;
            }
          }
          words.push(currentWord);
          
          const row = words.map(w => w.trim());
          
          const customer: any = {};
          headers.forEach((h, idx) => {
            customer[h] = row[idx] || "";
          });

          parsedCustomers.push({
            customerName: customer["name"] || "",
            phone: customer["phone"] || customer["phone number"] || "",
            secondaryPhone: customer["phone 2"] || "",
            email: customer["email"] || "",
            deliveryAddress: customer["address"] || "",
            district: customer["district"] || "",
            state: customer["state"] || "",
            pincode: customer["pin"] || "",
            postOffice: customer["post office"] || ""
          });
        }

        const res = await bulkImportCustomers(parsedCustomers).unwrap();
        toast.success(`Successfully imported ${res.imported} customers.`);
        if (res.errors?.length) {
          console.error("Import errors:", res.errors);
          toast.warning(`Finished with ${res.errors.length} errors. Check console.`);
        }
        dispatch(fetchCustomers()); 
      } catch (err) {
        toast.fromError(err, "Failed to import customers");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, [bulkImportCustomers, dispatch]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          action={
            <div className="flex items-center gap-2">
              <Button 
                onClick={downloadExcel} 
                variant="secondary" 
                size="sm" 
                icon={<ArrowDownTrayIcon className="h-4 w-4" />}
              >
                Export CSV
              </Button>
              <Button 
                onClick={handleImportClick} 
                variant="primary" 
                size="sm" 
                icon={<ArrowUpTrayIcon className="h-4 w-4" />}
              >
                Import CSV
              </Button>
              <input 
                type="file" 
                accept=".csv,.xlsx" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
              />
            </div>
          }
        />
        <div className="mb-4 max-w-md">
          <Input
            label="Search by name"
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            placeholder="Enter customer name"
          />
        </div>
        <Table
          columns={columns}
          data={pagedCustomers}
          keyExtractor={(row) => row.id}
          emptyMessage={
            nameQuery.trim()
              ? "No customers match this name."
              : "No customers yet. They appear when staff submit orders."
          }
        />
        {filteredCustomers.length > PAGE_SIZE ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-center text-sm text-text-muted sm:text-left">
              {filteredCustomers.length.toLocaleString()} customer
              {filteredCustomers.length === 1 ? "" : "s"} found
            </p>
            <nav
              className="flex flex-wrap items-center justify-center gap-1 sm:justify-end"
              aria-label="Customer list pages"
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Previous
              </Button>
              {paginationSlots.map((slot, i) =>
                slot === "ellipsis" ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="select-none px-2 text-sm text-text-muted"
                    aria-hidden
                  >
                    …
                  </span>
                ) : (
                  <Button
                    key={slot}
                    type="button"
                    variant={slot === page ? "primary" : "secondary"}
                    size="sm"
                    className="min-w-9 tabular-nums"
                    aria-label={`Page ${slot}`}
                    aria-current={slot === page ? "page" : undefined}
                    onClick={() => goToPage(slot)}
                  >
                    {slot}
                  </Button>
                )
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </Button>
            </nav>
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export default memo(CustomerManagementPage);

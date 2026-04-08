import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchCustomers, selectCustomers } from "../store/customersSlice";
import { Card, CardHeader, Button, Input, Table } from "../components/ui";
import { formatDate } from "../lib/orderUtils";
import type { Customer } from "../types";
import { orderListPaginationSlots } from "../components/orders/adminOrderManagementUtils";

const PAGE_SIZE = 10;

function CustomerManagementPage() {
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);
  const [nameQuery, setNameQuery] = useState("");
  const [page, setPage] = useState(1);

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
      { key: "email", header: "Email" },
      {
        key: "deliveryAddress",
        header: "Address",
        className: "min-w-0 max-w-[300px] align-top",
        render: (row: Customer) => (
          <span
            className="line-clamp-2 max-w-full break-words text-left text-sm leading-snug text-text"
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Customers"
        // subtitle="Built from create-order details. Phone and email are unique; new orders update the same customer when phone or email matches."
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

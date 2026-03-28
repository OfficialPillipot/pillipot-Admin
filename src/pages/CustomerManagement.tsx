import { memo, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchCustomers, selectCustomers } from "../store/customersSlice";
import { Card, CardHeader, Table } from "../components/ui";
import { formatDate } from "../lib/orderUtils";
import type { Customer } from "../types";

function CustomerManagementPage() {
  const dispatch = useAppDispatch();
  const customers = useAppSelector(selectCustomers);

  useEffect(() => {
    void dispatch(fetchCustomers());
  }, [dispatch]);

  const columns = useMemo(
    () => [
      { key: "customerName", header: "Name" },
      { key: "phone", header: "Phone" },
      { key: "email", header: "Email" },
      {
        key: "deliveryAddress",
        header: "Address",
        render: (row: Customer) => (
          <span className="max-w-[220px] truncate text-sm" title={row.deliveryAddress}>
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
          subtitle="Built from create-order details. Phone and email are unique; new orders update the same customer when phone or email matches."
        />
        <Table
          columns={columns}
          data={customers}
          keyExtractor={(row) => row.id}
          emptyMessage="No customers yet. They appear when staff submit orders."
        />
      </Card>
    </div>
  );
}

export default memo(CustomerManagementPage);

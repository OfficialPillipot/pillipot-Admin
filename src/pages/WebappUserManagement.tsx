import { memo, useCallback, useEffect, useState, useMemo } from "react";
import { Card, CardHeader, Table, Badge, Button, Input } from "../components/ui";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { toast } from "../lib/toast";
import { ArrowPathIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface CustomerUserRow {
  id: string;
  username: string; // email
  name: string;
  isActive: boolean;
  createdAt?: string;
}

function WebappUserManagementPage() {
  const [rows, setRows] = useState<CustomerUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<CustomerUserRow[]>(endpoints.rbacCustomerUsers);
      setRows(data);
    } catch (e) {
      toast.fromError(e, "Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.username.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const columns = [
    { key: "username", header: "Email / Username" },
    { key: "name", header: "Full Name" },
    {
      key: "isActive",
      header: "Status",
      render: (row: CustomerUserRow) => (
        <Badge variant={row.isActive ? "success" : "muted"}>
          {row.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Joined On",
      render: (row: CustomerUserRow) => row.createdAt ? new Date(row.createdAt).toLocaleDateString() : "N/A"
    }
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Platform Customers"
          subtitle="Users who registered directly through the Pillipot web application."
          action={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() => void load()}
            >
              <ArrowPathIcon className="h-4 w-4" aria-hidden />
              Refresh
            </Button>
          }
        />
        
        <div className="mb-4 max-w-md px-1">
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            endNode={<MagnifyingGlassIcon className="h-4 w-4" />}
          />
        </div>

        <Table
          columns={columns}
          data={filteredRows}
          keyExtractor={(row) => row.id}
          emptyMessage={loading ? "Loading..." : "No customers found."}
        />
      </Card>
    </div>
  );
}

export default memo(WebappUserManagementPage);

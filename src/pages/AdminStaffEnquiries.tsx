import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { Card, CardHeader, Table } from "../components/ui";
import { toast } from "../lib/toast";
import { formatDateTime } from "../lib/orderUtils";
import {
  LS_ADMIN_ENQUIRY_LAST_SEEN,
  dispatchNotificationsRefresh,
} from "../lib/header-notifications";
import type { StaffEnquiryListRow } from "../types";

function AdminStaffEnquiriesPage() {
  const [rows, setRows] = useState<StaffEnquiryListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const listFetchOk = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    listFetchOk.current = false;
    try {
      const data = await api.get<StaffEnquiryListRow[]>(endpoints.staffEnquiriesAdmin);
      setRows(data);
      listFetchOk.current = true;
    } catch (e) {
      toast.fromError(e, "Could not load enquiries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || !listFetchOk.current) return;
    const maxU =
      rows.length > 0
        ? Math.max(...rows.map((r) => new Date(r.updatedAt).getTime()))
        : Date.now();
    localStorage.setItem(
      LS_ADMIN_ENQUIRY_LAST_SEEN,
      new Date(maxU).toISOString(),
    );
    dispatchNotificationsRefresh();
  }, [loading, rows]);

  return (
    <div className="space-y-4">
      <CardHeader
        title="Staff enquiries"
        subtitle="Messages from staff — open a row to read and reply."
      />
      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table
            columns={[
              {
                key: "staff",
                header: "Staff",
                render: (r: StaffEnquiryListRow) => (
                  <span className="font-medium text-text-heading">{r.staffName ?? "—"}</span>
                ),
              },
              {
                key: "subject",
                header: "Subject",
                render: (r: StaffEnquiryListRow) => (
                  <Link
                    to={`/admin/staff-enquiries/${r.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.subject}
                  </Link>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (r: StaffEnquiryListRow) => (
                  <span
                    className={
                      r.status === "resolved"
                        ? "text-sm font-semibold text-success"
                        : "text-sm font-semibold text-primary"
                    }
                  >
                    {r.status === "resolved" ? "Resolved" : "Open"}
                  </span>
                ),
              },
              {
                key: "replies",
                header: "Replies",
                render: (r: StaffEnquiryListRow) => (
                  <span className="inline-flex items-center gap-1 text-sm text-text-muted">
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    {r.replyCount}
                  </span>
                ),
              },
              {
                key: "updated",
                header: "Updated",
                render: (r: StaffEnquiryListRow) => (
                  <span className="text-sm text-text-muted">{formatDateTime(r.updatedAt)}</span>
                ),
              },
            ]}
            data={rows}
            keyExtractor={(r) => r.id}
            emptyMessage="No staff messages yet."
          />
        </Card>
      )}
    </div>
  );
}

export default memo(AdminStaffEnquiriesPage);

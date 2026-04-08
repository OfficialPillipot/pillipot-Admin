import { memo, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { useAuth } from "../context/AuthContext";
import { Card, CardHeader, Button, Textarea, Select } from "../components/ui";
import { hasPermission } from "../lib/permissions";
import { toast } from "../lib/toast";
import { formatDateTime } from "../lib/orderUtils";
import {
  LS_ADMIN_ENQUIRY_LAST_SEEN,
  dispatchNotificationsRefresh,
} from "../lib/header-notifications";
import type { StaffEnquiryDetail, StaffEnquiryReply, StaffEnquiryStatus } from "../types";
import type { SelectOption } from "../components/ui/Select";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
];

function AdminStaffEnquiryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canUpdate = user?.role === "super_admin" || hasPermission(user, "staff_enquiries.update");

  const [detail, setDetail] = useState<StaffEnquiryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);
  const [statusDraft, setStatusDraft] = useState<StaffEnquiryStatus>("open");
  const [statusSaving, setStatusSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const d = await api.get<StaffEnquiryDetail>(endpoints.staffEnquiryAdmin(id));
      setDetail(d);
      setStatusDraft(d.status);
    } catch (e) {
      toast.fromError(e, "Could not load thread");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detail) return;
    const t = new Date(detail.updatedAt).getTime();
    const prev = localStorage.getItem(LS_ADMIN_ENQUIRY_LAST_SEEN);
    const prevT = prev ? new Date(prev).getTime() : 0;
    if (t > prevT) {
      localStorage.setItem(LS_ADMIN_ENQUIRY_LAST_SEEN, detail.updatedAt);
      dispatchNotificationsRefresh();
    }
  }, [detail]);

  const sendReply = useCallback(async () => {
    if (!id || !detail || !canUpdate) return;
    const t = replyText.trim();
    if (!t) return;
    setReplying(true);
    try {
      const updated = await api.post<StaffEnquiryDetail>(
        endpoints.staffEnquiryAdminReply(id),
        { body: t },
      );
      setDetail(updated);
      setStatusDraft(updated.status);
      setReplyText("");
      toast.success("Reply sent");
    } catch (e) {
      toast.fromError(e, "Could not send reply");
    } finally {
      setReplying(false);
    }
  }, [id, detail, replyText, canUpdate]);

  const saveStatus = useCallback(async () => {
    if (!id || !detail || !canUpdate || statusDraft === detail.status) return;
    setStatusSaving(true);
    try {
      const updated = await api.patch<StaffEnquiryDetail>(endpoints.staffEnquiryAdmin(id), {
        status: statusDraft,
      });
      setDetail(updated);
      toast.success("Status updated");
    } catch (e) {
      toast.fromError(e, "Could not update status");
    } finally {
      setStatusSaving(false);
    }
  }, [id, detail, statusDraft, canUpdate]);

  if (!id) {
    return <p className="text-text-muted">Missing thread.</p>;
  }

  if (loading) {
    return <p className="text-text-muted">Loading…</p>;
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <Link
          to="/admin/staff-enquiries"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to list
        </Link>
        <p className="text-text-muted">Thread not found.</p>
      </div>
    );
  }

  const thread: { key: string; body: string; authorName: string; at: string; isStaff: boolean }[] =
    [
      {
        key: "initial",
        body: detail.body,
        authorName: detail.initialAuthorName,
        at: detail.createdAt,
        isStaff: true,
      },
      ...detail.replies.map((r: StaffEnquiryReply) => ({
        key: r.id,
        body: r.body,
        authorName: r.authorName,
        at: r.createdAt,
        isStaff: r.isStaff,
      })),
    ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/admin/staff-enquiries"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        All enquiries
      </Link>

      <Card>
        <CardHeader
          title={detail.subject}
          subtitle={`From ${detail.staffName ?? "Staff"}`}
          action={
            canUpdate ? (
              <div className="flex flex-wrap items-end gap-2">
                <div className="w-40">
                  <Select
                    label="Status"
                    options={STATUS_OPTIONS}
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as StaffEnquiryStatus)}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  loading={statusSaving}
                  disabled={statusDraft === detail.status}
                  onClick={() => void saveStatus()}
                >
                  Save status
                </Button>
              </div>
            ) : (
              <span className="text-sm font-semibold text-text-muted">
                {detail.status === "resolved" ? "Resolved" : "Open"}
              </span>
            )
          }
        />
        <div className="space-y-4 px-4 pb-6 md:px-6">
          <ul className="space-y-4">
            {thread.map((m) => (
              <li
                key={m.key}
                className={`flex ${m.isStaff ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={
                    m.isStaff
                      ? "max-w-[min(100%,36rem)] rounded-2xl rounded-bl-md border border-border bg-surface-alt px-4 py-3 text-text-heading"
                      : "max-w-[min(100%,36rem)] rounded-2xl rounded-br-md bg-primary-muted px-4 py-3 text-text-heading"
                  }
                >
                  <p className="text-xs font-semibold text-text-muted">
                    {m.authorName}
                    {m.isStaff ? " (staff)" : " (admin)"} · {formatDateTime(m.at)}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{m.body}</p>
                </div>
              </li>
            ))}
          </ul>

          {canUpdate ? (
            <div className="border-t border-border pt-4">
              <Textarea
                label="Admin reply"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
                placeholder="Type a reply to the staff member…"
              />
              <Button
                type="button"
                className="mt-3"
                loading={replying}
                disabled={!replyText.trim()}
                onClick={() => void sendReply()}
              >
                Send reply
              </Button>
            </div>
          ) : (
            <p className="text-sm text-text-muted">
              You can view this thread. Ask a super admin to grant{" "}
              <code className="rounded bg-surface-alt px-1 text-xs">staff_enquiries.update</code> to
              reply or change status.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

export default memo(AdminStaffEnquiryDetailPage);

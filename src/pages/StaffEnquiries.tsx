import { memo, useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import { Card, CardHeader, Button, Modal, Input, Textarea } from "../components/ui";
import { toast } from "../lib/toast";
import { formatDateTime } from "../lib/orderUtils";
import type { StaffEnquiryListRow } from "../types";

function StaffEnquiriesPage() {
  const [rows, setRows] = useState<StaffEnquiryListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<StaffEnquiryListRow[]>(endpoints.staffEnquiriesMe);
      setRows(data);
    } catch (e) {
      toast.fromError(e, "Could not load enquiries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openModal = useCallback(() => {
    setSubject("");
    setBody("");
    setModalOpen(true);
  }, []);

  const handleCreate = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const s = subject.trim();
      const b = body.trim();
      if (!s || !b) {
        toast.error("Subject and message are required");
        return;
      }
      setSubmitting(true);
      try {
        const created = await api.post<StaffEnquiryListRow>(
          endpoints.staffEnquiriesMe,
          { subject: s, body: b },
        );
        setRows((prev) => [created, ...prev]);
        toast.success("Message sent to admin");
        setModalOpen(false);
      } catch (err) {
        toast.fromError(err, "Could not send");
      } finally {
        setSubmitting(false);
      }
    },
    [subject, body],
  );

  return (
    <div className="space-y-4">
      <CardHeader
        title="Ask admin"
        // subtitle="Questions, feedback, or complaints — admin can reply here."
        action={
          <Button type="button" onClick={openModal}>
            New message
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm text-text-muted">
            You haven&apos;t sent anything yet. Use <strong>New message</strong> to reach your
            admin team.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="transition-colors hover:border-primary/25">
                <Link to={`/enquiries/${r.id}`} className="block px-4 py-4 md:px-6">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-text-heading">{r.subject}</h2>
                    <span
                      className={
                        r.status === "resolved"
                          ? "rounded-full bg-success-bg px-2 py-0.5 text-xs font-semibold text-success"
                          : "rounded-full bg-primary-muted px-2 py-0.5 text-xs font-semibold text-primary"
                      }
                    >
                      {r.status === "resolved" ? "Resolved" : "Open"}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-text-muted">{r.preview}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-text-muted">
                    <span className="inline-flex items-center gap-1">
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      {r.replyCount} {r.replyCount === 1 ? "reply" : "replies"}
                    </span>
                    <span>Updated {formatDateTime(r.updatedAt)}</span>
                  </div>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        title="Message to admin"
        size="lg"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={submitting}
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" loading={submitting} onClick={(e) => void handleCreate(e)}>
              Send
            </Button>
          </div>
        }
      >
        <form className="space-y-4" onSubmit={(e) => void handleCreate(e)}>
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Question about payroll"
          />
          <Textarea
            label="Your message"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Describe your question, idea, or concern…"
          />
        </form>
      </Modal>
    </div>
  );
}

export default memo(StaffEnquiriesPage);

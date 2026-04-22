import {
  memo,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import { Link } from "react-router";
import {
  CubeIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Input,
  PageLoader,
  Select,
} from "../components/ui";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchSenders, selectSenders } from "../store/sendersSlice";
import {
  fetchSettings,
  selectSettings,
  selectSettingsLoading,
  updateSettings,
} from "../store/settingsSlice";
import type { PdfSize } from "../types";
import { toast } from "../lib/toast";

const pdfOptions = [
  { value: "thermal", label: "Thermal label (receipt printer)" },
  { value: "a4", label: "A4 — 2 labels per page" },
] as const;

function SettingsSection({
  icon: Icon,
  title,
  // description,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-xl)] border border-border bg-surface-alt/25 p-4 shadow-sm dark:bg-surface-alt/15 md:p-5">
      <div className="mb-4 flex gap-3 md:mb-5 md:items-start">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-lg)] border border-border bg-surface text-primary shadow-sm"
          aria-hidden
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-text-heading md:text-base">
            {title}
          </h3>
          {/* <p className="mt-1 text-xs leading-relaxed text-text-muted md:text-sm">
            {description}
          </p> */}
        </div>
      </div>
      <div className="space-y-4 md:space-y-5">{children}</div>
    </section>
  );
}

function AdminSettingsPage() {
  const dispatch = useAppDispatch();
  const senders = useAppSelector(selectSenders);
  const settings = useAppSelector(selectSettings);
  const settingsLoading = useAppSelector(selectSettingsLoading);
  const [pdfSize, setPdfSize] = useState<PdfSize>("thermal");
  const [senderId, setSenderId] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void dispatch(fetchSenders());
    void dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (!settings) return;
    setPdfSize(settings.defaultPdfSize);
    setSenderId(settings.defaultSenderId ?? "");
    setLowStockThreshold(String(settings.lowStockThreshold ?? 0));
  }, [settings]);

  const senderOptions = useMemo(
    () =>
      senders.map((s) => ({
        value: s.id,
        label: `${s.name}${s.isDefault ? " (default)" : ""}`,
      })),
    [senders],
  );

  const handleSave = async () => {
    if (!senderId) {
      toast.error("Select a default sender");
      return;
    }
    const threshold = parseInt(lowStockThreshold, 10);
    if (Number.isNaN(threshold) || threshold < 0) {
      toast.error("Low-stock threshold must be a non-negative whole number");
      return;
    }
    setSaving(true);
    try {
      await dispatch(
        updateSettings({
          defaultPdfSize: pdfSize,
          defaultSenderId: senderId,
          lowStockThreshold: threshold,
        }),
      ).unwrap();
      await dispatch(fetchSenders()).unwrap();
      toast.success("Settings updated");
    } catch (err) {
      toast.fromError(err, "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const formReady = Boolean(settings);
  const showLoader = settingsLoading && !settings;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card className="overflow-hidden">
        <CardHeader
          title="Settings"
          subtitle="Defaults for shipping labels, PDFs, and low-stock alerts on admin and staff dashboards."
          action={
            <Button
              type="button"
              size="sm"
              loading={saving}
              disabled={!formReady}
              className="w-full sm:w-auto"
              onClick={() => void handleSave()}
            >
              Save changes
            </Button>
          }
        />

        {showLoader ? (
          <PageLoader
            minHeight="min-h-[220px]"
            className="rounded-[var(--radius-lg)] bg-surface-alt/20"
            label="Loading settings…"
          />
        ) : (
          <div className="space-y-6 md:space-y-8">
            <SettingsSection
              icon={DocumentTextIcon}
              title="Labels & PDFs"
              description="Choose who shipments are sent from and the default layout when staff download order labels."
            >
              {senders.length === 0 ? (
                <div className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  No senders configured yet.{" "}
                  <Link
                    to="/admin/senders"
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    Add a sender
                  </Link>{" "}
                  before you can save these settings.
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                <Select
                  label="Default sender"
                  placeholder="Select sender"
                  options={senderOptions}
                  value={senderId}
                  onChange={(e) => setSenderId(e.target.value)}
                />
                <div className="space-y-2">
                  <Select
                    label="Default PDF size"
                    placeholder=""
                    options={[...pdfOptions]}
                    value={pdfSize}
                    onChange={(e) => setPdfSize(e.target.value as PdfSize)}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-text-muted">Preview:</span>
                    <Badge variant="default">
                      {pdfSize === "thermal" ? "Thermal" : "A4"}
                    </Badge>
                  </div>
                </div>
              </div>
            </SettingsSection>

            <SettingsSection
              icon={CubeIcon}
              title="Inventory alerts"
              description="Control when products show as low or out of stock on dashboards."
            >
              <Input
                label="Low-stock threshold"
                type="number"
                min={0}
                step={1}
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                hint="Products with stock at or below this number are highlighted. Use 0 for zero-only; use 5 to include anything at five units or less."
              />
            </SettingsSection>

            <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full shrink-0 sm:w-auto"
                loading={saving}
                disabled={!formReady}
                onClick={() => void handleSave()}
              >
                Save changes
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

export default memo(AdminSettingsPage);

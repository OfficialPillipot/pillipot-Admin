import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  type TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  ArrowPathIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CurrencyRupeeIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
  SquaresPlusIcon,
  ChevronDownIcon,
  UserGroupIcon,
  UserPlusIcon,
  GlobeAltIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { cn } from "../lib/utils";
import { api } from "../api/client";
import { endpoints } from "../api/endpoints";
import {
  Card,
  CardTitle,
  Button,
  Table,
  Badge,
  SingleCalendarDateRangePicker,
  toDisplayDate,
} from "../components/ui";
import { formatCurrency } from "../lib/orderUtils";
import { toast } from "../lib/toast";
import type {
  SalesStatisticsResponse,
  SalesSeriesPoint,
} from "../types";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler,
);

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getInitialDateFrom(): string {
  const d = new Date();
  d.setDate(1); // 1st of current month
  return formatYMD(d);
}

function getInitialDateTo(): string {
  return formatYMD(new Date());
}

type MetricViewMode = "sales" | "orders" | "combined";

export default function AdminStatistics() {
  // Active date range & granularity
  const [dateFrom, setDateFrom] = useState<string>(getInitialDateFrom);
  const [dateTo, setDateTo] = useState<string>(getInitialDateTo);
  const [granularity, setGranularity] = useState<"day" | "month" | "year">("day");

  const handleResetDate = useCallback(() => {
    setGranularity("day");
    setDateFrom(getInitialDateFrom());
    setDateTo(getInitialDateTo());
  }, []);

  // Active chart display mode (Sales amount, Order count, or combined)
  const [chartMetric, setChartMetric] = useState<MetricViewMode>("sales");

  // Collapsible Period Breakdown (closed by default)
  const [isBreakdownOpen, setIsBreakdownOpen] = useState<boolean>(false);

  // Loading and Data state
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<SalesStatisticsResponse | null>(null);

  // Sticky behavior for Date Picker ONLY when scrolling
  const datePickerAnchorRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [stickyCoords, setStickyCoords] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (!mainEl) return;

    const handleScroll = () => {
      if (!datePickerAnchorRef.current) return;
      const rect = datePickerAnchorRef.current.getBoundingClientRect();
      const mainRect = mainEl.getBoundingClientRect();

      const targetTop = mainRect.top + 8;
      if (rect.top <= targetTop) {
        setIsSticky(true);
        const rightDist = window.innerWidth - rect.right;
        setStickyCoords({ top: targetTop, right: Math.max(16, rightDist) });
      } else {
        setIsSticky(false);
      }
    };

    mainEl.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      mainEl.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const fetchStatistics = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("granularity", granularity);
      params.set("dateFrom", dateFrom);
      params.set("dateTo", dateTo);
      if (granularity === "month") {
        params.set("year", dateFrom.split("-")[0]);
      } else if (granularity === "year") {
        params.set("year", dateTo.split("-")[0]);
      }

      const res = await api.get<SalesStatisticsResponse>(
        endpoints.ordersSalesStatistics(params.toString())
      );
      setData(res);
    } catch (err) {
      toast.fromError(err, "Failed to load sales statistics");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, granularity]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Export current series to CSV
  const handleExportCsv = () => {
    if (!data || !data.series.length) {
      toast.info("No data available to export.");
      return;
    }

    const headers = [
      "Label",
      "Date Key",
      "Total Sales (INR)",
      "Total Orders",
      "Delivered Sales (INR)",
      "Delivered Orders",
      "Cancelled Orders",
      "Items Sold",
      "New Customers",
      "Logged-in Visits",
      "Guest Visits",
      "Total Traffic",
    ];

    const rows = data.series.map((pt) => [
      `"${pt.label}"`,
      `"${pt.dateKey}"`,
      pt.sales,
      pt.orders,
      pt.deliveredSales,
      pt.deliveredOrders,
      pt.cancelledOrders,
      pt.quantity,
      pt.newCustomers || 0,
      pt.loggedInTraffic || 0,
      pt.guestTraffic || 0,
      pt.totalTraffic || 0,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `sales_statistics_${data.dateFrom}_to_${data.dateTo}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Sales statistics exported successfully.");
  };

  // Line Chart Configuration
  const chartData = useMemo(() => {
    if (!data?.series?.length) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = data.series.map((s) => s.label);
    const salesValues = data.series.map((s) => s.sales);
    const orderValues = data.series.map((s) => s.orders);
    const deliveredSalesValues = data.series.map((s) => s.deliveredSales);

    const datasets: any[] = [];

    if (chartMetric === "sales" || chartMetric === "combined") {
      datasets.push({
        label: "Total Sales (₹)",
        data: salesValues,
        borderColor: "rgb(99, 102, 241)", // Indigo
        backgroundColor: "rgba(99, 102, 241, 0.12)",
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: data.series.length > 20 ? 3 : 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgb(99, 102, 241)",
        yAxisID: "y",
      });

      datasets.push({
        label: "Delivered Sales (₹)",
        data: deliveredSalesValues,
        borderColor: "rgb(16, 185, 129)", // Emerald
        backgroundColor: "rgba(16, 185, 129, 0.05)",
        fill: false,
        borderDash: [5, 5],
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 2.5,
        pointHoverRadius: 5,
        pointBackgroundColor: "rgb(16, 185, 129)",
        yAxisID: "y",
      });
    }

    if (chartMetric === "orders" || chartMetric === "combined") {
      datasets.push({
        label: "Total Orders",
        data: orderValues,
        borderColor: "rgb(14, 165, 233)", // Sky Blue
        backgroundColor: "rgba(14, 165, 233, 0.12)",
        fill: chartMetric === "orders",
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: data.series.length > 20 ? 3 : 4,
        pointHoverRadius: 6,
        pointBackgroundColor: "rgb(14, 165, 233)",
        yAxisID: chartMetric === "combined" ? "y1" : "y",
      });
    }

    return {
      labels,
      datasets,
    };
  }, [data, chartMetric]);

  const chartOptions = useMemo(() => {
    const isCombined = chartMetric === "combined";
    const isOrdersOnly = chartMetric === "orders";

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: {
              size: 12,
              weight: 500,
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          titleFont: { size: 13, weight: "bold" as const },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx: TooltipItem<"line">) => {
              const label = ctx.dataset.label || "";
              const val = Number(ctx.parsed.y || 0);
              if (label.includes("(₹)") || (!isOrdersOnly && ctx.datasetIndex !== 2)) {
                if (label.includes("Orders")) {
                  return ` ${label}: ${val}`;
                }
                return ` ${label}: ${formatCurrency(val)}`;
              }
              return ` ${label}: ${val}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(148, 163, 184, 0.12)",
          },
          ticks: {
            font: { size: 11 },
            maxRotation: 45,
            minRotation: 0,
          },
        },
        y: {
          type: "linear" as const,
          display: true,
          position: "left" as const,
          grid: {
            color: "rgba(148, 163, 184, 0.12)",
          },
          ticks: {
            font: { size: 11 },
            callback: (v: any) => {
              if (isOrdersOnly) return v;
              if (v >= 1000000) return `₹${(v / 1000000).toFixed(1)}M`;
              if (v >= 1000) return `₹${(v / 1000).toFixed(0)}k`;
              return `₹${v}`;
            },
          },
        },
        ...(isCombined
          ? {
            y1: {
              type: "linear" as const,
              display: true,
              position: "right" as const,
              grid: {
                drawOnChartArea: false,
              },
              ticks: {
                font: { size: 11 },
                precision: 0,
              },
            },
          }
          : {}),
      },
    };
  }, [chartMetric]);

  // Chart.js data configuration for New Customers graph
  const customersChartData = useMemo(() => {
    if (!data?.series?.length) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = data.series.map((s) => s.label);
    const customerValues = data.series.map((s) => s.newCustomers || 0);

    return {
      labels,
      datasets: [
        {
          label: "New Customers",
          data: customerValues,
          borderColor: "rgb(13, 148, 136)", // Teal 600
          backgroundColor: "rgba(13, 148, 136, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: data.series.length > 20 ? 3 : 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "rgb(13, 148, 136)",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
        },
      ],
    };
  }, [data]);

  const customersChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: {
              size: 12,
              weight: 500,
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          titleFont: { size: 13, weight: "bold" as const },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx: TooltipItem<"line">) => {
              const val = Number(ctx.parsed.y || 0);
              return ` New Customers: ${val}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(148, 163, 184, 0.12)",
          },
          ticks: {
            font: { size: 11 },
            maxRotation: 45,
            minRotation: 0,
          },
        },
        y: {
          type: "linear" as const,
          display: true,
          beginAtZero: true,
          grid: {
            color: "rgba(148, 163, 184, 0.12)",
          },
          ticks: {
            font: { size: 11 },
            precision: 0,
            stepSize: 1,
          },
        },
      },
    };
  }, []);

  // Chart.js data configuration for Web App Traffic Comparison graph
  const trafficChartData = useMemo(() => {
    if (!data?.series?.length) {
      return {
        labels: [],
        datasets: [],
      };
    }

    const labels = data.series.map((s) => s.label);
    const loggedInValues = data.series.map((s) => s.loggedInTraffic || 0);
    const guestValues = data.series.map((s) => s.guestTraffic || 0);

    return {
      labels,
      datasets: [
        {
          label: "Logged-in Users",
          data: loggedInValues,
          borderColor: "rgb(139, 92, 246)", // Violet 500
          backgroundColor: "rgba(139, 92, 246, 0.12)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: data.series.length > 20 ? 3 : 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "rgb(139, 92, 246)",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
        },
        {
          label: "Guest (Non-logged-in) Users",
          data: guestValues,
          borderColor: "rgb(2, 132, 199)", // Sky 600
          backgroundColor: "rgba(2, 132, 199, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: data.series.length > 20 ? 3 : 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "rgb(2, 132, 199)",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 1.5,
        },
      ],
    };
  }, [data]);

  const trafficChartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: "top" as const,
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            font: {
              size: 12,
              weight: 500,
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          titleFont: { size: 13, weight: "bold" as const },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: (ctx: TooltipItem<"line">) => {
              const label = ctx.dataset.label || "";
              const val = Number(ctx.parsed.y || 0);
              return ` ${label}: ${val}`;
            },
            footer: (items: TooltipItem<"line">[]) => {
              let total = 0;
              for (const it of items) {
                total += Number(it.parsed.y || 0);
              }
              return total > 0 ? `Total Traffic: ${total}` : "";
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: "rgba(148, 163, 184, 0.12)",
          },
          ticks: {
            font: { size: 11 },
            maxRotation: 45,
            minRotation: 0,
          },
        },
        y: {
          type: "linear" as const,
          display: true,
          beginAtZero: true,
          grid: {
            color: "rgba(148, 163, 184, 0.12)",
          },
          ticks: {
            font: { size: 11 },
            precision: 0,
            stepSize: 1,
          },
        },
      },
    };
  }, []);

  // Subtitle date description
  const dateRangeDescription = useMemo(() => {
    if (!data) return "";
    const count = data.series.length;
    const unit =
      data.granularity === "year"
        ? "years"
        : data.granularity === "month"
        ? "months"
        : "days";
    if (data.granularity === "month") {
      const y = data.dateFrom ? data.dateFrom.split("-")[0] : "";
      return `Year ${y} (${count} months)`;
    }
    if (data.granularity === "year") {
      return `${data.dateFrom.split("-")[0]} to ${data.dateTo.split("-")[0]} (${count} years)`;
    }
    return `${toDisplayDate(data.dateFrom)} to ${toDisplayDate(data.dateTo)} (${count} ${unit})`;
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Top Header - Title & Actions (scrolls normally with the page) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
            <ChartBarIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-heading">
              Sales Statistics
            </h1>
            <p className="text-xs text-text-muted">
              Analyze revenue trends, orders, customers, and web app traffic.
            </p>
          </div>
        </div>

        {/* Right side: Export CSV and Date Picker on the EXACT SAME line */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={loading || !data?.series?.length}
            className="flex items-center gap-1.5 h-11 text-xs"
            title="Export CSV"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export CSV
          </Button>

          {/* Date Picker Slot - Perfect inline alignment initially, floats sticky when scrolled */}
          <div ref={datePickerAnchorRef} className="w-72 sm:w-[260px] h-11 shrink-0">
            <div
              className={cn(
                "w-72 sm:w-[260px] transition-all duration-150",
                isSticky
                  ? "fixed z-40 shadow-lg rounded-[var(--radius-md)] bg-surface/95 backdrop-blur-md border border-border"
                  : "relative"
              )}
              style={
                isSticky && stickyCoords
                  ? { top: stickyCoords.top, right: stickyCoords.right }
                  : undefined
              }
            >
              <SingleCalendarDateRangePicker
                dateFrom={dateFrom}
                dateTo={dateTo}
                onChange={(from, to) => {
                  if (from && to) {
                    setDateFrom(from);
                    setDateTo(to);
                  }
                }}
                onReset={handleResetDate}
                granularity={granularity}
                onGranularityChange={setGranularity}
                className="w-full"
                align="right"
                placeholder="Select date range"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Total Sales
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600">
              <CurrencyRupeeIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-heading">
              {data ? formatCurrency(data.totalSales) : "—"}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">Valid orders revenue</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Total Orders
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
              <ShoppingBagIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-heading">
              {data ? data.totalOrders.toLocaleString() : "—"}
            </span>
            {data && data.cancelledOrders > 0 && (
              <Badge variant="muted" className="text-[10px]">
                {data.cancelledOrders} cancelled
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">Orders placed</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Delivered Sales
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircleIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-heading">
              {data ? formatCurrency(data.deliveredSales) : "—"}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {data ? `${data.deliveredOrders} orders fulfilled` : "Delivered revenue"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              Items Sold
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600">
              <SquaresPlusIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-heading">
              {data ? data.totalQuantity.toLocaleString() : "—"}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">Total units ordered</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
              New Customers
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10 text-teal-600">
              <UserGroupIcon className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-text-heading">
              {data ? data.totalNewCustomers.toLocaleString() : "—"}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">Acquired in period</p>
        </Card>
      </div>

      {/* Line Chart Card with Collapsible Period Breakdown at the bottom */}
      <Card className="overflow-hidden p-0">
        <div className="p-6">
          <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between border-b border-border">
            <div>
              <CardTitle className="text-lg font-bold text-text-heading">
                Sales Trend
              </CardTitle>
              <p className="text-xs text-text-muted mt-0.5">{dateRangeDescription}</p>
            </div>

            {/* Metric switch for the line chart */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface p-1 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setChartMetric("sales")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  chartMetric === "sales"
                    ? "bg-primary text-white shadow-2xs"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                Sales (₹)
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("orders")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  chartMetric === "orders"
                    ? "bg-primary text-white shadow-2xs"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                Orders Count
              </button>
              <button
                type="button"
                onClick={() => setChartMetric("combined")}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  chartMetric === "combined"
                    ? "bg-primary text-white shadow-2xs"
                    : "text-text-muted hover:text-text-heading"
                }`}
              >
                Both (Combined)
              </button>
            </div>
          </div>

          {/* Chart Canvas */}
          <div className="mt-6 h-80 sm:h-96 w-full">
            {loading ? (
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <ArrowPathIcon className="h-5 w-5 animate-spin text-primary" />
                  Loading sales data...
                </div>
              </div>
            ) : !data?.series?.length ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">
                No sales records found for this period.
              </div>
            ) : (
              <Line data={chartData} options={chartOptions} />
            )}
          </div>
        </div>

        {/* Collapsible Period Breakdown Section inside Sales Trend bottom */}
        <div className="border-t border-border bg-surface-elevated/30">
          <button
            type="button"
            onClick={() => setIsBreakdownOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-surface-elevated/70 cursor-pointer"
            aria-expanded={isBreakdownOpen}
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-text-heading">
                Period Breakdown
              </span>
              <Badge variant="muted">
                {data?.series?.length ?? 0} data points
              </Badge>
              <span className="text-xs text-text-muted hidden sm:inline">
                {isBreakdownOpen ? "(Click to hide table)" : "(Click to view detailed table)"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <span>{isBreakdownOpen ? "Hide" : "Show"}</span>
              <ChevronDownIcon
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  isBreakdownOpen && "rotate-180 text-primary"
                )}
              />
            </div>
          </button>

          {isBreakdownOpen && (
            <div className="border-t border-border/60 overflow-x-auto p-4 sm:p-6 bg-surface">
              <Table
                data={data?.series ?? []}
                keyExtractor={(item) => item.dateKey}
                emptyMessage={loading ? "Loading breakdown..." : "No data available."}
                columns={[
                  {
                    key: "label",
                    header: "Period / Date",
                    render: (row: SalesSeriesPoint) => (
                      <div className="flex items-center gap-2">
                        <CalendarDaysIcon className="h-4 w-4 text-text-muted shrink-0" />
                        <div>
                          <span className="font-semibold text-text-heading">{row.label}</span>
                          <span className="block text-[11px] text-text-muted">{row.dateKey}</span>
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: "sales",
                    header: "Sales Amount",
                    render: (row: SalesSeriesPoint) => (
                      <span className="font-medium text-text-heading">
                        {formatCurrency(row.sales)}
                      </span>
                    ),
                  },
                  {
                    key: "orders",
                    header: "Total Orders",
                    render: (row: SalesSeriesPoint) => (
                      <Badge variant={row.orders > 0 ? "info" : "muted"}>
                        {row.orders} orders
                      </Badge>
                    ),
                  },
                  {
                    key: "deliveredSales",
                    header: "Delivered (Fulfilled)",
                    render: (row: SalesSeriesPoint) => (
                      <div className="text-xs">
                        <span className="font-medium text-emerald-600">
                          {formatCurrency(row.deliveredSales)}
                        </span>
                        <span className="block text-[11px] text-text-muted">
                          {row.deliveredOrders} delivered
                        </span>
                      </div>
                    ),
                  },
                  {
                    key: "cancelledOrders",
                    header: "Cancelled",
                    render: (row: SalesSeriesPoint) =>
                      row.cancelledOrders > 0 ? (
                        <span className="text-xs font-medium text-rose-600">
                          {row.cancelledOrders}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">0</span>
                      ),
                  },
                  {
                    key: "quantity",
                    header: "Units Sold",
                    render: (row: SalesSeriesPoint) => (
                      <span className="text-xs text-text-heading font-medium">
                        {row.quantity}
                      </span>
                    ),
                  },
                  {
                    key: "newCustomers",
                    header: "New Customers",
                    render: (row: SalesSeriesPoint) =>
                      row.newCustomers > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700">
                          +{row.newCustomers}
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">0</span>
                      ),
                  },
                  {
                    key: "traffic",
                    header: "Web Visits (User / Guest)",
                    render: (row: SalesSeriesPoint) => (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="inline-flex items-center rounded bg-violet-50 px-1.5 py-0.5 font-medium text-violet-700">
                          {row.loggedInTraffic || 0} user
                        </span>
                        <span className="inline-flex items-center rounded bg-sky-50 px-1.5 py-0.5 font-medium text-sky-700">
                          {row.guestTraffic || 0} guest
                        </span>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </div>
      </Card>

      {/* New Customers Trend Graph Card */}
      <Card className="p-6">
        <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between border-b border-border">
          <div>
            <div className="flex items-center gap-2.5">
              <CardTitle className="text-lg font-bold text-text-heading">
                New Customers Acquisition
              </CardTitle>
              {data && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                  <UserPlusIcon className="h-3.5 w-3.5" />
                  {data.totalNewCustomers} new customer{data.totalNewCustomers === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">{dateRangeDescription}</p>
          </div>
        </div>

        {/* Customer Chart Canvas */}
        <div className="mt-6 h-72 sm:h-80 w-full">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <ArrowPathIcon className="h-5 w-5 animate-spin text-teal-600" />
                Loading customer acquisition data...
              </div>
            </div>
          ) : !data?.series?.length ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">
              No customer records found for this period.
            </div>
          ) : (
            <Line data={customersChartData} options={customersChartOptions} />
          )}
        </div>
      </Card>

      {/* Web App Traffic Comparison Graph Card */}
      <Card className="p-6">
        <div className="flex flex-col gap-3 pb-5 sm:flex-row sm:items-center sm:justify-between border-b border-border">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <CardTitle className="text-lg font-bold text-text-heading flex items-center gap-2">
                <GlobeAltIcon className="h-5 w-5 text-violet-600" />
                Web App Traffic
              </CardTitle>
              {data && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                    <span className="h-2 w-2 rounded-full bg-violet-600" />
                    {data.totalLoggedInTraffic || 0} Logged-in
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                    <span className="h-2 w-2 rounded-full bg-sky-600" />
                    {data.totalGuestTraffic || 0} Guest
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-elevated border border-border px-2.5 py-0.5 text-xs font-medium text-text-muted">
                    <EyeIcon className="h-3.5 w-3.5" />
                    {data.totalTraffic || 0} Total Visits
                  </span>
                </div>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Traffic comparison of logged-in customers vs non-logged-in (guest) visitors • {dateRangeDescription}
            </p>
          </div>
        </div>

        {/* Traffic Chart Canvas */}
        <div className="mt-6 h-72 sm:h-80 w-full">
          {loading ? (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <ArrowPathIcon className="h-5 w-5 animate-spin text-violet-600" />
                Loading web app traffic data...
              </div>
            </div>
          ) : !data?.series?.length ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-text-muted">
              No traffic recorded for this period yet.
            </div>
          ) : (
            <Line data={trafficChartData} options={trafficChartOptions} />
          )}
        </div>
      </Card>
    </div>
  );
}

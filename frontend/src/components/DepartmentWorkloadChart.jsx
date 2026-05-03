import { useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  Title,
} from "chart.js";
import { BarChart3, Building2 } from "lucide-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Title);

/** Sort by total workload (compliance + appeal) descending for readability. */
function normalizeByDept(rows) {
  if (!rows?.length) return [];
  return [...rows].sort(
    (a, b) =>
      b.compliance +
      b.appeal -
      (a.compliance + a.appeal),
  );
}

function truncateLabel(s, max = 26) {
  if (!s || s.length <= max) return s || "—";
  return s.slice(0, max - 1) + "…";
}

/**
 * Verified-case workload: compliance vs appeal counts per department.
 * Horizontal stacked bars, gradients, smooth load animation.
 */
export default function DepartmentWorkloadChart({
  byDept = [],
  className = "",
  footerLinkTo = "/dashboard",
}) {
  const chartRef = useRef(null);

  const sorted = useMemo(() => normalizeByDept(byDept), [byDept]);
  const hasData = sorted.some((d) => d.compliance > 0 || d.appeal > 0);

  const { labels, compliance, appeal, totals } = useMemo(() => {
    const labelsInner = sorted.map((d) => truncateLabel(d.department));
    const complianceInner = sorted.map((d) => d.compliance ?? 0);
    const appealInner = sorted.map((d) => d.appeal ?? 0);
    const totalsInner = sorted.map(
      (d, i) => complianceInner[i] + appealInner[i],
    );
    return {
      labels: labelsInner,
      compliance: complianceInner,
      appeal: appealInner,
      totals: totalsInner,
    };
  }, [sorted]);

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          label: "Compliance required",
          data: compliance,
          stack: "w",
          borderSkipped: false,
          borderRadius: 6,
          maxBarThickness: 26,
          backgroundColor: (ctx) => {
            const { chart } = ctx;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return "rgba(34, 197, 94, 0.75)";
            const g = c.createLinearGradient(
              chartArea.left,
              0,
              chartArea.right,
              0,
            );
            g.addColorStop(0, "rgba(34, 197, 94, 0.45)");
            g.addColorStop(0.5, "rgba(52, 211, 153, 0.85)");
            g.addColorStop(1, "rgba(16, 185, 129, 0.95)");
            return g;
          },
        },
        {
          label: "Appeal recommended",
          data: appeal,
          stack: "w",
          borderSkipped: false,
          borderRadius: 6,
          maxBarThickness: 26,
          backgroundColor: (ctx) => {
            const { chart } = ctx;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return "rgba(245, 158, 11, 0.75)";
            const g = c.createLinearGradient(
              chartArea.left,
              0,
              chartArea.right,
              0,
            );
            g.addColorStop(0, "rgba(251, 191, 36, 0.5)");
            g.addColorStop(0.55, "rgba(245, 158, 11, 0.88)");
            g.addColorStop(1, "rgba(234, 88, 12, 0.9)");
            return g;
          },
        },
      ],
    }),
    [labels, compliance, appeal],
  );

  const maxTotal = useMemo(
    () => (totals.length ? Math.max(...totals, 1) : 1),
    [totals],
  );

  const options = useMemo(
    () => ({
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1100,
        easing: "easeOutQuart",
        delay: (ctx) => (ctx.type === "data" ? ctx.dataIndex * 42 : 0),
      },
      interaction: { mode: "index", intersect: false },
      datasets: {
        bar: { barPercentage: 0.9, categoryPercentage: 0.75 },
      },
      plugins: {
        title: {
          display: false,
        },
        legend: {
          position: "top",
          align: "end",
          labels: {
            color: "#9aa3bb",
            padding: 18,
            usePointStyle: true,
            pointStyle: "rectRounded",
            boxWidth: 12,
            boxHeight: 12,
            font: { size: 12, weight: "600", family: "'Inter', system-ui" },
          },
        },
        tooltip: {
          backgroundColor: "rgba(26, 29, 39, 0.97)",
          titleColor: "#e7eaf3",
          bodyColor: "#c7cbe0",
          borderColor: "rgba(99, 102, 241, 0.35)",
          borderWidth: 1,
          padding: 14,
          cornerRadius: 12,
          displayColors: true,
          boxPadding: 6,
          callbacks: {
            title: (items) => {
              const i = items[0]?.dataIndex;
              return sorted[i]?.department || items[0]?.label || "";
            },
            footer: (items) => {
              const i = items[0]?.dataIndex;
              if (i == null) return "";
              const t = totals[i];
              return t ? `Total actions tied to this dept: ${t}` : "";
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          beginAtZero: true,
          suggestedMax: maxTotal + Math.max(1, Math.ceil(maxTotal * 0.2)),
          ticks: {
            color: "#6c7591",
            precision: 0,
            stepSize: 1,
            font: { size: 11 },
          },
          grid: {
            color: "rgba(255,255,255,0.055)",
            drawBorder: false,
          },
          border: { display: false },
        },
        y: {
          stacked: true,
          ticks: {
            color: "#9aa3bb",
            font: { size: 11, weight: "500" },
            autoSkip: false,
          },
          grid: { display: false, drawBorder: false },
          border: { display: false },
        },
      },
    }),
    [sorted, totals, maxTotal],
  );

  /* Re-trigger draw after layout so gradients pick up chartArea. */
  useEffect(() => {
    const ch = chartRef.current;
    if (ch && hasData) requestAnimationFrame(() => ch.update("none"));
  }, [byDept, hasData]);

  const barCount = Math.max(sorted.length, 1);
  const chartHeight = Math.min(520, Math.max(220, 48 + barCount * 44));

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-line bg-surface/80 shadow-[0_0_0_1px_rgba(99,102,241,0.06)_inset] backdrop-blur-sm ${className}`}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative border-b border-line/80 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-brand-500/25 bg-brand-500/10 text-brand-400 shadow-[0_0_24px_-8px_rgba(99,102,241,0.5)]">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold leading-tight text-ink sm:text-xl">
                Department workload
              </h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-muted">
                <span className="inline-flex items-center gap-2 font-medium text-emerald-400/90">
                  <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-emerald-300 to-emerald-500 shadow-[0_0_12px_rgba(34,197,94,0.45)]" />{" "}
                  Green — compliance
                </span>
                <span className="mx-2 text-ink-dim">·</span>
                <span className="inline-flex items-center gap-2 font-medium text-amber-400/90">
                  <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-amber-300 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.35)]" />{" "}
                  Amber — appeal
                </span>
                <span className="text-ink-dim"> — verified cases only.</span>
              </p>
            </div>
          </div>
          <Link
            to={footerLinkTo}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-500/20 bg-brand-500/10 px-3 py-2 text-xs font-semibold text-brand-400 transition hover:border-brand-500/40 hover:bg-brand-500/15"
          >
            Full dashboard <span aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <div className="relative px-3 pb-4 pt-2 sm:px-5">
        {!hasData ? (
          <div
            className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-line bg-bg-subtle/50 px-6 py-14 text-center"
            style={{ minHeight: chartHeight }}
          >
            <Building2 className="h-12 w-12 text-ink-dim opacity-40" />
            <div>
              <p className="font-display text-base font-semibold text-ink">
                No verified workload yet
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
                Approve cases in the verification queue. This chart updates live
                with compliance vs appeal load per department.
              </p>
            </div>
            <Link to="/verify" className="btn-primary text-sm">
              Open verification queue
            </Link>
          </div>
        ) : (
          <div style={{ height: chartHeight }}>
            <Bar ref={chartRef} data={data} options={options} />
          </div>
        )}
      </div>
    </div>
  );
}

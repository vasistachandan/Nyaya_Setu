import {
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
  Gavel,
  ArrowRight,
  Workflow,
  ScrollText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getDashboard } from "../api/client";
import DepartmentWorkloadChart from "../components/DepartmentWorkloadChart";

const phases = [
  {
    n: "Phase 1",
    title: "Extract",
    desc: "Groq + PDF text — case details · parties · directions · timelines.",
    icon: ScrollText,
    color: "from-brand-500/20 to-brand-500/0",
  },
  {
    n: "Phase 2",
    title: "Action Plan",
    desc: "Compliance · appeal decision · timelines · responsible department.",
    icon: Workflow,
    color: "from-emerald-500/30 to-emerald-500/0",
  },
  {
    n: "Phase 3",
    title: "Human Verify",
    desc: "Side-by-side PDF + extraction · confidence scores · approve / edit / reject.",
    icon: ShieldCheck,
    color: "from-amber-500/30 to-amber-500/0",
  },
  {
    n: "Phase 4",
    title: "Dashboard",
    desc: "Department view · key actions · deadlines · trusted data only.",
    icon: LayoutDashboard,
    color: "from-sky-500/30 to-sky-500/0",
  },
];

export default function Landing() {
  const [dash, setDash] = useState(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      getDashboard()
        .then((d) => {
          if (alive) setDash(d);
        })
        .catch(() => {
          if (alive) setDash({ stats: { by_department: [] } });
        });
    load();
    const id = setInterval(load, 25_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="relative pt-6 sm:pt-10">
        <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[480px] w-[1100px] max-w-[120%] -translate-x-1/2 rounded-full bg-hero-glow opacity-60 blur-2xl" />
        <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
              Built for the CCMS — High Court of Karnataka
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              From court judgments to{" "}
              <span className="gradient-text">verified action plans.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-ink-muted">
              Nyaya Setu reads complex legal PDFs, extracts the directives that
              matter, drafts a structured action plan, and routes it through a
              human reviewer before anything reaches the dashboard. AI does the
              reading. Officials make the decisions.
            </p>
            <div className="mt-9 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label="PDF pages parsed" value="Multi-page" sub="full judgments" />
              <Stat label="Confidence per field" value="0–100%" sub="reviewer cues" />
              <Stat label="Departments" value="Routed" sub="from directives" />
              <Stat label="Human-in-the-loop" value="Always" sub="zero auto-publish" />
            </div>
          </div>

          <div className="relative">
            <FlowDiagram />
          </div>
        </div>
      </section>

      {/* Live department workload — same data as dashboard */}
      <section className="scroll-mt-24">
        <DepartmentWorkloadChart byDept={dash?.stats?.by_department} />
      </section>

      {/* Phases */}
      <section>
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold text-ink">
              Four phases. One trusted pipeline.
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Decision support — not full automation. Every record on the
              dashboard has a human signature behind it.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {phases.map((p) => (
            <div
              key={p.n}
              className="card relative overflow-hidden p-5 transition hover:border-brand-500/40"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${p.color}`}
              />
              <div className="relative">
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-bg-subtle">
                  <p.icon className="h-5 w-5 text-brand-400" />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-dim">
                  {p.n}
                </div>
                <h3 className="font-display text-lg font-semibold text-ink">
                  {p.title}
                </h3>
                <p className="mt-1 text-sm text-ink-muted">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-line bg-bg-subtle p-3">
      <div className="font-display text-xl font-bold text-ink">{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-dim">
        {label}
      </div>
      <div className="text-[11px] text-ink-dim">{sub}</div>
    </div>
  );
}

function FlowDiagram() {
  const items = [
    { icon: Gavel, title: "High Court CIS", desc: "Judgment PDF via CCMS" },
    { icon: ScrollText, title: "Extract", desc: "AI reads judgment text" },
    { icon: Workflow, title: "Action Plan", desc: "Structured directives" },
    { icon: ShieldCheck, title: "Verify", desc: "Human reviewer signs off" },
    { icon: LayoutDashboard, title: "Dashboard", desc: "Trusted view only" },
  ];
  return (
    <div className="relative">
      <div className="space-y-3">
        {items.map((it, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-2xl border border-line bg-surface/70 px-4 py-3 backdrop-blur transition hover:border-brand-500/40 hover:bg-surface"
          >
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-bg-subtle">
              <it.icon className="h-4 w-4 text-brand-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-ink">{it.title}</div>
              <div className="text-xs text-ink-muted">{it.desc}</div>
            </div>
            {i < items.length - 1 && (
              <ArrowRight className="h-4 w-4 text-brand-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

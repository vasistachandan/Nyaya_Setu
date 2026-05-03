import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CalendarClock,
  ClipboardCheck,
  Gavel,
  ScrollText,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  X,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { getDashboard, getCase } from "../api/client";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");
  const [openCase, setOpenCase] = useState(null);
  const [openDetails, setOpenDetails] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboard(department || undefined).then(setData).catch(() => setData({
      stats: { total_verified: 0, compliance_required: 0, appeals_recommended: 0, deadlines_30_days: 0, by_department: [] },
      cases: [], upcoming_deadlines: [],
    }));
  }, [department]);

  useEffect(() => {
    if (!openCase) {
      setOpenDetails(null);
      return;
    }
    getCase(openCase).then(setOpenDetails).catch(() => {});
  }, [openCase]);

  const cases = useMemo(() => {
    if (!data) return [];
    if (!search) return data.cases;
    const q = search.toLowerCase();
    return data.cases.filter((c) =>
      `${c.case_number || ""} ${c.court_name || ""} ${c.summary || ""}`
        .toLowerCase()
        .includes(q),
    );
  }, [data, search]);

  const allDepartments = useMemo(() => {
    if (!data) return [];
    const set = new Set();
    data.stats.by_department.forEach((d) => set.add(d.department));
    return Array.from(set).sort();
  }, [data]);

  if (!data) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Trusted Action Plans Dashboard
          </h1>
          <p className="text-sm text-ink-muted">
            Verified by officers · Live across {data.stats.total_verified} case(s).
            Department workload chart is on the{" "}
            <button
              type="button"
              onClick={() => navigate("/")}
              className="font-semibold text-brand-400 underline-offset-2 hover:underline"
            >
              home
            </button>{" "}
            page.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DepartmentFilter
            value={department}
            departments={allDepartments}
            onChange={setDepartment}
          />
          <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5">
            <Search className="h-4 w-4 text-ink-dim" />
            <input
              className="w-44 bg-transparent text-sm outline-none placeholder:text-ink-dim"
              placeholder="Search cases…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* Stats row */}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ClipboardCheck}
          label="Total verified cases"
          value={data.stats.total_verified}
          accent="brand"
        />
        <StatCard
          icon={Gavel}
          label="Compliance required"
          value={data.stats.compliance_required}
          accent="success"
        />
        <StatCard
          icon={ScrollText}
          label="Appeals recommended"
          value={data.stats.appeals_recommended}
          accent="warning"
        />
        <StatCard
          icon={CalendarClock}
          label="Deadlines in next 30 days"
          value={data.stats.deadlines_30_days}
          accent="danger"
        />
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        {/* Left: action cards */}
        <div className="space-y-4">
          <div className="grid gap-3 lg:grid-cols-2">
            {cases.length === 0 && (
              <div className="card col-span-full grid place-items-center px-6 py-16 text-center text-sm text-ink-dim">
                <ClipboardCheck className="mb-3 h-10 w-10 text-ink-dim" />
                No verified cases yet. Once reviewers approve cases, they will
                appear here.
                <button className="btn-primary mt-4" onClick={() => navigate("/verify")}>
                  Go to verification queue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            )}
            {cases.map((c) => (
              <ActionCard key={c.id} c={c} onOpen={() => setOpenCase(c.id)} />
            ))}
          </div>
        </div>

        {/* Right: deadlines */}
        <aside className="card flex h-fit max-h-[700px] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-danger/15 to-transparent px-4 py-3">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-danger" />
              <h3 className="font-display text-sm font-semibold text-ink">
                Upcoming Deadlines
              </h3>
            </div>
            <span className="text-xs text-ink-muted">
              {data.upcoming_deadlines.length} item(s)
            </span>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {data.upcoming_deadlines.length === 0 && (
              <div className="grid h-full place-items-center text-xs text-ink-dim">
                Nothing due. Cases without deadlines won't appear here.
              </div>
            )}
            {data.upcoming_deadlines.map((d, i) => (
              <DeadlineRow key={i} d={d} onClick={() => setOpenCase(d.case_id)} />
            ))}
          </div>
        </aside>
      </div>

      {/* Detail modal */}
      {openCase && (
        <CaseDetailModal
          data={openDetails}
          onClose={() => setOpenCase(null)}
        />
      )}
    </div>
  );
}

/** Custom dropdown: native OS select menus often render with a light panel on Windows. */
function DepartmentFilter({ value, departments, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const items = useMemo(
    () => [
      { id: "", label: "All departments" },
      ...departments.map((d) => ({ id: d, label: d })),
    ],
    [departments],
  );

  const current = items.find((i) => i.id === value) || items[0];

  return (
    <div
      className="relative flex min-w-[10rem] max-w-[min(100vw-4rem,20rem)] items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5"
      ref={ref}
    >
      <Filter className="h-4 w-4 shrink-0 text-ink-dim" />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-w-0 flex-1 items-center justify-between gap-2 border-0 bg-transparent py-0.5 text-left text-sm font-medium text-ink outline-none ring-0 focus-visible:outline-none"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{current.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-ink-dim transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-auto rounded-xl border border-line bg-gradient-to-b from-[#1e2233] to-[#181c2a] py-1 shadow-[0_20px_50px_-12px_rgba(0,0,0,.65),0_0_0_1px_rgba(99,102,241,0.08)_inset] backdrop-blur-md"
          role="listbox"
        >
          {items.map((item) => {
            const selected = value === item.id;
            return (
              <li key={item.id || "__all__"} role="option" aria-selected={selected}>
                <button
                  type="button"
                  className={`w-full px-3 py-2.5 text-left text-sm transition ${
                    selected
                      ? "bg-brand-500/20 font-semibold text-brand-300"
                      : "text-ink-muted hover:bg-surface-hover hover:text-ink"
                  }`}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                >
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  const map = {
    brand: "from-brand-500/20 to-brand-500/0 text-brand-400",
    success: "from-success/30 to-success/0 text-success",
    warning: "from-warning/30 to-warning/0 text-warning",
    danger: "from-danger/30 to-danger/0 text-danger",
  };
  return (
    <div className="card relative overflow-hidden p-4">
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${map[accent].split(" ").slice(0,2).join(" ")}`} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-dim">
            {label}
          </div>
          <div className="mt-1 font-display text-3xl font-bold text-ink">
            {value}
          </div>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl border border-line bg-bg-subtle ${map[accent].split(" ")[2]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function ActionCard({ c, onOpen }) {
  const both =
    c.action_required && c.action_required.includes("Compliance") && c.action_required.includes("Appeal");
  const appeal = c.action_required === "Appeal";
  return (
    <div className="card group relative overflow-hidden p-4 transition hover:border-brand-500/40">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-500/0 to-brand-500/0 opacity-0 transition group-hover:opacity-100 group-hover:from-brand-500/5" />
      <div className="relative">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="font-mono text-xs text-ink-dim">{c.case_number || "—"}</div>
            <div className="font-display text-sm font-semibold text-ink">
              {c.court_name || "Unknown court"}
            </div>
            <div className="text-[11px] text-ink-dim">
              Order dated {c.judgment_date || "—"}
            </div>
          </div>
          {both ? (
            <span className="pill-warning">Compliance + Appeal</span>
          ) : appeal ? (
            <span className="pill-warning">Appeal</span>
          ) : c.action_required ? (
            <span className="pill-success">{c.action_required}</span>
          ) : (
            <span className="pill-muted">No action</span>
          )}
        </div>

        <p className="mt-2 line-clamp-3 text-sm text-ink-muted">{c.summary}</p>

        {(c.responsible_departments || []).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {c.responsible_departments.map((d, i) => (
              <span key={i} className="pill-brand">
                <Building2 className="h-3 w-3" /> {d}
              </span>
            ))}
          </div>
        )}

        {c.nearest_deadline && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
            <CalendarClock className="h-3.5 w-3.5 text-warning" />
            Nearest deadline:{" "}
            <span className="font-mono text-ink">{c.nearest_deadline}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-end">
          <button onClick={onOpen} className="btn-ghost">
            <Eye className="h-4 w-4" /> View Full Details
          </button>
        </div>
      </div>
    </div>
  );
}

function DeadlineRow({ d, onClick }) {
  const days = d.days_remaining;
  const danger = days != null && days >= 0 && days < 7;
  const past = days != null && days < 0;
  return (
    <button
      onClick={onClick}
      className={`mb-2 w-full rounded-lg border px-3 py-2 text-left transition ${
        past
          ? "border-line bg-bg-subtle opacity-60"
          : danger
            ? "border-danger/40 bg-danger/10"
            : "border-line bg-surface hover:bg-surface-hover"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="font-mono text-xs font-semibold text-ink">
          {d.case_number || "—"}
        </div>
        <div
          className={`text-[11px] font-bold ${
            past ? "text-ink-dim" : danger ? "text-danger" : "text-ink-muted"
          }`}
        >
          {past ? "Overdue" : days === 0 ? "Today" : `${days}d`}
        </div>
      </div>
      <div className="text-xs text-ink-muted">{d.label}</div>
      <div className="mt-0.5 font-mono text-[11px] text-ink-dim">{d.date}</div>
      {danger && !past && (
        <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-danger">
          <AlertTriangle className="h-3 w-3" /> Urgent — &lt; 7 days
        </div>
      )}
    </button>
  );
}

function CaseDetailModal({ data, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4 backdrop-blur-sm">
      <div className="card-raised flex max-h-[90vh] w-[min(960px,96vw)] flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-brand-500/5 to-transparent px-5 py-3">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">
              {data?.case?.case_number || "Loading…"}
            </h3>
            <div className="text-xs text-ink-muted">
              {data?.case?.court_name} · Order dated {data?.case?.judgment_date}
            </div>
          </div>
          <button onClick={onClose} className="text-ink-dim hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-auto p-5">
          {!data ? (
            <div className="space-y-3">
              <div className="skeleton h-24 rounded-xl" />
              <div className="skeleton h-24 rounded-xl" />
              <div className="skeleton h-24 rounded-xl" />
            </div>
          ) : (
            <>
              <Block title="Summary">
                <p className="text-sm text-ink">{data.extraction?.summary || "—"}</p>
              </Block>
              <div className="grid gap-3 md:grid-cols-2">
                <Block title="Petitioner">
                  <p className="text-sm text-ink">{data.extraction?.parties?.petitioner || "—"}</p>
                </Block>
                <Block title="Respondent">
                  <p className="text-sm text-ink">{data.extraction?.parties?.respondent || "—"}</p>
                </Block>
              </div>
              <Block title={`Key Directions (${data.extraction?.key_directions?.length ?? 0})`}>
                <ol className="space-y-2 text-sm">
                  {(data.extraction?.key_directions || []).map((d, i) => (
                    <li key={i} className="rounded-lg border border-line bg-bg-subtle p-3">
                      <div className="text-ink">{d.direction}</div>
                      <div className="mt-1 text-[11px] text-ink-dim">
                        {d.paragraph_reference} · Confidence {Math.round((d.confidence||0)*100)}%
                      </div>
                    </li>
                  ))}
                </ol>
              </Block>
              <Block title="Action Plan">
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <KV k="Compliance required" v={data.extraction?.action_plan?.compliance_required ? "Yes" : "No"} />
                  <KV k="Appeal recommended" v={data.extraction?.action_plan?.appeal_recommended ? "Yes" : "No"} />
                  <KV k="Limitation period" v={data.extraction?.action_plan?.limitation_period} />
                  <KV k="Nature of action" v={data.extraction?.action_plan?.nature_of_action} />
                </div>
                <div className="mt-3">
                  <div className="field-label mb-1">Compliance Details</div>
                  <p className="text-sm text-ink">{data.extraction?.action_plan?.compliance_details || "—"}</p>
                </div>
                <div className="mt-3">
                  <div className="field-label mb-1">Appeal Rationale</div>
                  <p className="text-sm text-ink">{data.extraction?.action_plan?.appeal_rationale || "—"}</p>
                </div>
                <div className="mt-3">
                  <div className="field-label mb-1">Responsible Departments</div>
                  <div className="flex flex-wrap gap-1.5">
                    {(data.extraction?.action_plan?.responsible_departments || []).map((d, i) => (
                      <span key={i} className="pill-brand">{d}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="field-label mb-1">Key Dates</div>
                  <div className="space-y-1.5">
                    {(data.extraction?.action_plan?.key_dates || []).map((kd, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-sm">
                        <span>{kd.label} {kd.is_inferred && <span className="pill-warning ml-2">Inferred</span>}</span>
                        <span className="font-mono text-ink-muted">{kd.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Block>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h4 className="mb-2 font-display text-sm font-semibold text-ink">{title}</h4>
      {children}
    </section>
  );
}

function KV({ k, v }) {
  return (
    <div className="rounded-lg border border-line bg-bg-subtle px-3 py-2">
      <div className="field-label">{k}</div>
      <div className="text-sm text-ink">{v || "—"}</div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[0,1,2,3].map((i)=>(<div key={i} className="skeleton h-24 rounded-2xl" />))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {[0,1,2,3].map((i)=>(<div key={i} className="skeleton h-44 rounded-2xl" />))}
      </div>
    </div>
  );
}

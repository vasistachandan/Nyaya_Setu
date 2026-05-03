import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Search,
  Loader2,
  Check,
  X,
  PenSquare,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import {
  listCases,
  getCase,
  verifyCase,
  runExtraction,
  getCasePdfUrl,
} from "../api/client";
import PDFViewer from "../components/PDFViewer";
import StatusBadge from "../components/StatusBadge";
import ConfidenceBadge from "../components/ConfidenceBadge";
import ExtractionPanel from "../components/ExtractionPanel";

const EMPTY_PAYLOAD = {
  case_details: { case_number: "", court_name: "", date_of_order: "", bench: "" },
  parties: { petitioner: "", respondent: "" },
  key_directions: [],
  timelines: [],
  action_plan: {
    compliance_required: false,
    compliance_details: "",
    appeal_recommended: false,
    appeal_rationale: "",
    limitation_period: "",
    responsible_departments: [],
    nature_of_action: "",
    key_dates: [],
  },
  overall_confidence: 0,
  summary: "",
};

export default function VerifyPage() {
  const { caseId: routeId } = useParams();
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState(routeId ? Number(routeId) : null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [active, setActive] = useState(null);
  const [payload, setPayload] = useState(EMPTY_PAYLOAD);
  const [busy, setBusy] = useState(false);
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [edited, setEdited] = useState(false);
  const [activeField, setActiveField] = useState("");

  const refreshCases = async () => {
    try {
      const data = await listCases();
      setCases(data);
      if (!selectedId && data.length) {
        const firstPending = data.find((c) => c.status === "pending") || data[0];
        setSelectedId(firstPending.id);
      }
    } catch (e) {
      toast.error("Failed to load cases");
    }
  };

  useEffect(() => {
    refreshCases();
  }, []);

  useEffect(() => {
    setActiveField("");
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    setEdited(false);
    setBusy(true);
    getCase(selectedId)
      .then((data) => {
        setActive(data);
        setPayload(data.extraction || EMPTY_PAYLOAD);
        setReviewerNotes("");
      })
      .catch(() => toast.error("Failed to load case"))
      .finally(() => setBusy(false));
  }, [selectedId]);

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (search) {
        const hay = `${c.case_number || ""} ${c.court_name || ""} ${c.pdf_filename || ""}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [cases, search, statusFilter]);

  const onPanelChange = (next) => {
    setPayload(next);
    setEdited(true);
  };

  const onApprove = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const action = edited ? "edited" : "approved";
      await verifyCase(active.case.id, {
        action,
        edited_payload: payload,
        reviewer_notes: reviewerNotes || null,
      });
      toast.success(action === "edited" ? "Edits saved & approved." : "Case approved.");
      await refreshCases();
      const refreshed = await getCase(active.case.id);
      setActive(refreshed);
      setEdited(false);
    } catch (e) {
      toast.error("Approval failed");
    } finally {
      setBusy(false);
      setShowEditModal(false);
    }
  };

  const onReject = async () => {
    if (!active || !rejectReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    setBusy(true);
    try {
      await verifyCase(active.case.id, {
        action: "rejected",
        rejection_reason: rejectReason,
      });
      toast("Case rejected — sent back to queue", { icon: "↩" });
      setShowRejectModal(false);
      setRejectReason("");
      await refreshCases();
      const refreshed = await getCase(active.case.id);
      setActive(refreshed);
    } catch (e) {
      toast.error("Rejection failed");
    } finally {
      setBusy(false);
    }
  };

  const reExtract = async () => {
    if (!active) return;
    setBusy(true);
    try {
      const ext = await runExtraction(active.case.id);
      setPayload(ext);
      setEdited(false);
      toast.success("Re-extracted with AI.");
    } catch (e) {
      const d = e?.response?.data?.detail;
      const msg = typeof d === "string" ? d : Array.isArray(d) ? d.map((x) => x.msg || x).join(" ") : e.message;
      toast.error("Re-extraction failed: " + (msg || "Unknown error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      {/* Sidebar */}
      <aside className="card flex h-[calc(100vh-130px)] flex-col overflow-hidden">
        <div className="border-b border-line p-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-ink">
              Case Queue
            </h2>
            <button
              onClick={refreshCases}
              className="rounded-md border border-line bg-surface p-1.5 hover:bg-surface-hover"
              title="Refresh"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-bg-subtle px-2">
            <Search className="h-3.5 w-3.5 text-ink-dim" />
            <input
              className="w-full bg-transparent py-1.5 text-xs outline-none"
              placeholder="Search cases…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mt-2 flex gap-1 text-[11px]">
            {["all", "pending", "verified", "rejected"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md border px-2 py-0.5 capitalize ${
                  statusFilter === s
                    ? "border-brand-500/40 bg-brand-500/15 text-brand-400"
                    : "border-line bg-surface text-ink-muted hover:bg-surface-hover"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-2">
          {filtered.length === 0 && (
            <div className="grid h-full place-items-center px-4 text-center text-xs text-ink-dim">
              No cases match. Upload a judgment to get started.
            </div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedId(c.id);
                navigate(`/verify/${c.id}`);
              }}
              className={`mb-1.5 w-full rounded-lg border px-3 py-2 text-left transition ${
                selectedId === c.id
                  ? "border-brand-500/40 bg-brand-500/10"
                  : "border-line bg-surface hover:bg-surface-hover"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="truncate font-mono text-xs font-semibold text-ink">
                  {c.case_number || c.pdf_filename}
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-0.5 truncate text-[11px] text-ink-muted">
                {c.court_name || "Court not yet detected"}
              </div>
              {c.overall_confidence > 0 && (
                <div className="mt-1.5">
                  <ConfidenceBadge value={c.overall_confidence} />
                </div>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main */}
      <section className="card flex h-[calc(100vh-130px)] flex-col overflow-hidden">
        {!active ? (
          <div className="grid h-full place-items-center text-sm text-ink-dim">
            Select a case from the queue.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line bg-gradient-to-r from-brand-500/5 to-transparent px-5 py-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-semibold text-ink">
                    {active.case.case_number || active.case.pdf_filename}
                  </h2>
                  <StatusBadge status={active.case.status} />
                  {edited && (
                    <span className="pill-warning">
                      <PenSquare className="h-3 w-3" /> Unsaved edits
                    </span>
                  )}
                </div>
                <div className="text-xs text-ink-muted">
                  {active.case.court_name} · Order dated {active.case.judgment_date || "—"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={reExtract}
                  className="btn-ghost"
                  disabled={busy}
                  title="Re-run AI extraction"
                >
                  <Sparkles className="h-4 w-4" /> Re-extract
                </button>
              </div>
            </div>

            {/* Two-pane body */}
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-2">
              <div className="flex min-h-[min(380px,48vh)] shrink-0 flex-col overflow-hidden border-b border-line lg:h-full lg:min-h-0 lg:max-h-none lg:border-b-0 lg:border-r">
                <div className="shrink-0 border-b border-line bg-surface-raised/40 px-3 py-2">
                  <span className="inline-flex max-w-full rounded-full border border-indigo-500/35 bg-indigo-500/10 px-3 py-1 text-center text-[11px] font-medium leading-snug text-indigo-200">
                    Click any field on the right to highlight it in the document
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">
                  <PDFViewer
                    pdfUrl={getCasePdfUrl(active.case.id)}
                    searchText={activeField}
                  />
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-4">
                {busy ? (
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="skeleton h-32 rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <ExtractionPanel
                    value={payload}
                    onChange={onPanelChange}
                    activeField={activeField}
                    onFieldActivate={setActiveField}
                  />
                )}
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface-raised/40 px-5 py-3">
              <div className="text-xs text-ink-muted">
                {active.case.status === "verified"
                  ? "This case has been approved. Any further edits will be re-logged."
                  : active.case.status === "rejected"
                    ? "This case was rejected. Re-review and approve to send to dashboard."
                    : "Approve to publish to the dashboard. Edit & approve to log changes."}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={busy}
                  className="btn-danger"
                >
                  <X className="h-4 w-4" /> Reject
                </button>
                <button
                  onClick={() => setShowEditModal(true)}
                  disabled={busy || !edited}
                  className="btn-warning"
                  title={!edited ? "Make an edit first" : "Edit & approve with notes"}
                >
                  <PenSquare className="h-4 w-4" /> Edit &amp; Approve
                </button>
                <button onClick={onApprove} disabled={busy} className="btn-success">
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Approve
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Modals */}
      {showRejectModal && (
        <Modal title="Reject this extraction" onClose={() => setShowRejectModal(false)}>
          <p className="text-sm text-ink-muted">
            Provide a reason. The case will move to the rejected bucket and remain
            visible in the queue for re-review by another officer.
          </p>
          <textarea
            className="input mt-3 min-h-[120px]"
            placeholder="e.g. Direction extraction missed the costs paragraph; please re-run."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowRejectModal(false)}>
              Cancel
            </button>
            <button className="btn-danger" onClick={onReject} disabled={busy}>
              Reject case
            </button>
          </div>
        </Modal>
      )}
      {showEditModal && (
        <Modal title="Add reviewer notes" onClose={() => setShowEditModal(false)}>
          <p className="text-sm text-ink-muted">
            Briefly describe what you edited. Notes are stored against the case
            for audit purposes.
          </p>
          <textarea
            className="input mt-3 min-h-[120px]"
            placeholder="e.g. Corrected the limitation period from 30 to 90 days; added Finance Dept as responsible."
            value={reviewerNotes}
            onChange={(e) => setReviewerNotes(e.target.value)}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </button>
            <button className="btn-success" onClick={onApprove} disabled={busy}>
              Save edits & approve
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/70 backdrop-blur-sm">
      <div className="card-raised w-[min(560px,92vw)] p-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
          <button onClick={onClose} className="text-ink-dim hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

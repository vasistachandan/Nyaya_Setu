import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CloudUpload,
  FileText,
  Loader2,
  Sparkles,
  Check,
  ChevronRight,
} from "lucide-react";
import { uploadPdf, runExtraction } from "../api/client";

const STAGES = [
  { id: "upload", label: "Securing PDF", desc: "Saving to storage…" },
  { id: "ai", label: "Analysing with Groq", desc: "Reading directives & dates…" },
  { id: "plan", label: "Drafting action plan", desc: "Compliance / appeal / responsible dept…" },
  { id: "ready", label: "Ready for verification", desc: "Routed to reviewer queue." },
];

export default function UploadPage() {
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const onDrop = useCallback((accepted) => {
    if (accepted?.[0]) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
  });

  const start = async () => {
    if (!file) return;
    try {
      setStage(0);
      setProgress(0);
      const up = await uploadPdf(file, (p) => setProgress(p));
      setStage(1);
      const extracted = await runExtraction(up.case_id);
      setStage(2);
      await new Promise((r) => setTimeout(r, 600));
      setStage(3);
      setResult({ ...up, extracted });
      toast.success("Judgment analysed — ready for verification.");
    } catch (e) {
      toast.error("Failed to process: " + (e?.response?.data?.detail || e.message));
      setStage(-1);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="card overflow-hidden">
        <div className="border-b border-line bg-gradient-to-r from-brand-500/10 to-transparent px-6 py-4">
          <h1 className="font-display text-xl font-semibold text-ink">
            Upload a court judgment
          </h1>
          <p className="text-sm text-ink-muted">
            PDFs from the High Court CIS feed — multi-page, scanned or digital.
          </p>
        </div>

        <div className="p-6">
          {!result ? (
            <>
              <div
                {...getRootProps()}
                className={`relative cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition ${
                  isDragActive
                    ? "border-brand-400 bg-brand-500/10"
                    : "border-line bg-bg-subtle hover:border-brand-500/40"
                }`}
              >
                <input {...getInputProps()} />
                <CloudUpload
                  className={`mx-auto mb-3 h-12 w-12 ${
                    isDragActive ? "text-brand-400" : "text-ink-dim"
                  }`}
                />
                <div className="font-display text-lg font-semibold text-ink">
                  {file
                    ? file.name
                    : isDragActive
                      ? "Drop the judgment here"
                      : "Drag & drop a judgment PDF"}
                </div>
                <div className="mt-1 text-sm text-ink-muted">
                  or click to browse · PDF only · up to ~25 MB
                </div>
                {file && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs text-ink">
                    <FileText className="h-4 w-4 text-brand-400" />
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {file && (
                  <button
                    className="btn-ghost"
                    onClick={() => {
                      setFile(null);
                      setStage(-1);
                    }}
                    disabled={stage >= 0 && stage < 3}
                  >
                    Reset
                  </button>
                )}
                <button
                  className="btn-primary"
                  disabled={!file || (stage >= 0 && stage < 3)}
                  onClick={start}
                >
                  {stage >= 0 && stage < 3 ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analysing judgment with AI…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Run AI Extraction
                    </>
                  )}
                </button>
              </div>

              {stage >= 0 && (
                <div className="mt-8 space-y-3">
                  {STAGES.map((s, idx) => (
                    <StageRow
                      key={s.id}
                      stage={s}
                      state={
                        stage > idx ? "done" : stage === idx ? "active" : "pending"
                      }
                      progress={idx === 0 ? progress : null}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <ResultCard result={result} onNext={() => navigate(`/verify/${result.case_id}`)} onAnother={() => {
              setFile(null); setResult(null); setStage(-1);
            }} />
          )}
        </div>
      </div>

      <aside className="card p-6">
        <h3 className="font-display text-base font-semibold text-ink">
          What happens next?
        </h3>
        <ol className="mt-3 space-y-3 text-sm text-ink-muted">
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-400">
              1
            </span>
            Groq analyses page-tagged text extracted with pypdf, so paragraph
            markers align with the PDF for accurate direction extraction.
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-400">
              2
            </span>
            Each direction gets a confidence score. Anything below 60% is
            highlighted red on the verify page so reviewers know where to look.
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-400">
              3
            </span>
            Limitation periods that aren't explicit are inferred (90 days for
            High Court) and clearly marked as <span className="pill-warning">Inferred</span>.
          </li>
          <li className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500/20 text-xs font-bold text-brand-400">
              4
            </span>
            Only after a human reviewer approves does the case appear on the
            department dashboard.
          </li>
        </ol>
      </aside>
    </div>
  );
}

function StageRow({ stage, state, progress }) {
  const isActive = state === "active";
  const isDone = state === "done";
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
        isActive
          ? "border-brand-500/40 bg-brand-500/5"
          : isDone
            ? "border-success/40 bg-success/5"
            : "border-line bg-bg-subtle"
      }`}
    >
      <div className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-bg">
        {isDone ? (
          <Check className="h-4 w-4 text-success" />
        ) : isActive ? (
          <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-ink-dim" />
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-ink">{stage.label}</div>
        <div className="text-xs text-ink-muted">{stage.desc}</div>
        {progress !== null && isActive && (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-brand-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ result, onNext, onAnother }) {
  const ext = result.extracted;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-success/40 bg-success/5 p-5">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-success/40 bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
          <Check className="h-3 w-3" /> Extraction complete
        </div>
        <h2 className="font-display text-lg font-semibold text-ink">
          {ext?.case_details?.case_number || "Case"} —{" "}
          {ext?.case_details?.court_name || "court"}
        </h2>
        <p className="mt-1 text-sm text-ink-muted">{ext?.summary}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="pill-brand">
            {ext?.key_directions?.length ?? 0} directions
          </span>
          <span className="pill-brand">
            {ext?.timelines?.length ?? 0} timelines
          </span>
          {ext?.action_plan?.compliance_required && (
            <span className="pill-success">Compliance required</span>
          )}
          {ext?.action_plan?.appeal_recommended && (
            <span className="pill-warning">Appeal recommended</span>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button className="btn-ghost" onClick={onAnother}>
          Upload another
        </button>
        <button className="btn-primary" onClick={onNext}>
          Review &amp; verify <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

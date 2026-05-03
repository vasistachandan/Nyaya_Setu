import { useState } from "react";
import { Pencil, Check, X, FileText } from "lucide-react";
import { hasPdfSourceRef } from "../lib/hasPdfSource";

export default function EditableField({
  label,
  value,
  onChange,
  multiline = false,
  highlight = false,
  rightSlot = null,
  placeholder = "",
  /** Optional `{ page, quote }` from extraction — shows “from PDF” styling when set. */
  pdfSource = null,
  /** Current field value when this card is active (PDF highlight + ring). */
  activeField = "",
  /** Called with `String(value)` when the card is activated for PDF search. */
  onFieldActivate = null,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(value ?? "");
    setEditing(true);
  };

  const save = () => {
    onChange(draft);
    setEditing(false);
  };

  const strVal = String(value ?? "");
  const isActive = activeField !== "" && activeField === strVal;
  const fromPdf = hasPdfSourceRef(pdfSource);

  const handleCardActivate = (e) => {
    if (editing) return;
    if (e.target.closest("button")) return;
    onFieldActivate?.(strVal);
  };

  const clickable = Boolean(onFieldActivate) && !editing;

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleCardActivate : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onFieldActivate?.(strVal);
              }
            }
          : undefined
      }
      className={`group rounded-xl border p-3 transition ${
        clickable ? "cursor-pointer" : "cursor-default"
      } ${
        highlight
          ? "border-danger/40 bg-danger/5"
          : isActive
            ? `border-indigo-500 bg-bg-subtle${fromPdf ? " shadow-[inset_3px_0_0_0] shadow-amber-500/55" : ""}`
            : fromPdf
              ? "border-amber-500/25 bg-amber-500/[0.07] hover:border-amber-500/40"
              : "border-transparent bg-bg-subtle hover:border-brand-500/30"
      } ${fromPdf && !highlight && !isActive ? "shadow-[inset_3px_0_0_0] shadow-amber-500/55" : ""}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span className="field-label">{label}</span>
          {fromPdf && (
            <span
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100 ring-1 ring-amber-400/35"
              title="This value was linked to text in the judgment PDF during extraction. Click to highlight it."
            >
              <FileText className="h-3 w-3 opacity-90" aria-hidden />
              In PDF
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {rightSlot}
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              className="pointer-events-none opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 focus:pointer-events-auto focus:opacity-100"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5 text-ink-dim hover:text-brand-400" />
            </button>
          )}
        </div>
      </div>
      {editing ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          {multiline ? (
            <textarea
              autoFocus
              className="input min-h-[80px] resize-y"
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
            />
          ) : (
            <input
              autoFocus
              className="input"
              value={draft}
              placeholder={placeholder}
              onChange={(e) => setDraft(e.target.value)}
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md bg-success/90 px-2 py-1 text-xs font-medium text-black hover:bg-success"
              onClick={save}
            >
              <Check className="h-3 w-3" /> Save
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink-muted hover:bg-surface-hover"
              onClick={() => setEditing(false)}
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`relative z-10 min-h-[1.35em] select-text whitespace-pre-wrap break-words text-sm text-ink ${
            clickable ? "cursor-pointer" : ""
          }`}
          onClick={(e) => {
            e.stopPropagation();
            handleCardActivate(e);
          }}
        >
          {value ? (
            <span
              className={
                fromPdf
                  ? "rounded-md bg-amber-500/15 px-1.5 py-0.5 text-ink shadow-sm ring-1 ring-amber-500/20"
                  : undefined
              }
            >
              {value}
            </span>
          ) : (
            <span className="text-ink-dim italic">— not extracted —</span>
          )}
        </div>
      )}
    </div>
  );
}

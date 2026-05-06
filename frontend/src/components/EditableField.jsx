import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";

export default function EditableField({
  label,
  value,
  onChange,
  multiline = false,
  highlight = false,
  rightSlot = null,
  placeholder = "",
  fieldKey,
  pdfSource = null,
  activeFieldKey = "",
  onFieldActivate = null,
  /** Permanent cyan tile (Case Number, Court, Date of Order, Bench). Other fields use hover highlight. */
  alwaysHighlighted = false,
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
  const isActive = Boolean(fieldKey) && activeFieldKey === fieldKey;

  const handleCardActivate = (e) => {
    if (editing) return;
    if (e.target.closest("button")) return;
    if (!fieldKey || !onFieldActivate) return;
    onFieldActivate({ key: fieldKey, pdfSource: pdfSource ?? null, value: strVal });
  };

  const clickable = Boolean(fieldKey && onFieldActivate) && !editing;

  const surfaceClasses = (() => {
    if (highlight) {
      return "border-danger/45 bg-danger/[0.07] shadow-[inset_3px_0_0_0] shadow-danger/55";
    }
    if (isActive) {
      return [
        "border-cyan-400/50",
        "bg-gradient-to-br from-cyan-500/[0.12] via-brand-500/[0.06] to-indigo-500/10",
        "shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_8px_40px_-16px_rgba(34,211,238,0.15),0_12px_40px_-20px_rgba(99,102,241,0.2)]",
        "ring-1 ring-cyan-400/25",
      ].join(" ");
    }
    if (clickable) {
      if (alwaysHighlighted) {
        return [
          "border-cyan-400/40",
          "bg-gradient-to-br from-brand-500/[0.09] via-surface/80 to-cyan-500/[0.08]",
          "shadow-[0_0_0_1px_rgba(34,211,238,0.14),0_10px_40px_-16px_rgba(99,102,241,0.22)]",
          "active:scale-[0.995]",
        ].join(" ");
      }
      return [
        "border-line/80 bg-surface/50 shadow-sm shadow-black/20",
        "hover:border-cyan-400/40",
        "hover:bg-gradient-to-br hover:from-brand-500/[0.09] hover:via-surface/80 hover:to-cyan-500/[0.08]",
        "hover:shadow-[0_0_0_1px_rgba(34,211,238,0.14),0_10px_40px_-16px_rgba(99,102,241,0.22)]",
        "active:scale-[0.995]",
      ].join(" ");
    }
    return "border-line/50 bg-bg-subtle/90 shadow-sm shadow-black/15";
  })();

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
                onFieldActivate?.({ key: fieldKey, pdfSource: pdfSource ?? null, value: strVal });
              }
            }
          : undefined
      }
      className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 ease-out ${
        clickable ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1117]" : "cursor-default"
      } ${surfaceClasses}`}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <span
            className={`field-label transition-colors duration-200 ${
              isActive
                ? "text-cyan-200/90"
                : alwaysHighlighted && clickable
                  ? "text-cyan-100/70"
                  : clickable
                    ? "group-hover:text-cyan-100/70"
                    : ""
            }`}
          >
            {label}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {rightSlot}
          {!editing && (
            <button
              type="button"
              onClick={startEdit}
              className={`transition-opacity ${
                clickable && alwaysHighlighted
                  ? "opacity-60 hover:opacity-100"
                  : clickable
                    ? "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-65 hover:!opacity-100"
                    : "pointer-events-none opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100 focus:pointer-events-auto focus:opacity-100"
              }`}
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
          className={`relative z-10 min-h-[1.35em] select-text whitespace-pre-wrap break-words text-sm leading-relaxed ${
            value
              ? clickable
                ? isActive
                  ? "font-semibold tracking-tight text-cyan-50"
                  : alwaysHighlighted
                    ? "font-semibold tracking-tight text-cyan-50/95"
                    : "font-semibold tracking-tight text-white group-hover:text-cyan-50/95"
                : "font-semibold tracking-tight text-white"
              : "text-ink-dim"
          } ${clickable ? "cursor-pointer" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            handleCardActivate(e);
          }}
        >
          {value ? (
            value
          ) : (
            <span className="font-normal italic">— not extracted —</span>
          )}
        </div>
      )}
    </div>
  );
}

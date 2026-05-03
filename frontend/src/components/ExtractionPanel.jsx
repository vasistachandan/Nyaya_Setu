import { useState } from "react";
import {
  ScrollText,
  Users,
  Gavel,
  CalendarDays,
  ListChecks,
  Plus,
  Trash2,
  ShieldAlert,
  Building2,
} from "lucide-react";
import EditableField from "./EditableField";
import ConfidenceBadge from "./ConfidenceBadge";

function Section({ icon: Icon, title, accent = "brand", children, right = null }) {
  const colour =
    accent === "success"
      ? "from-success/30 to-success/5"
      : accent === "warning"
        ? "from-warning/30 to-warning/5"
        : accent === "danger"
          ? "from-danger/30 to-danger/5"
          : "from-brand-500/20 to-brand-500/5";
  return (
    <section className="card overflow-hidden">
      <header
        className={`flex items-center justify-between border-b border-line bg-gradient-to-r ${colour} px-4 py-2.5`}
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-ink" />
          <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
        </div>
        {right}
      </header>
      <div className="space-y-3 p-4">{children}</div>
    </section>
  );
}

export default function ExtractionPanel({ value, onChange, activeField, onFieldActivate }) {
  if (!value) return null;
  const v = value;

  const update = (path, newValue) => {
    const next = structuredClone(v);
    let cursor = next;
    for (let i = 0; i < path.length - 1; i++) cursor = cursor[path[i]];
    cursor[path[path.length - 1]] = newValue;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <Section icon={ScrollText} title="Case Details" accent="brand"
        right={<ConfidenceBadge value={v.overall_confidence} size="sm" />}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <EditableField
            label="Case Number"
            value={v.case_details.case_number}
            pdfSource={v.case_details.case_number_src}
            activeField={activeField}
            onFieldActivate={onFieldActivate}
            onChange={(val) => update(["case_details", "case_number"], val)}
          />
          <EditableField
            label="Court"
            value={v.case_details.court_name}
            pdfSource={v.case_details.court_name_src}
            activeField={activeField}
            onFieldActivate={onFieldActivate}
            onChange={(val) => update(["case_details", "court_name"], val)}
          />
          <EditableField
            label="Date of Order"
            value={v.case_details.date_of_order}
            pdfSource={v.case_details.date_of_order_src}
            activeField={activeField}
            onFieldActivate={onFieldActivate}
            onChange={(val) => update(["case_details", "date_of_order"], val)}
          />
          <EditableField
            label="Bench"
            value={v.case_details.bench}
            pdfSource={v.case_details.bench_src}
            activeField={activeField}
            onFieldActivate={onFieldActivate}
            onChange={(val) => update(["case_details", "bench"], val)}
          />
        </div>
        <EditableField
          label="Summary"
          multiline
          value={v.summary}
          pdfSource={v.summary_src}
          activeField={activeField}
          onFieldActivate={onFieldActivate}
          onChange={(val) => update(["summary"], val)}
        />
      </Section>

      <Section icon={Users} title="Parties Involved" accent="brand">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <EditableField
            label="Petitioner(s)"
            multiline
            value={v.parties.petitioner}
            activeField={activeField}
            onFieldActivate={onFieldActivate}
            onChange={(val) => update(["parties", "petitioner"], val)}
          />
          <EditableField
            label="Respondent(s)"
            multiline
            value={v.parties.respondent}
            activeField={activeField}
            onFieldActivate={onFieldActivate}
            onChange={(val) => update(["parties", "respondent"], val)}
          />
        </div>
      </Section>

      <Section
        icon={Gavel}
        title="Key Directions"
        accent="warning"
        right={
          <button
            className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs hover:bg-surface-hover"
            onClick={() => {
              update(["key_directions"], [
                ...v.key_directions,
                {
                  direction: "",
                  paragraph_reference: "",
                  confidence: 0.6,
                  source: null,
                },
              ]);
            }}
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        }
      >
        {v.key_directions.length === 0 && (
          <div className="text-xs italic text-ink-dim">No directions extracted.</div>
        )}
        <div className="space-y-3">
          {v.key_directions.map((d, idx) => {
            const lowConf = d.confidence < 0.6;
            return (
              <div
                key={idx}
                className={`rounded-xl border p-3 ${
                  lowConf
                    ? "border-danger/40 bg-danger/5"
                    : "border-line bg-bg-subtle"
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="field-label">Direction #{idx + 1}</span>
                  <div className="flex items-center gap-2">
                    <ConfidenceBadge value={d.confidence} />
                    <button
                      onClick={() =>
                        update(
                          ["key_directions"],
                          v.key_directions.filter((_, i) => i !== idx),
                        )
                      }
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-ink-dim hover:text-danger" />
                    </button>
                  </div>
                </div>
                <EditableField
                  label="Direction"
                  multiline
                  value={d.direction}
                  highlight={lowConf}
                  activeField={activeField}
                  onFieldActivate={onFieldActivate}
                  onChange={(val) =>
                    update(
                      ["key_directions"],
                      v.key_directions.map((x, i) =>
                        i === idx ? { ...x, direction: val } : x,
                      ),
                    )
                  }
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <EditableField
                    label="Paragraph Reference"
                    value={d.paragraph_reference}
                    activeField={activeField}
                    onFieldActivate={onFieldActivate}
                    onChange={(val) =>
                      update(
                        ["key_directions"],
                        v.key_directions.map((x, i) =>
                          i === idx ? { ...x, paragraph_reference: val } : x,
                        ),
                      )
                    }
                  />
                  <div className="rounded-xl border border-line bg-bg-subtle p-3">
                    <div className="field-label mb-1">Confidence</div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={d.confidence}
                      onChange={(e) =>
                        update(
                          ["key_directions"],
                          v.key_directions.map((x, i) =>
                            i === idx
                              ? { ...x, confidence: Number(e.target.value) }
                              : x,
                          ),
                        )
                      }
                      className="w-full"
                    />
                    <div className="text-xs text-ink-dim">
                      {Math.round(d.confidence * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section icon={CalendarDays} title="Timelines" accent="brand"
        right={
          <button
            className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs hover:bg-surface-hover"
            onClick={() =>
              update(
                ["timelines"],
                [...v.timelines, { event: "", date_or_period: "", is_inferred: false }],
              )
            }
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        }
      >
        {v.timelines.length === 0 && (
          <div className="text-xs italic text-ink-dim">No timelines extracted.</div>
        )}
        {v.timelines.map((t, idx) => (
          <div key={idx} className="rounded-xl border border-line bg-bg-subtle p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="field-label">Timeline #{idx + 1}</span>
              <div className="flex items-center gap-2">
                {t.is_inferred && (
                  <span className="pill-warning">
                    <ShieldAlert className="h-3 w-3" /> Inferred
                  </span>
                )}
                <button
                  onClick={() =>
                    update(
                      ["timelines"],
                      v.timelines.filter((_, i) => i !== idx),
                    )
                  }
                >
                  <Trash2 className="h-3.5 w-3.5 text-ink-dim hover:text-danger" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <EditableField
                label="Event"
                value={t.event}
                activeField={activeField}
                onFieldActivate={onFieldActivate}
                onChange={(val) =>
                  update(
                    ["timelines"],
                    v.timelines.map((x, i) => (i === idx ? { ...x, event: val } : x)),
                  )
                }
              />
              <EditableField
                label="Date / Period"
                value={t.date_or_period}
                activeField={activeField}
                onFieldActivate={onFieldActivate}
                onChange={(val) =>
                  update(
                    ["timelines"],
                    v.timelines.map((x, i) =>
                      i === idx ? { ...x, date_or_period: val } : x,
                    ),
                  )
                }
              />
            </div>
            <label className="mt-2 inline-flex items-center gap-2 text-xs text-ink-muted">
              <input
                type="checkbox"
                checked={t.is_inferred}
                onChange={(e) =>
                  update(
                    ["timelines"],
                    v.timelines.map((x, i) =>
                      i === idx ? { ...x, is_inferred: e.target.checked } : x,
                    ),
                  )
                }
              />
              Marked as inferred (calculated, not directly quoted)
            </label>
          </div>
        ))}
      </Section>

      <Section icon={ListChecks} title="Action Plan" accent="success">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ToggleField
            label="Compliance Required?"
            value={v.action_plan.compliance_required}
            onChange={(val) => update(["action_plan", "compliance_required"], val)}
            color="success"
          />
          <ToggleField
            label="Appeal Recommended?"
            value={v.action_plan.appeal_recommended}
            onChange={(val) => update(["action_plan", "appeal_recommended"], val)}
            color="warning"
          />
        </div>
        <EditableField
          label="Compliance Details"
          multiline
          value={v.action_plan.compliance_details}
          activeField={activeField}
          onFieldActivate={onFieldActivate}
          onChange={(val) => update(["action_plan", "compliance_details"], val)}
        />
        <EditableField
          label="Appeal Rationale"
          multiline
          value={v.action_plan.appeal_rationale}
          activeField={activeField}
          onFieldActivate={onFieldActivate}
          onChange={(val) => update(["action_plan", "appeal_rationale"], val)}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <EditableField
            label="Limitation Period"
            value={v.action_plan.limitation_period}
            activeField={activeField}
            onFieldActivate={onFieldActivate}
            onChange={(val) => update(["action_plan", "limitation_period"], val)}
          />
          <EditableField
            label="Nature of Action"
            value={v.action_plan.nature_of_action}
            activeField={activeField}
            onFieldActivate={onFieldActivate}
            onChange={(val) => update(["action_plan", "nature_of_action"], val)}
          />
        </div>

        <div className="rounded-xl border border-line bg-bg-subtle p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="field-label flex items-center gap-1">
              <Building2 className="h-3 w-3" /> Responsible Department(s)
            </span>
          </div>
          <DepartmentEditor
            value={v.action_plan.responsible_departments}
            onChange={(val) => update(["action_plan", "responsible_departments"], val)}
          />
        </div>

        <div className="rounded-xl border border-line bg-bg-subtle p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="field-label">Key Dates</span>
            <button
              className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs hover:bg-surface-hover"
              onClick={() =>
                update(
                  ["action_plan", "key_dates"],
                  [
                    ...v.action_plan.key_dates,
                    { label: "", date: "", is_inferred: false },
                  ],
                )
              }
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {v.action_plan.key_dates.map((kd, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 items-center gap-2 rounded-lg border border-line bg-surface px-2 py-1.5"
              >
                <input
                  className="input col-span-6"
                  placeholder="Label"
                  value={kd.label}
                  onChange={(e) =>
                    update(
                      ["action_plan", "key_dates"],
                      v.action_plan.key_dates.map((x, i) =>
                        i === idx ? { ...x, label: e.target.value } : x,
                      ),
                    )
                  }
                />
                <input
                  className="input col-span-4"
                  placeholder="YYYY-MM-DD"
                  value={kd.date}
                  onChange={(e) =>
                    update(
                      ["action_plan", "key_dates"],
                      v.action_plan.key_dates.map((x, i) =>
                        i === idx ? { ...x, date: e.target.value } : x,
                      ),
                    )
                  }
                />
                <label className="col-span-1 inline-flex items-center justify-center text-[10px] text-ink-muted">
                  <input
                    type="checkbox"
                    title="Inferred"
                    checked={kd.is_inferred}
                    onChange={(e) =>
                      update(
                        ["action_plan", "key_dates"],
                        v.action_plan.key_dates.map((x, i) =>
                          i === idx ? { ...x, is_inferred: e.target.checked } : x,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  className="col-span-1 grid place-items-center"
                  onClick={() =>
                    update(
                      ["action_plan", "key_dates"],
                      v.action_plan.key_dates.filter((_, i) => i !== idx),
                    )
                  }
                >
                  <Trash2 className="h-3.5 w-3.5 text-ink-dim hover:text-danger" />
                </button>
              </div>
            ))}
            {v.action_plan.key_dates.length === 0 && (
              <div className="text-xs italic text-ink-dim">No dates added.</div>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

function ToggleField({ label, value, onChange, color = "success" }) {
  const on =
    color === "success"
      ? "bg-success/15 border-success/40 text-success"
      : "bg-warning/15 border-warning/40 text-warning";
  return (
    <div className="rounded-xl border border-line bg-bg-subtle p-3">
      <div className="field-label mb-2">{label}</div>
      <div className="flex gap-2">
        <button
          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
            value ? on : "border-line text-ink-dim hover:bg-surface-hover"
          }`}
          onClick={() => onChange(true)}
        >
          Yes
        </button>
        <button
          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold ${
            !value ? "border-line text-ink hover:bg-surface-hover" : "border-line text-ink-dim"
          }`}
          onClick={() => onChange(false)}
        >
          No
        </button>
      </div>
    </div>
  );
}

const KARNATAKA_DEPARTMENTS = [
  "Revenue Department",
  "Public Works Department (PWD)",
  "Health Department",
  "Education Department",
  "Urban Development Department",
  "Finance Department",
  "Home Department",
  "Forest Department",
  "Rural Development & Panchayat Raj",
  "Transport Department",
  "Law Department",
];

function DepartmentEditor({ value, onChange }) {
  const [picker, setPicker] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(value || []).map((d, i) => (
          <span key={i} className="pill-brand">
            {d}
            <button
              className="ml-1 text-brand-400 hover:text-danger"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </span>
        ))}
        {(!value || value.length === 0) && (
          <span className="text-xs italic text-ink-dim">None assigned.</span>
        )}
      </div>
      <div className="flex gap-2">
        <select
          className="input flex-1"
          value={picker}
          onChange={(e) => setPicker(e.target.value)}
        >
          <option value="">+ Add department…</option>
          {KARNATAKA_DEPARTMENTS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <button
          className="btn-ghost"
          onClick={() => {
            if (picker) {
              onChange([...(value || []), picker]);
              setPicker("");
            }
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

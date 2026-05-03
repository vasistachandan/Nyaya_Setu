import { CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";

export default function ConfidenceBadge({ value = 0, size = "sm" }) {
  const pct = Math.round((value || 0) * 100);
  let cls = "pill-success";
  let Icon = CheckCircle2;
  if (value < 0.5) {
    cls = "pill-danger";
    Icon = AlertOctagon;
  } else if (value < 0.8) {
    cls = "pill-warning";
    Icon = AlertTriangle;
  }
  const sizing = size === "lg" ? "text-sm px-3 py-1" : "text-[11px]";
  return (
    <span className={`${cls} ${sizing}`} title="AI extraction confidence">
      <Icon className="h-3 w-3" />
      {pct}% confident
    </span>
  );
}

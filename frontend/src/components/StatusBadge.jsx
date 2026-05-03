import { Clock, CheckCircle2, XCircle } from "lucide-react";

export default function StatusBadge({ status }) {
  if (status === "verified")
    return (
      <span className="pill-success">
        <CheckCircle2 className="h-3 w-3" /> Verified
      </span>
    );
  if (status === "rejected")
    return (
      <span className="pill-danger">
        <XCircle className="h-3 w-3" /> Rejected
      </span>
    );
  return (
    <span className="pill-warning">
      <Clock className="h-3 w-3" /> Pending review
    </span>
  );
}

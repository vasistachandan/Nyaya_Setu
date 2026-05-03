import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Scale,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
  Gavel,
  ScrollText,
  Workflow,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e?.preventDefault?.();
    setError("");
    setBusy(true);
    try {
      const session = await login(email, password);
      toast.success(`Welcome back, ${session.name.split(" ")[0]}.`);
      const target = location.state?.from || "/";
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg">
      {/* Shared page-wide indigo backdrop */}
      <div className="pointer-events-none absolute inset-0 bg-hero-glow" />
      <div className="pointer-events-none absolute -left-32 top-24 h-[28rem] w-[28rem] rounded-full bg-brand-500/16 blur-3xl" />
      <div className="pointer-events-none absolute left-1/3 -top-24 h-96 w-96 rounded-full bg-brand-700/13 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[26rem] w-[26rem] rounded-full bg-brand-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-emerald-500/5 blur-3xl" />

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
        {/* ---------------- LEFT: Brand panel ---------------- */}
        <aside className="relative hidden flex-col justify-between overflow-hidden px-12 py-10 lg:flex">

          <div className="relative flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-glow">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-lg font-bold text-ink">
                Nyaya Setu
              </div>
              <div className="text-[12px] text-ink-dim">
                CCMS · AI Judgment Analyser
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
              For the High Court of Karnataka — CCMS
            </div>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-ink xl:text-5xl">
              From court judgments to{" "}
              <span className="gradient-text">verified action plans.</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] text-ink-muted">
              Sign in to read complex judgments, draft AI action plans, and
              approve only the records that should reach the department
              dashboard.
            </p>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <Feature icon={ScrollText} title="AI extraction" desc="PDF → structured JSON" />
              <Feature icon={Workflow} title="Action plan" desc="Compliance · appeal" />
              <Feature icon={ShieldCheck} title="Human verify" desc="Approve · edit · reject" />
              <Feature icon={Gavel} title="Trusted dashboard" desc="Verified records only" />
            </div>
          </div>

          <div className="relative text-xs text-ink-dim">
            © {new Date().getFullYear()} Nyaya Setu prototype · Built for the
            CCMS hackathon round 2.
          </div>
        </aside>

        {/* ---------------- RIGHT: Form panel ---------------- */}
        <section className="relative flex items-center justify-center px-5 py-10 sm:px-10">
          <div className="relative w-full max-w-md">
            <div className="lg:hidden">
              <div className="mb-6 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-glow">
                  <Scale className="h-5 w-5 text-white" />
                </div>
                <div className="leading-tight">
                  <div className="font-display text-base font-bold text-ink">
                    Nyaya Setu
                  </div>
                  <div className="text-[11px] text-ink-dim">
                    CCMS · AI Judgment Analyser
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-surface-raised/70 p-7 shadow-card backdrop-blur-md sm:p-8">
              <div className="mb-6">
                <h2 className="font-display text-2xl font-semibold text-ink">
                  Sign in to your account
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Use your departmental email & password to continue.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="field-label mb-1.5 block">Email</label>
                  <div
                    className={`flex items-center gap-2 rounded-xl border bg-bg-subtle px-3 transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30 ${
                      error ? "border-danger/50" : "border-line"
                    }`}
                  >
                    <Mail className="h-4 w-4 text-ink-dim" />
                    <input
                      autoFocus
                      type="email"
                      required
                      placeholder="admin@ccms.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="field-label">Password</label>
                    <button
                      type="button"
                      onClick={() => toast("Contact your CCMS admin to reset.", { icon: "🛡" })}
                      className="text-[11px] font-semibold text-brand-400 hover:text-brand-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div
                    className={`flex items-center gap-2 rounded-xl border bg-bg-subtle px-3 transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/30 ${
                      error ? "border-danger/50" : "border-line"
                    }`}
                  >
                    <Lock className="h-4 w-4 text-ink-dim" />
                    <input
                      type={showPw ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent py-2.5 text-sm text-ink placeholder:text-ink-dim outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="text-ink-dim transition hover:text-ink"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                    {error}
                  </div>
                )}

                <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-muted">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="h-3.5 w-3.5 accent-brand-500"
                  />
                  Keep me signed in on this device
                </label>

                <button type="submit" className="btn-primary w-full" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying credentials…
                    </>
                  ) : (
                    <>
                      Sign in <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-5 text-center text-[11px] text-ink-dim">
                By signing in you agree to the CCMS terms of use. All reviewer
                actions are logged for audit.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-line bg-bg-subtle p-3">
      <div className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface">
        <Icon className="h-4 w-4 text-brand-400" />
      </div>
      <div className="mt-2 text-sm font-semibold text-ink">{title}</div>
      <div className="text-[11px] text-ink-dim">{desc}</div>
    </div>
  );
}

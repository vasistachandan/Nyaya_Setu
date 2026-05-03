import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  Scale,
  Home,
  Upload,
  ShieldCheck,
  LayoutDashboard,
  Sparkles,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { listCases, getHealth } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import toast from "react-hot-toast";

const linkBase =
  "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition";
const linkActive = "bg-brand-500/15 text-brand-400 border border-brand-500/30";
const linkIdle =
  "text-ink-muted hover:text-ink hover:bg-surface-hover border border-transparent";

export default function Navbar() {
  const [counts, setCounts] = useState({ pending: 0, verified: 0 });
  const [health, setHealth] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      try {
        const [pending, verified] = await Promise.all([
          listCases("pending"),
          listCases("verified"),
        ]);
        if (!alive) return;
        setCounts({ pending: pending.length, verified: verified.length });
      } catch {
        /* ignore */
      }
      try {
        const h = await getHealth();
        if (alive) setHealth(h);
      } catch {
        /* ignore */
      }
    };
    refresh();
    const id = setInterval(refresh, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const onLogout = () => {
    logout();
    toast.success("Signed out.");
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
        <Link to="/" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-700 shadow-glow">
            <Scale className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col gap-1.5 leading-tight">
            <div className="font-display text-[17px] font-bold tracking-wide text-ink">
              Nyaya Setu
            </div>
            <div className="text-[14px] text-ink-dim">
              CCMS — AI Judgment Analyser
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
          >
            <Home className="h-4 w-4" /> Home
          </NavLink>
          <NavLink
            to="/upload"
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
          >
            <Upload className="h-4 w-4" /> Upload
          </NavLink>
          <NavLink
            to="/verify"
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
          >
            <ShieldCheck className="h-4 w-4" /> Verify
            {counts.pending > 0 && (
              <span className="ml-1 rounded-full bg-warning/20 px-1.5 text-[10px] font-bold text-warning">
                {counts.pending}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard
            {counts.verified > 0 && (
              <span className="ml-1 rounded-full bg-success/20 px-1.5 text-[10px] font-bold text-success">
                {counts.verified}
              </span>
            )}
          </NavLink>
        </nav>

        <div className="flex items-center gap-2">
          {health && !health.ai_configured ? (
            <span className="pill-warning hidden sm:inline-flex">
              <Sparkles className="h-3 w-3" /> Set GROQ_API_KEY
            </span>
          ) : health?.ai_configured ? (
            <span className="pill-brand hidden sm:inline-flex">
              <Sparkles className="h-3 w-3" /> Groq live
            </span>
          ) : null}

          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-1.5 transition hover:bg-surface-hover"
            >
              <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-[11px] font-bold text-white">
                {user?.initials || "AD"}
              </div>
              <div className="hidden text-left leading-tight sm:block">
                <div className="text-xs font-semibold text-ink">
                  {user?.name || "Reviewer"}
                </div>
                <div className="text-[10px] text-ink-dim">{user?.role || "Reviewer"}</div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-ink-dim" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface-raised shadow-card">
                <div className="border-b border-line px-4 py-3">
                  <div className="text-sm font-semibold text-ink">{user?.name}</div>
                  <div className="text-[11px] text-ink-muted">{user?.email}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="pill-brand">{user?.role}</span>
                    {user?.department && (
                      <span className="pill-muted">{user.department}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink hover:bg-surface-hover"
                >
                  <LogOut className="h-4 w-4 text-ink-dim" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

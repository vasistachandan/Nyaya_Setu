import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "nyaya.session.v1";

// Pre-provisioned reviewer accounts for the hackathon prototype.
// These are intentionally simple — production would replace this with the
// JWT scaffold already wired in the backend.
const USERS = [
  {
    id: "admin",
    name: "Admin Reviewer",
    email: "admin@ccms.in",
    password: "nyaya@2026",
    role: "Senior Reviewer",
    department: "Department of Law",
    initials: "AR",
  },
];

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login: async (email, password) => {
        await new Promise((r) => setTimeout(r, 450));
        const match = USERS.find(
          (u) =>
            u.email.toLowerCase() === (email || "").trim().toLowerCase() &&
            u.password === password,
        );
        if (!match) {
          throw new Error("Invalid credentials. Please check email & password.");
        }
        const { password: _pw, ...safe } = match;
        const session = { ...safe, signed_in_at: new Date().toISOString() };
        setUser(session);
        return session;
      },
      logout: () => setUser(null),
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

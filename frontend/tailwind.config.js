/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0f1117",
          subtle: "#141823",
        },
        surface: {
          DEFAULT: "#1a1d27",
          raised: "#222636",
          hover: "#262a3b",
        },
        line: "#2a2d3e",
        ink: {
          DEFAULT: "#e7eaf3",
          muted: "#9aa3bb",
          dim: "#6c7591",
        },
        brand: {
          DEFAULT: "#6366f1",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        danger: "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Sora'", "Inter", "ui-sans-serif", "system-ui"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(99,102,241,.35), 0 12px 40px -12px rgba(99,102,241,.5)",
        card: "0 1px 0 0 rgba(255,255,255,.04) inset, 0 30px 60px -30px rgba(0,0,0,.6)",
      },
      keyframes: {
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s infinite",
        floaty: "floaty 6s ease-in-out infinite",
      },
      backgroundImage: {
        "grid-fade":
          "radial-gradient(circle at top, rgba(99,102,241,.12), transparent 60%)",
        "hero-glow":
          "radial-gradient(900px 400px at 70% -10%, rgba(99,102,241,.16), transparent), radial-gradient(700px 300px at 10% 110%, rgba(34,197,94,.08), transparent)",
      },
    },
  },
  plugins: [],
};

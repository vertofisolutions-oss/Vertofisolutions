/**
 * Vertofi design tokens — the single source of truth for the design system.
 * Implements docs/12-ui-design-system.md. All apps extend this preset.
 *
 * Color distribution intent: ~80% white, 15% blue, 4% gold, 1% red.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1378F8", // primary blue — actions, accents, the only glow
          50: "#EBF3FE",
          100: "#D6E7FD",
          500: "#1378F8",
          600: "#0E63D6",
          700: "#0A4DA8",
        },
        gold: {
          DEFAULT: "#D59A07", // premium / success / elite / protection
          50: "#FBF4E1",
        },
        danger: {
          DEFAULT: "#EB1E1E", // risk / compliance issue / penalty / critical ONLY
        },
        bg: "#FFFFFF",
        bg2: "#F8FAFC", // secondary surfaces
        border: "#E5E7EB",
        borderCard: "#F1F5F9",
        ink: "#0F172A", // primary text (slate-900)
        muted: "#64748B", // neutral text (slate-500)
      },
      // Sharp, industry-standard surfaces (V4 design direction): flat 2-3px
      // corners platform-wide. Existing rounded-{lg,xl,2xl,card} classes all
      // resolve to sharp values — no per-component rewrites needed.
      borderRadius: {
        card: "2px",
        lg: "2px",
        xl: "3px",
        "2xl": "3px",
        "3xl": "4px",
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,.04)",
        soft: "0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(15,23,42,.04)",
        glow: "0 0 40px rgba(19,120,248,.15)", // blue only
      },
      fontFamily: {
        sans: ["var(--font-inter, 'Inter')", "Inter", "system-ui", "sans-serif"],
      },
      maxWidth: {
        container: "80rem",
      },
      transitionDuration: {
        DEFAULT: "250ms", // 200–300ms range, ease-out, no bouncing
      },
      transitionTimingFunction: {
        DEFAULT: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
};

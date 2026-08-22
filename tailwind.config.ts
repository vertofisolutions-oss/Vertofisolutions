import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3B82F6",
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        ink: {
          DEFAULT: "#0f172a",
          secondary: "#475569",
        },
        muted: "#64748b",
        border: "#e2e8f0",
        bg2: "#f8fafc",
        gold: {
          DEFAULT: "#D97706",
          50: "#fffbeb",
          500: "#F59E0B",
          600: "#D97706",
        },
        danger: {
          DEFAULT: "#EF4444",
          50: "#fef2f2",
        },
        success: {
          DEFAULT: "#10B981",
          50: "#ecfdf5",
        },
      },
      boxShadow: {
        soft: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        elevated: "0 10px 30px -4px rgba(0, 0, 0, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "next/link": path.resolve(__dirname, "./src/lib/link.tsx"),
      "next/navigation": path.resolve(__dirname, "./src/lib/navigation.ts"),
    },
  },
  build: {
    outDir: "dist",
  },
});

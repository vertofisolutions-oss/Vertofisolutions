import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve("./src"),
      "next/link": path.resolve("./src/lib/link.tsx"),
      "next/navigation": path.resolve("./src/lib/navigation.ts"),
      "next/image": path.resolve("./src/lib/image.tsx"),
      "next/dynamic": path.resolve("./src/lib/dynamic.tsx"),
      "next/font/google": path.resolve("./src/lib/font.ts"),
    },
  },
  build: {
    outDir: "dist",
  },
});

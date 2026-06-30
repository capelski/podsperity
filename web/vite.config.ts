import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Honor a PORT env var when set (e.g. by tooling); default to Vite's 5173.
  server: process.env.PORT
    ? { port: Number(process.env.PORT), strictPort: true }
    : undefined,
  build: {
    outDir: "dist",
  },
});

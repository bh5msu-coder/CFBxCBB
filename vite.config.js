import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base is set for GitHub Pages project-site hosting at /CFBxCBB/.
// Vite prefixes asset URLs with it so they resolve under the repo subpath.
export default defineConfig({
  base: "/CFBxCBB/",
  plugins: [react()],
  build: {
    // Split the stable React runtime into its own hashed chunk. App code changes
    // far more often than React does, so isolating the vendor keeps its
    // content-hash stable across deploys — returning visitors reuse the cached
    // react chunk (GitHub Pages serves hashed assets immutably) and only
    // re-download the small app chunk. Recharts is already isolated via the
    // dynamic import in App.jsx, so charts stay out of the initial payload.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
        },
      },
    },
  },
});

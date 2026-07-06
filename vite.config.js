import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base is set for GitHub Pages project-site hosting at /CFBxCBB/.
// Vite prefixes asset URLs with it so they resolve under the repo subpath.
export default defineConfig({
  base: "/CFBxCBB/",
  plugins: [react()],
});

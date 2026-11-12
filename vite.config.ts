import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The version put online without its server (Vercel, until the real server): built on Vercel or with BERETE_STATIC=1.
// It never asks the API; the forms go through WhatsApp (src/lib/site.ts, HAS_SERVER).
const hasServer = !(process.env.VERCEL === "1" || process.env.BERETE_STATIC === "1");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __HAS_SERVER__: JSON.stringify(hasServer) },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    // The 3D viewer (three.js and its tools, about 1.2 MB) is its own chunk, loaded only on the pages that show a model.
    chunkSizeWarningLimit: 1300,
    rolldownOptions: {
      output: {
        // Libraries in their own files: cached across visits and deployments.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
            { name: "motion", test: /node_modules[\\/](gsap|lenis)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    // The API (server/index.ts) runs on 3001 in development: npm run dev:server
    proxy: { "/api": "http://localhost:3001" },
  },
});

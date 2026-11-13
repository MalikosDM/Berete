import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The version put online without its server (Vercel, until the real server): built on Vercel or with BERETE_STATIC=1.
// It never asks the API; the forms go through WhatsApp (src/lib/site.ts, HAS_SERVER).
const hasServer = !(process.env.VERCEL === "1" || process.env.BERETE_STATIC === "1");

/**
 * The fonts of the first screen are asked for with the page (<link rel="preload">), not once the style sheet is read:
 * they are there before the text shows, so the text does not change font, and lines, under the visitor's eyes.
 */
function preloadFonts(): Plugin {
  const FIRST_SCREEN = /(cormorant-garamond-latin-(300|400)-normal|manrope-latin-(400|500|600)-normal)-[\w-]+\.woff2$/;
  return {
    name: "berete-preload-fonts",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const files = Object.keys(ctx.bundle ?? {}).filter((file) => FIRST_SCREEN.test(file));
        return files.map((file) => ({ tag: "link", attrs: { rel: "preload", href: "/" + file, as: "font", type: "font/woff2", crossorigin: "" }, injectTo: "head" as const }));
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), preloadFonts()],
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

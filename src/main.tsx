import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import Extensions from "./extensions";
import { loadLocale, localeOfPath } from "./i18n";
import { CatalogueProvider } from "./lib/catalogue";
// The fonts are served by the site itself (no wait for another server). Each file holds one
// alphabet: a page downloads only the ones it shows.
import "@fontsource/cormorant-garamond/300.css";
import "@fontsource/cormorant-garamond/300-italic.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/amiri/400.css";
import "@fontsource/amiri/700.css";
import "@fontsource/ibm-plex-sans-arabic/400.css";
import "@fontsource/ibm-plex-sans-arabic/500.css";
import "@fontsource/ibm-plex-sans-arabic/600.css";
import "./index.css";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <CatalogueProvider>
        <App />
        <Extensions />
      </CatalogueProvider>
    </BrowserRouter>
  </StrictMode>
);

// The words of the language of the address come first, so the page starts in it.
// A page pre-rendered at build time is hydrated; otherwise the app is rendered.
void loadLocale(localeOfPath(window.location.pathname))
  .catch(() => undefined)
  .then(() => {
    if (root.hasChildNodes()) hydrateRoot(root, app, { onRecoverableError: () => undefined });
    else createRoot(root).render(app);
  });

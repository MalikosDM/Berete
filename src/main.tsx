import { StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import Extensions from "./extensions";
import "./index.css";

const root = document.getElementById("root")!;
const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
      <Extensions />
    </BrowserRouter>
  </StrictMode>
);

// A page pre-rendered at build time is hydrated; otherwise the app is rendered.
if (root.hasChildNodes()) hydrateRoot(root, app, { onRecoverableError: () => undefined });
else createRoot(root).render(app);

import "@fontsource/public-sans/400.css";
import "@fontsource/public-sans/500.css";
import "@fontsource/public-sans/600.css";
import "@fontsource/public-sans/700.css";
// The website's colors (--paper, --ink, --blue, --line, ...): one source for both apps.
import "../ui/design-tokens.css";
import "./styles/tokens.css";
import "./styles/shell.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { registerOfflineApp } from "./modules/evidence/services/offline";

if (new URLSearchParams(window.location.search).has("dock")) {
  document.documentElement.dataset.orbitDock = "true";
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// Module 4: offline packaging — development never registers a service worker.
if (import.meta.env.PROD) {
  registerOfflineApp();
}

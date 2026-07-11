import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { OgPreview } from "./OgPreview.jsx";
import "./styles.css";

const isOgPreview = new URLSearchParams(window.location.search).has("og-preview");

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isOgPreview ? <OgPreview /> : <App />}
  </React.StrictMode>,
);

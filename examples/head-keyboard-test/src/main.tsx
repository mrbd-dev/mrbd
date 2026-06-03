import { createRoot } from "react-dom/client";
import { App } from "./App.js";

const el = document.getElementById("root");
if (!el) throw new Error("missing #root");

// No <StrictMode> on purpose: it double-invokes effects, which would start/stop
// the orientation sensor twice and muddy on-device debugging.
createRoot(el).render(<App />);

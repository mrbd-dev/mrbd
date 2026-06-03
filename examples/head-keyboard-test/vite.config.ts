import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// Dev-only endpoint so the in-browser key probe can stream events back to the
// terminal running `vite` (the device browser's console isn't visible here).
function probeLogEndpoint(): Plugin {
  return {
    name: "mrbd-probe-log",
    configureServer(server) {
      server.middlewares.use("/__probe", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end();
          return;
        }
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          try {
            const { text } = JSON.parse(body || "{}") as { text?: string };
            if (text) {
              const ts = new Date().toLocaleTimeString();
              // eslint-disable-next-line no-console
              console.log(`\u001b[36m[probe ${ts}]\u001b[0m ${text}`);
            }
          } catch {
            // ignore malformed payloads
          }
          res.statusCode = 204;
          res.end();
        });
      });
    },
  };
}

// Simple dev server for on-glasses prototyping. `host: true` binds to the LAN so
// a tunnel (ngrok / mrbd-cli) can reach it; `allowedHosts: true` lets the tunnel
// hostname through Vite's host check.
export default defineConfig({
  plugins: [react(), probeLogEndpoint()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
  },
});

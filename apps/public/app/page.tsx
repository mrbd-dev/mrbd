"use client";

import { useState } from "react";
import { GitHubRepoLink } from "./components/GitHubRepoLink";
import posthog from "posthog-js";

const CLI_COMMAND = "npm create mrbd-app@latest";

const packages = [
  {
    name: "@mrbd/core",
    body: "Constants and helpers for D-pad keys, sensors, location, and storage.",
  },
  {
    name: "@mrbd/react",
    body: "React components and hooks for fixed 600x600 layouts and focus navigation.",
  },
  {
    name: "create-mrbd-app",
    body: "CLI that scaffolds a Next.js starter with MRBD-safe defaults and mrbd-cli for npm run mrbd:start.",
  },
];

export default function PublicHome() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(CLI_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
      posthog.capture("cli_command_copied", { command: CLI_COMMAND });
    } catch {
      // ignore
    }
  }

  return (
    <main className="page">
      <nav className="nav">
        <span className="brand">
          <img src="/icons/mrbd-192.png" alt="" />
          <span>MRBD.dev</span>
        </span>
        <div>
          <a href="#packages">Packages</a>
          <a href="/docs">Docs</a>
          <GitHubRepoLink />
        </div>
      </nav>

      <section>
        <h1>npm packages for building web apps on Meta Ray-Ban Display glasses.</h1>
        <p className="lead">
          Reusable primitives, hooks, and a CLI for fixed 600x600 viewports, D-pad navigation, sensors, and
          location.
        </p>

        <div className="snippet" aria-label="CLI command">
          <pre>$ {CLI_COMMAND}</pre>
          <button type="button" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="links">
          <a href="/docs" onClick={() => posthog.capture("docs_link_clicked", { source: "hero" })}>Read the docs</a>
          <a href="#packages">View packages</a>
        </div>
      </section>

      <section id="packages">
        <h2>Packages</h2>
        <ul className="list">
          {packages.map((pkg) => (
            <li key={pkg.name}>
              <code>{pkg.name}</code>
              <span>{pkg.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer>
        Unofficial community tooling. Not affiliated with, endorsed by, or approved by Meta Platforms, Inc.,
        Ray-Ban, EssilorLuxottica, or their affiliates.
      </footer>
    </main>
  );
}

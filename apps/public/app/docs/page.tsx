const guides = [
  {
    title: "Getting started",
    body: "Run the CLI, install dependencies, and open the app in a 600x600 browser viewport.",
  },
  {
    title: "Viewport and layout",
    body: "Build for a fixed 600x600 canvas, avoid scrolling, and keep visible surfaces off pure black.",
  },
  {
    title: "D-pad navigation",
    body: "Every interactive control should be reachable with Arrow keys and activated with Enter.",
  },
  {
    title: "Sensors and permissions",
    body: "Request motion, orientation, and location permissions only from explicit user gestures.",
  },
  {
    title: "Storage",
    body: "Use localStorage or sessionStorage for lightweight JSON only, such as preferences and small state.",
  },
  {
    title: "Publishing and testing",
    body: "Deploy to a public HTTPS URL, then add the web app through the Meta AI app on a paired phone.",
  },
];

const packages = [
  {
    name: "@mrbd/core",
    body: "MRBD_VIEWPORT_SIZE, DPAD, requestAndStartMrbdSensors, getCurrentMrbdPosition, readStoredJson, writeStoredJson.",
  },
  {
    name: "@mrbd/react",
    body: "MrbdViewport, MrbdButton, useDpadNavigation, useMrbdSensors, useMrbdLocation.",
  },
  {
    name: "create-mrbd-app",
    body: "Run npm create mrbd-app@latest to scaffold a Next.js starter with MRBD-safe defaults.",
  },
];

const constraints = [
  "Fixed 600x600 px viewport.",
  "Avoid body scrolling and keep layouts shallow.",
  "Dark backgrounds, high-contrast text.",
  "No mouse, touch, hover, text input, camera, microphone, notifications, offline mode, or browser back.",
  "All interactive controls reachable with Arrow keys and Enter.",
  "Request sensor and location permissions from explicit user gestures.",
  "Clean up sensor listeners and geolocation watchers.",
  "Use Unicode symbols or high-resolution PNG icons. No SVG app icons.",
];

export default function DocsPage() {
  return (
    <main className="page">
      <nav className="nav">
        <a href="/" style={{ textDecoration: "none" }}>mrbd</a>
        <div>
          <a href="/">Home</a>
          <a href="#packages">Packages</a>
        </div>
      </nav>

      <section>
        <h1>Docs</h1>
        <p className="lead">
          Reference for the MRBD packages, the CLI, and the platform constraints they target.
        </p>
      </section>

      <section>
        <h2>Guides</h2>
        <ul className="list">
          {guides.map((guide) => (
            <li key={guide.title}>
              <code>{guide.title}</code>
              <span>{guide.body}</span>
            </li>
          ))}
        </ul>
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

      <section>
        <h2>Platform constraints</h2>
        <ul className="list">
          {constraints.map((constraint) => (
            <li key={constraint}>
              <code>—</code>
              <span>{constraint}</span>
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

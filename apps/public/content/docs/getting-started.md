---
title: Getting Started
description: "Create a new app with the CLI or install the runtime packages manually."
order: 2
---
# Getting Started

The fastest way to start is the CLI:

```bash
npm create mrbd-app@latest
```

The CLI asks for a project name, copies a Next.js starter template, and writes package metadata using that name.

Then run:

```bash
cd your-project-name
npm install
npm run dev
```

Open the app in a desktop browser and set DevTools to a `600x600` viewport. Use Arrow keys and Enter to test the same input model used by the glasses runtime.

## Add packages manually

For an existing React app:

```bash
npm install @mrbd/core @mrbd/react
```

For a non-React app:

```bash
npm install @mrbd/core
```

`@mrbd/core` is safe to import during server rendering. It checks for browser APIs when helpers are called.

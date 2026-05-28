# PostHog post-wizard report

The wizard has completed a deep integration of your project. PostHog analytics are now wired into the MRBD public site via `instrumentation-client.ts` (Next.js 15.3+ client-side init), a reverse proxy configured in `next.config.mjs`, and targeted event captures on the three highest-value user actions. Environment variables were written to `.env.local`. The `posthog-js` dependency was declared in `package.json` — run `npm install` from the monorepo root (`/Users/mattmichel/Documents/mrbd`) to install it, as the sandbox cannot write to the shared workspace `node_modules`.

| Event | Description | File |
|---|---|---|
| `cli_command_copied` | User copies the `npm create mrbd-app@latest` CLI command — the primary conversion action indicating intent to scaffold a new app. | `app/page.tsx` |
| `docs_link_clicked` | User clicks the "Read the docs" CTA from the home page hero section. Includes `source: "hero"` property. | `app/page.tsx` |
| `docs_markdown_copied` | User copies the full markdown source of a docs page (likely for LLM or offline use). Includes `doc_slug` and `markdown_length` properties. | `app/docs/CopyMarkdownButton.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](/dashboard/1636396)
- [CLI command copies (total)](/insights/ZPMackKp)
- [Engagement trends over time](/insights/fcMtYY2F)
- [Docs engagement funnel](/insights/DcS6SNop)
- [Unique users who copied CLI command](/insights/VwthcoSs)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

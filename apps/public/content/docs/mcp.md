---
title: MCP Server
description: "Use the MRBD docs as a Model Context Protocol server in Cursor, Claude Code, Codex, and other MCP clients."
order: 12
---
# MCP Server

The MRBD docs site ships a static [Model Context Protocol](https://modelcontextprotocol.io) server. AI coding tools that speak MCP can connect to it and read MRBD docs directly while writing apps.

The server is stateless, read-only, and exposes only this site's documentation.

## Endpoint

```
https://<your-docs-host>/mcp
```

The transport is Streamable HTTP. No authentication. No cookies. No mutation tools.

When running locally:

```
http://localhost:3000/mcp
```

## What it exposes

Resources (one per doc page, plus a full bundle):

- `mrbd://docs/all` — every page concatenated as a single markdown document.
- `mrbd://docs/<slug>` — a single page, e.g. `mrbd://docs/dpad-navigation`.

Tools:

- `list_docs` — list every page with slug, title, and description.
- `get_doc({ slug })` — return the full markdown for a page.
- `search_docs({ query, limit? })` — substring search across titles, descriptions, and bodies.

## Connect from Cursor

Add an entry to `~/.cursor/mcp.json` (or your project's `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "mrbd-docs": {
      "type": "http",
      "url": "https://<your-docs-host>/mcp"
    }
  }
}
```

## Connect from Claude Code

```bash
claude mcp add --transport http mrbd-docs https://<your-docs-host>/mcp
```

## Connect from Codex CLI

```toml
# ~/.codex/config.toml
[mcp_servers.mrbd-docs]
type = "http"
url = "https://<your-docs-host>/mcp"
```

## Stdio-only clients

If your client only speaks stdio, bridge to the HTTP endpoint with `mcp-remote`:

```json
{
  "mcpServers": {
    "mrbd-docs": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://<your-docs-host>/mcp"]
    }
  }
}
```

## Verify

```bash
curl -sS -X POST https://<your-docs-host>/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

You should see `list_docs`, `get_doc`, and `search_docs` in the response.

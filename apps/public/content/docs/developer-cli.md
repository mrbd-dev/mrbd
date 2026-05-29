---
title: Developer Account (CLI)
description: "Sign in to your developer account and create or edit auth apps from the command line."
order: 14
---
# Developer Account (CLI)

`mrbd-cli` can sign in to your MRBD developer account and manage the same auth apps that appear in the [developer portal](https://mrbd.dev/portal). This lets you register and edit apps from your terminal or scripts instead of the web UI.

The CLI ships with `npm create mrbd-app@latest`, or run it directly with `npx mrbd-cli`.

## Sign in

```bash
npx mrbd-cli login
```

`login` prompts for your developer email, sends a 6-digit code to that address, and asks you to enter it. On success it stores your session under `~/.mrbd/credentials.json` (file mode `600`) and refreshes it automatically as you run other commands.

```bash
npx mrbd-cli login --email you@example.com   # skip the email prompt
npx mrbd-cli whoami                           # show the signed-in developer
npx mrbd-cli logout                           # clear the local session
```

## Manage auth apps

An auth app is the registered application that `@mrbd/auth` uses for sign-in. Each app has an `appId` in reverse-domain notation and an allow-list of origins permitted to start auth flows. You can only see and edit apps you own.

### List and inspect

```bash
npx mrbd-cli apps list
npx mrbd-cli apps get com.example.my-app
```

### Create

A privacy policy is required — either link your own or let MRBD generate one.

```bash
npx mrbd-cli apps create \
  --app-id com.example.my-app \
  --name "My App" \
  --origin https://my-app.example.com \
  --privacy-policy-url https://my-app.example.com/privacy
```

To use MRBD-generated legal documents instead of your own URLs, pass `--generate-privacy` (and optionally `--generate-terms`) along with publisher details:

```bash
npx mrbd-cli apps create \
  --app-id com.example.my-app \
  --name "My App" \
  --origin https://my-app.example.com \
  --generate-privacy \
  --publisher-name "Example, Inc." \
  --legal-email legal@example.com
```

Add `--origin` more than once to allow multiple origins, and `--env <development|preview|production>` to set the environment (defaults to `development`).

### Update

`apps update` changes only the fields you pass; everything else is left as-is.

```bash
npx mrbd-cli apps update com.example.my-app --status disabled
npx mrbd-cli apps update com.example.my-app \
  --origin https://a.example.com \
  --origin https://b.example.com
```

`--status` accepts `active`, `disabled`, or `revoked`. The `appId` cannot be changed after creation.

Run `npx mrbd-cli apps <command> --help` for the full option list.

## Pointing at another instance

By default the CLI targets the standard MRBD developer instance. Override it with environment variables when working against a self-hosted or local stack:

```bash
export MRBD_SUPABASE_URL="https://your-instance.example.com"
export MRBD_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

The publishable key is a public client identifier. Access is enforced server-side, so the CLI can only ever read or modify apps owned by the signed-in account.

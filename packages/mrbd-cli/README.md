# mrbd-cli

Command-line tools for developing Meta Ray-Ban Display web apps.

## Commands

| Command | Description |
| --- | --- |
| `mrbd start` | Expose a local dev server through a hosted tunnel |
| `mrbd login` | Sign in to your MRBD developer account |
| `mrbd logout` | Sign out of your MRBD developer account |
| `mrbd whoami` | Show the signed-in developer |
| `mrbd apps` | Create, list, and edit your MRBD auth apps |

Run `mrbd <command> --help` for command-specific options.

## Tunnel

```bash
npx mrbd-cli start
```

`mrbd-cli start` (alias: `mrbd start`) starts or connects to a local dev server, requests a short-lived tunnel session from MRBD hosting, installs a pinned `frpc` binary on first run, opens the tunnel, and prints a public HTTPS URL with a QR code.

The hosted tunnel service is intentionally not part of this public package. It owns relay configuration, auth tokens, rate limits, and abuse controls.

## Developer account & auth apps

Sign in with your developer email. The CLI sends a 6-digit code and stores the
resulting session in `~/.mrbd/credentials.json` (file mode `600`).

```bash
mrbd login                 # prompts for email, then the emailed code
mrbd login --email me@example.com
mrbd whoami
mrbd logout
```

Once signed in, manage the same auth apps that appear in the developer portal.
These commands talk to MRBD's Supabase project directly; row-level security
ensures you only ever see and edit apps you own.

```bash
# List your auth apps
mrbd apps list

# Show one app
mrbd apps get com.example.my-app

# Register a new auth app (a privacy policy is required)
mrbd apps create \
  --app-id com.example.my-app \
  --name "My App" \
  --origin https://my-app.example.com \
  --privacy-policy-url https://my-app.example.com/privacy

# ...or let MRBD generate the legal documents
mrbd apps create \
  --app-id com.example.my-app \
  --name "My App" \
  --origin https://my-app.example.com \
  --generate-privacy \
  --publisher-name "Example, Inc." \
  --legal-email legal@example.com

# Update an app (only the fields you pass change)
mrbd apps update com.example.my-app --status disabled
mrbd apps update com.example.my-app --origin https://a.example.com --origin https://b.example.com
```

By default the CLI targets the local Supabase stack used for development. Point
it at another instance with `MRBD_SUPABASE_URL` and
`MRBD_SUPABASE_PUBLISHABLE_KEY`.

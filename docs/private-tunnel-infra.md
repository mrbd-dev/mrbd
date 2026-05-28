# Private Tunnel Infrastructure

This document describes what should live outside the public MRBD repo to support `mrbd start`.

The public CLI should only know how to request a session, write a temporary `frpc` config, and start the local FRP client. The private repo should own relay deployment, secrets, auth, rate limits, and operational controls.

## Required Services

### Tunnel control API

Host an API at `https://api.mrbd.host`.

Initial endpoint:

```http
POST /v1/tunnels
Content-Type: application/json
```

Request shape from the public CLI:

```json
{
  "localHost": "127.0.0.1",
  "localPort": 3000,
  "ttlSeconds": null,
  "client": {
    "name": "@mrbd/cli",
    "platform": "darwin",
    "arch": "arm64",
    "node": "v24.0.0"
  }
}
```

Response shape expected by the public CLI:

```json
{
  "tunnelId": "63f4d788-df31-4048-9abe-3596c1addf3b",
  "tunnelUrl": "https://zugcpmkh.mrbd.host",
  "expiresAt": "2026-05-27T23:42:46.967Z",
  "frp": {
    "serverAddr": "mrbd.host",
    "serverPort": 7000,
    "authToken": "short-lived-session-token",
    "gateToken": "coarse-frps-login-token",
    "proxyName": "tun_zugcpmkh",
    "customDomains": ["zugcpmkh.mrbd.host"],
    "useTls": true
  }
}
```

The `authToken` is the per-session token. It is written to `metadatas.session_token` in `frpc.toml`, not to FRP's top-level auth token. The `gateToken` is the coarse FRP login gate and is written to `[auth].token`.

The CLI revokes sessions on shutdown:

```http
DELETE /v1/tunnels/{tunnelId}
Authorization: Bearer <frp.authToken>
Content-Type: application/json

{ "reason": "user_quit" }
```

The API should return `{ "ok": true }` on successful revoke.

### FRP relay

Run `frps` on one or more relay nodes.

Minimum responsibilities:

- Accept FRP client connections from `mrbd start`.
- Validate tokens against the control API or shared session store.
- Route `*.mrbd.host` HTTP traffic to the matching FRP proxy.
- Enforce max tunnel lifetime, max connections, and idle timeouts.
- Emit connection and request metrics.

Use wildcard DNS for `*.mrbd.host` and valid TLS at the public edge. The relay can terminate TLS itself or sit behind a reverse proxy that handles certificates.

### Session store

Use Redis, Postgres, or another private store for active tunnel sessions.

Store:

- Random slug.
- Proxy name.
- Hashed or opaque token.
- Created and expiry timestamps.
- Source IP and rough client metadata.
- Relay node assignment.
- Revocation state.

Do not expose this store to the public repo or client.

## Abuse Controls

Ship the MVP with basic limits:

- Random high-entropy subdomains.
- Short default TTL, such as 2 hours.
- Per-IP tunnel creation limits.
- Per-IP active tunnel limits.
- Per-tunnel bandwidth and connection caps.
- Blocklist for abusive IPs and reserved subdomains.
- No user-provided custom domains in the first version.

Add account-based quotas later if MRBD adds login.

## Deployment Shape

Start with one region:

```text
api.mrbd.host
  -> tunnel control API

*.mrbd.host
  -> HTTPS edge / reverse proxy
  -> frps relay
  -> user's frpc client
  -> localhost:3000
```

When needed, add regional relay nodes and have the control API assign a relay based on latency, load, or geography.

## Private Repo Contents

Keep these private:

- `frps` config templates.
- Infrastructure definitions.
- Deployment scripts.
- DNS and TLS automation.
- Relay auth plugin or middleware.
- Coarse FRP gate token.
- Token signing secrets.
- Admin and revocation tools.
- Monitoring dashboards and alerting config.

The public repo can document the API contract, but it should not contain production relay config or reusable credentials.

## Open Implementation Decisions

- Whether `frps` validates tokens by HTTP callback, plugin, or shared auth secret.
- Whether TLS terminates at `frps`, nginx/Caddy, or a cloud load balancer.
- Whether session slugs are anonymous-only or tied to MRBD accounts.
- Whether to keep downloading `frpc` from the pinned upstream release or publish platform-specific `frpc` wrapper packages later.

# mrbd-cli

## 0.3.0

### Minor Changes

- 2a9e87a: Add developer account login and auth app management to the CLI. New commands: `mrbd login`, `mrbd logout`, `mrbd whoami`, and `mrbd apps` (`list`, `get`, `create`, `update`). The CLI authenticates with email OTP, stores the session under `~/.mrbd/credentials.json`, and manages auth apps directly against Supabase under row-level security. Override the target instance with `MRBD_SUPABASE_URL` / `MRBD_SUPABASE_PUBLISHABLE_KEY`.

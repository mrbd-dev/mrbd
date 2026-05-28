# mrbd-cli

Command-line tools for developing Meta Ray-Ban Display web apps.

## Usage

```bash
npx mrbd-cli start
```

`mrbd-cli start` (alias: `mrbd start`) starts or connects to a local dev server, requests a short-lived tunnel session from MRBD hosting, installs a pinned `frpc` binary on first run, opens the tunnel, and prints a public HTTPS URL with a QR code.

Run `npx mrbd-cli start --help` for all options.

The hosted tunnel service is intentionally not part of this public package. It owns relay configuration, auth tokens, rate limits, and abuse controls.

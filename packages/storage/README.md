# @mrbd/storage

Client for **MRBD managed blob storage** — upload and serve files for Meta
Ray-Ban Display web apps without running a backend. MRBD hosts the storage and
isolates files per app and per user; you authenticate with the access token from
[`@mrbd/auth`](https://www.npmjs.com/package/@mrbd/auth).

Files live in your app/user space; uploads and downloads go through short-lived
signed URLs, so end users never hold storage credentials.

## Install

```bash
npm install @mrbd/storage @mrbd/auth
```

## Usage

```ts
import { createMrbdAuth } from "@mrbd/auth";
import { createMrbdStorage, tokenProviderFromAuth } from "@mrbd/storage";

const auth = createMrbdAuth({ appId: "com.example.lists" });

const storage = createMrbdStorage({
  appId: "com.example.lists",
  tokenProvider: tokenProviderFromAuth(auth),
});

// Upload (e.g. from a file input)
const file = input.files[0];
await storage.upload(`photos/${file.name}`, file, {
  contentType: file.type,
  upsert: true,
});

// Get a signed URL to display it
const url = await storage.getUrl(`photos/${file.name}`);
imgEl.src = url;

// List + delete
const objects = await storage.list("photos");
await storage.remove(`photos/${file.name}`);
```

## Configuration

| Option          | Default                | Notes                                              |
| --------------- | ---------------------- | -------------------------------------------------- |
| `appId`         | —                      | Required. Your reverse-domain app id.              |
| `tokenProvider` | —                      | Required. Use `tokenProviderFromAuth(authClient)`. |
| `dataUrl`       | `https://data.mrbd.io` | Override for staging / self-hosted.                |
| `fetch`         | global `fetch`         | Inject for tests / SSR.                            |

## License

MIT

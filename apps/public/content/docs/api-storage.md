---
title: "API: @mrbd/storage"
description: "Managed blob storage for MRBD apps."
order: 13
---
# API: @mrbd/storage

Install:

```bash
npm install @mrbd/storage @mrbd/auth
```

`@mrbd/storage` is managed blob storage for files (images, audio, exports, etc.). MRBD hosts the storage and isolates files per app and per user; you authenticate with the access token from [`@mrbd/auth`](/docs/api-auth). Uploads and downloads use short-lived signed URLs, so end users never hold storage credentials.

> Not to be confused with [Local Storage](/docs/storage) (`@mrbd/core`), which persists small values in the browser. `@mrbd/storage` is durable, server-side file storage.

## Create a client

```ts
import { createMrbdAuth } from "@mrbd/auth";
import { createMrbdStorage, tokenProviderFromAuth } from "@mrbd/storage";

const auth = createMrbdAuth({ appId: "com.example.lists" });

const storage = createMrbdStorage({
  appId: "com.example.lists",
  tokenProvider: tokenProviderFromAuth(auth),
});
```

## Upload, view, list, delete

```ts
// Upload (e.g. from a file input). Paths are relative to your app/user space.
const file = input.files[0];
await storage.upload(`photos/${file.name}`, file, {
  contentType: file.type,
  upsert: true,
});

// Signed URL to display/download
const url = await storage.getUrl(`photos/${file.name}`);
imgEl.src = url;

// List under a prefix
const objects = await storage.list("photos");

// Delete
await storage.remove(`photos/${file.name}`);
```

`upload` accepts a `Blob`/`File`, `ArrayBuffer`, typed array, or string. Behind the scenes MRBD mints a one-time signed upload URL and the bytes go straight to storage.

## Configuration

| Option          | Default                | Notes                                              |
| --------------- | ---------------------- | -------------------------------------------------- |
| `appId`         | —                      | Required. Your reverse-domain app id.              |
| `tokenProvider` | —                      | Required. Use `tokenProviderFromAuth(authClient)`. |
| `dataUrl`       | `https://data.mrbd.io` | Override for staging / self-hosted.                |
| `fetch`         | global `fetch`         | Inject for tests / SSR.                            |

## Security model

Objects are stored under a per-app, per-user path prefix that the managed storage service enforces in its own code. A client can only ever address files inside its own space, signed URLs are short-lived, and there are no storage credentials on the client to leak.

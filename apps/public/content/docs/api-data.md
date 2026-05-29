---
title: "API: @mrbd/data"
description: "Managed Firestore-like document store for MRBD apps."
order: 12
---
# API: @mrbd/data

Install:

```bash
npm install @mrbd/data @mrbd/auth
```

`@mrbd/data` is a managed, per-user JSON document store. There is no backend to run: MRBD hosts the storage, enforces per-app and per-user isolation, and you authenticate with the access token from [`@mrbd/auth`](/docs/api-auth). Each document is owned by the signed-in user and scoped to your app, so a user who signs in on their phone and on their glasses shares the same data.

## Create a client

```ts
import { createMrbdAuth } from "@mrbd/auth";
import { createMrbdData, tokenProviderFromAuth } from "@mrbd/data";

const auth = createMrbdAuth({ appId: "com.example.lists" });

const data = createMrbdData({
  appId: "com.example.lists",
  tokenProvider: tokenProviderFromAuth(auth),
});
```

`tokenProviderFromAuth` wires the stored session's access token and automatically refreshes it when it expires. The data service verifies that token against the MRBD auth broker and derives the calling app and user from it — clients never hold Supabase credentials.

## Collections and documents

A collection is just a name; documents are JSON objects.

```ts
type ListItem = { title: string; done: boolean };
const items = data.collection<ListItem>("items");

// Create (auto id) — pass { id } to choose your own.
const created = await items.create({ title: "Milk", done: false });

// Read (null when missing)
const one = await items.get(created.id);

// Update (shallow merge), replace, delete
await items.update(created.id, { done: true });
await items.set(created.id, { title: "Whole milk", done: true });
await items.remove(created.id);
```

Each document is returned as `{ id, data, createdAt, updatedAt }`.

## List and paginate

```ts
const { documents, cursor } = await items.list({
  filter: { done: false }, // equality on top-level fields
  order: "desc",            // by createdAt; defaults to "desc"
  limit: 50,
});

if (cursor) {
  const next = await items.list({ cursor });
}
```

`list()` returns a `cursor` for the next page, or `null` when there are no more results.

## Live updates across devices

`subscribe` streams upserts (creates + updates) for the signed-in user, so an item added on the phone appears on the glasses:

```ts
const unsubscribe = items.subscribe((doc) => {
  console.log("changed", doc.id, doc.data);
});

// later
unsubscribe();
```

Deletes are not streamed — call `list()` again to reconcile removals.

## Configuration

| Option          | Default                | Notes                                              |
| --------------- | ---------------------- | -------------------------------------------------- |
| `appId`         | —                      | Required. Your reverse-domain app id.              |
| `tokenProvider` | —                      | Required. Use `tokenProviderFromAuth(authClient)`. |
| `dataUrl`       | `https://data.mrbd.io` | Override for staging / self-hosted.                |
| `fetch`         | global `fetch`         | Inject for tests / SSR.                            |
| `eventSource`   | global `EventSource`   | Inject for `subscribe` in non-browser envs.        |

## Security model

Documents are private to the user that created them and to the app they were created through. The managed data service verifies the app-scoped JWT, then scopes every read and write to `(appId, userId)` in its own code — there are no client-side database credentials to leak and no rules for you to write.

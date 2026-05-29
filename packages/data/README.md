# @mrbd/data

Client for the **MRBD managed document store** — a Firestore-like, per-user JSON
database for Meta Ray-Ban Display web apps. No backend to run: MRBD hosts the
storage, enforces per-app and per-user isolation, and you talk to it with the
access token from [`@mrbd/auth`](https://www.npmjs.com/package/@mrbd/auth).

Every document is owned by the signed-in user and scoped to your app. A user who
signs in on their phone and on their glasses shares the same data.

## Install

```bash
npm install @mrbd/data @mrbd/auth
```

## Usage

```ts
import { createMrbdAuth } from "@mrbd/auth";
import { createMrbdData, tokenProviderFromAuth } from "@mrbd/data";

const auth = createMrbdAuth({ appId: "com.example.lists" });

const data = createMrbdData({
  appId: "com.example.lists",
  tokenProvider: tokenProviderFromAuth(auth),
});

type ListItem = { title: string; done: boolean };
const items = data.collection<ListItem>("items");

// Create (auto id) — or pass { id } to choose your own.
const created = await items.create({ title: "Milk", done: false });

// Read
const one = await items.get(created.id); // MrbdDocument<ListItem> | null

// List newest-first, with an equality filter and pagination.
const { documents, cursor } = await items.list({
  filter: { done: false },
  limit: 50,
  order: "desc",
});

// Update (shallow merge) / replace / delete
await items.update(created.id, { done: true });
await items.set(created.id, { title: "Whole milk", done: true });
await items.remove(created.id);
```

### Live updates across devices

`subscribe` streams upserts (creates + updates) for the signed-in user, so an
item added on the phone shows up on the glasses:

```ts
const unsubscribe = items.subscribe((doc) => {
  console.log("changed", doc.id, doc.data);
});

// later
unsubscribe();
```

Deletes are not streamed — re-`list()` to reconcile removals.

## Configuration

| Option          | Default              | Notes                                              |
| --------------- | -------------------- | -------------------------------------------------- |
| `appId`         | —                    | Required. Your reverse-domain app id.              |
| `tokenProvider` | —                    | Required. Use `tokenProviderFromAuth(authClient)`. |
| `dataUrl`       | `https://data.mrbd.io` | Override for staging / self-hosted.              |
| `fetch`         | global `fetch`       | Inject for tests / SSR.                            |
| `eventSource`   | global `EventSource` | Inject for `subscribe` in non-browser envs.        |

## License

MIT

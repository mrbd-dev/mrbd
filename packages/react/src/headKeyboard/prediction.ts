import { readStoredJson, writeStoredJson, type WebStorageArea } from "@mrbd/core";
import { MRBD_DEFAULT_WORDLIST } from "./wordlist.js";

export { MRBD_DEFAULT_WORDLIST };

export type MrbdPredictionEngine = {
  /** Suggest completions/next words for the given (possibly empty) prefix. */
  suggest(prefix: string, limit?: number): string[];
  /** Record a chosen word so it ranks higher next time (recency boost). */
  learn(word: string): void;
};

export type MrbdPredictionOptions = {
  /** Override the base word list (e.g. a larger corpus or predictionary export). */
  words?: string[];
  /** Storage key for learned recents. */
  storageKey?: string;
  /** Max learned words kept. */
  maxRecents?: number;
  /** Storage area override (defaults to localStorage). */
  storage?: WebStorageArea;
};

function dedupeLower(words: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of words) {
    const w = raw.toLowerCase();
    if (w && !seen.has(w)) {
      seen.add(w);
      out.push(w);
    }
  }
  return out;
}

export function createMrbdPredictionEngine(options: MrbdPredictionOptions = {}): MrbdPredictionEngine {
  const words = dedupeLower(options.words ?? MRBD_DEFAULT_WORDLIST);
  const storageKey = options.storageKey ?? "mrbd_kb_recents_v1";
  const maxRecents = options.maxRecents ?? 40;
  const storage = options.storage;

  function loadRecents(): string[] {
    const result = readStoredJson<string[]>(storageKey, [], storage);
    return Array.isArray(result.value) ? result.value : [];
  }

  return {
    suggest(prefix, limit = 5) {
      const p = (prefix ?? "").toLowerCase();
      const recents = loadRecents();
      const out: string[] = [];
      const seen = new Set<string>();
      const add = (w: string) => {
        if (w && !seen.has(w)) {
          seen.add(w);
          out.push(w);
        }
      };

      if (p) {
        for (const w of recents) if (w.startsWith(p) && w !== p) add(w);
        for (let i = 0; i < words.length && out.length < limit * 2; i++) {
          if (words[i].startsWith(p) && words[i] !== p) add(words[i]);
        }
      } else {
        for (const w of recents) add(w);
        for (let i = 0; i < words.length && out.length < limit * 2; i++) add(words[i]);
      }
      return out.slice(0, limit);
    },
    learn(word) {
      const w = (word ?? "").toLowerCase();
      if (!w) return;
      const next = [w, ...loadRecents().filter((x) => x !== w)].slice(0, maxRecents);
      writeStoredJson(storageKey, next, storage);
    },
  };
}

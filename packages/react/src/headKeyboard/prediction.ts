import { readStoredJson, writeStoredJson, type WebStorageArea } from "@mrbd/core";

/** Compact, frequency-leaning English list tuned for short glasses messages. */
export const MRBD_DEFAULT_WORDLIST: string[] = (
  "the be to of and a in that have it for not on with he as you do at this but his by from they we " +
  "say her she or an will my one all would there their what so up out if about who get which go me " +
  "when make can like time no just him know take people into year your good some could them see other " +
  "than then now look only come its over think also back after use two how our work first well way " +
  "even new want because any these give day most us is are was were been has had said did going got " +
  "made find where much too very still being why before never here more those both between important " +
  "few while might great world life write school home water room mother father friend please thanks " +
  "thank hello yes okay sorry love today tomorrow tonight morning night message text call phone send " +
  "meeting meet later soon sure maybe really something someone everything everyone anything nothing " +
  "again together around through should always almost every another house point live last long little " +
  "own under same right small large early young public able better best happy nice cool awesome amazing " +
  "perfect free done ready open close start stop wait stay leave coming food coffee lunch dinner " +
  "breakfast hungry tired busy late ok lol haha omg yeah nope welcome congrats birthday weekend"
).split(/\s+/);

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

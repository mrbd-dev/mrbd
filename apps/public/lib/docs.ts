import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export type DocMeta = {
  title: string;
  description: string;
  order: number;
};

export type DocPage = DocMeta & {
  slug: string;
  markdown: string;
};

const docsDirectory = join(process.cwd(), "content", "docs");

function parseMarkdownFile(slug: string): DocPage {
  const file = readFileSync(join(docsDirectory, `${slug}.md`), "utf8");
  const match = file.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    throw new Error(`Missing frontmatter in ${slug}.md`);
  }

  const meta = Object.fromEntries(
    match[1].split("\n").map((line) => {
      const [key, ...value] = line.split(":");
      return [key.trim(), value.join(":").trim().replace(/^"|"$/g, "")];
    }),
  ) as Record<string, string>;

  return {
    slug,
    title: meta.title,
    description: meta.description,
    order: Number(meta.order),
    markdown: match[2].trim(),
  };
}

export function getDocs(): DocPage[] {
  return readdirSync(docsDirectory)
    .filter((file) => file.endsWith(".md"))
    .map((file) => parseMarkdownFile(file.replace(/\.md$/, "")))
    .sort((a, b) => a.order - b.order);
}

export function getDoc(slug: string): DocPage | null {
  const page = getDocs().find((doc) => doc.slug === slug);
  return page ?? null;
}

export function getDefaultDoc(): DocPage {
  const page = getDoc("introduction");
  if (!page) throw new Error("Missing introduction doc");
  return page;
}

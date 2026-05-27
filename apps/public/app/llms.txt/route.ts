import { getDocs } from "../../lib/docs";

export function GET() {
  const docs = getDocs();
  const body = [
    "# MRBD",
    "",
    "Unofficial npm packages for building web applications for Meta Ray-Ban Display glasses.",
    "",
    "## Docs",
    ...docs.map((doc) => {
      const url = doc.slug === "introduction" ? "/docs" : `/docs/${doc.slug}`;
      return `- [${doc.title}](${url}): ${doc.description}`;
    }),
    "",
    "## Raw Markdown",
    ...docs.map((doc) => {
      const url = doc.slug === "introduction" ? "/docs/markdown" : `/docs/${doc.slug}/markdown`;
      return `- [${doc.title} Markdown](${url})`;
    }),
  ].join("\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

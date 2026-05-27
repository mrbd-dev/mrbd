import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getDoc, getDocs } from "../../../../lib/docs";

const SITE_DESCRIPTION =
  "MRBD docs: unofficial npm packages and guidance for building web apps for Meta Ray-Ban Display glasses.";

function buildFullBundle(): string {
  return getDocs()
    .map((doc) => [`# ${doc.title}`, "", doc.description, "", doc.markdown].join("\n"))
    .join("\n\n---\n\n");
}

function snippet(markdown: string, query: string, radius = 120): string {
  const idx = markdown.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return markdown.slice(0, radius * 2).trim();
  const start = Math.max(0, idx - radius);
  const end = Math.min(markdown.length, idx + query.length + radius);
  return (start > 0 ? "…" : "") + markdown.slice(start, end).trim() + (end < markdown.length ? "…" : "");
}

const handler = createMcpHandler(
  (server) => {
    server.registerResource(
      "mrbd-doc-bundle",
      "mrbd://docs/all",
      {
        title: "MRBD Docs (full bundle)",
        description: "Every MRBD documentation page concatenated as one markdown document.",
        mimeType: "text/markdown",
      },
      async (uri) => ({
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: buildFullBundle(),
          },
        ],
      }),
    );

    for (const doc of getDocs()) {
      const uri = `mrbd://docs/${doc.slug}`;
      server.registerResource(
        `mrbd-doc-${doc.slug}`,
        uri,
        {
          title: doc.title,
          description: doc.description,
          mimeType: "text/markdown",
        },
        async (resourceUri) => ({
          contents: [
            {
              uri: resourceUri.href,
              mimeType: "text/markdown",
              text: [`# ${doc.title}`, "", doc.description, "", doc.markdown].join("\n"),
            },
          ],
        }),
      );
    }

    server.registerTool(
      "list_docs",
      {
        title: "List MRBD docs",
        description: "Return every MRBD documentation page with slug, title, and description.",
        inputSchema: {},
      },
      async () => {
        const docs = getDocs().map((doc) => ({
          slug: doc.slug,
          title: doc.title,
          description: doc.description,
          order: doc.order,
          uri: `mrbd://docs/${doc.slug}`,
        }));
        return {
          content: [{ type: "text", text: JSON.stringify({ description: SITE_DESCRIPTION, docs }, null, 2) }],
        };
      },
    );

    server.registerTool(
      "get_doc",
      {
        title: "Get an MRBD doc",
        description: "Return the full markdown for a single MRBD documentation page by slug.",
        inputSchema: {
          slug: z
            .string()
            .min(1)
            .describe("Doc slug, e.g. 'introduction', 'dpad-navigation', 'sensors', 'api-core'."),
        },
      },
      async ({ slug }) => {
        const doc = getDoc(slug);
        if (!doc) {
          const known = getDocs().map((d) => d.slug);
          return {
            isError: true,
            content: [
              { type: "text", text: `No doc found for slug "${slug}". Known slugs: ${known.join(", ")}` },
            ],
          };
        }
        return {
          content: [
            {
              type: "text",
              text: [`# ${doc.title}`, "", doc.description, "", doc.markdown].join("\n"),
            },
          ],
        };
      },
    );

    server.registerTool(
      "search_docs",
      {
        title: "Search MRBD docs",
        description:
          "Case-insensitive substring search across all MRBD docs. Returns matching slugs with short snippets.",
        inputSchema: {
          query: z.string().min(2).describe("Text to search for in titles, descriptions, and bodies."),
          limit: z.number().int().min(1).max(20).optional().describe("Max results to return. Default 8."),
        },
      },
      async ({ query, limit }) => {
        const max = limit ?? 8;
        const q = query.toLowerCase();
        const matches = getDocs()
          .map((doc) => {
            const hay = `${doc.title}\n${doc.description}\n${doc.markdown}`;
            return { doc, hit: hay.toLowerCase().includes(q) };
          })
          .filter((m) => m.hit)
          .slice(0, max)
          .map(({ doc }) => ({
            slug: doc.slug,
            title: doc.title,
            uri: `mrbd://docs/${doc.slug}`,
            snippet: snippet(`${doc.title}\n${doc.description}\n${doc.markdown}`, query),
          }));

        return {
          content: [
            { type: "text", text: JSON.stringify({ query, count: matches.length, matches }, null, 2) },
          ],
        };
      },
    );
  },
  {
    serverInfo: {
      name: "mrbd-docs",
      version: "0.1.0",
    },
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
    disableSse: true,
    verboseLogs: false,
  },
);

export { handler as GET, handler as POST, handler as DELETE };

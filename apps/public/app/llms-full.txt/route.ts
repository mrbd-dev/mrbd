import { getDocs } from "../../lib/docs";

export function GET() {
  const body = getDocs()
    .map((doc) => [`# ${doc.title}`, "", doc.description, "", doc.markdown].join("\n"))
    .join("\n\n---\n\n");

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

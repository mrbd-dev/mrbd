import { getDefaultDoc } from "../../../lib/docs";

export function GET() {
  return new Response(getDefaultDoc().markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}

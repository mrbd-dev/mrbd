import { notFound } from "next/navigation";
import { getDoc, getDocs } from "../../../../lib/docs";

export function generateStaticParams() {
  return getDocs()
    .filter((doc) => doc.slug !== "introduction")
    .map((doc) => ({ slug: doc.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getDoc(slug);

  if (!page || page.slug === "introduction") notFound();

  return new Response(page.markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
    },
  });
}

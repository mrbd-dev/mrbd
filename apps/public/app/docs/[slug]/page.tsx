import { notFound } from "next/navigation";
import { getDoc, getDocs } from "../../../lib/docs";
import { DocsPage } from "../DocsPage";

export function generateStaticParams() {
  return getDocs()
    .filter((doc) => doc.slug !== "introduction")
    .map((doc) => ({ slug: doc.slug }));
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = getDoc(slug);

  if (!page || page.slug === "introduction") notFound();

  return <DocsPage page={page} />;
}

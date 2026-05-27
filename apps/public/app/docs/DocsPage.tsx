import { getDocs, type DocPage } from "../../lib/docs";
import { Markdown } from "../../lib/markdown";
import { CopyMarkdownButton } from "./CopyMarkdownButton";

export function DocsPage({ page }: { page: DocPage }) {
  const docs = getDocs();
  const markdownHref = page.slug === "introduction" ? "/docs/markdown" : `/docs/${page.slug}/markdown`;

  return (
    <main className="docs-layout">
      <aside className="docs-sidebar">
        <a className="docs-brand" href="/">
          mrbd
        </a>
        <nav aria-label="Documentation">
          {docs.map((doc) => (
            <a aria-current={doc.slug === page.slug ? "page" : undefined} href={doc.slug === "introduction" ? "/docs" : `/docs/${doc.slug}`} key={doc.slug}>
              {doc.title}
            </a>
          ))}
        </nav>
      </aside>

      <article className="docs-content">
        <header className="docs-header">
          <div>
            <p className="eyebrow">Docs</p>
            <h1>{page.title}</h1>
            <p className="lead">{page.description}</p>
          </div>
          <div className="docs-actions">
            <CopyMarkdownButton markdown={page.markdown} />
            <a className="plain-link" href={markdownHref}>
              Raw Markdown
            </a>
          </div>
        </header>

        <Markdown source={page.markdown} />
      </article>
    </main>
  );
}

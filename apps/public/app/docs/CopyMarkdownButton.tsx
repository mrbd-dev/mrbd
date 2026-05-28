"use client";

import { useState } from "react";
import posthog from "posthog-js";

export function CopyMarkdownButton({ markdown, slug }: { markdown: string; slug?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
    posthog.capture("docs_markdown_copied", { doc_slug: slug ?? "introduction", markdown_length: markdown.length });
  }

  return (
    <button className="plain-button" type="button" onClick={copyMarkdown}>
      {copied ? "Copied" : "Copy Markdown"}
    </button>
  );
}

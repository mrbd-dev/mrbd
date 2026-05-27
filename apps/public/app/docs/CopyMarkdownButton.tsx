"use client";

import { useState } from "react";

export function CopyMarkdownButton({ markdown }: { markdown: string }) {
  const [copied, setCopied] = useState(false);

  async function copyMarkdown() {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button className="plain-button" type="button" onClick={copyMarkdown}>
      {copied ? "Copied" : "Copy Markdown"}
    </button>
  );
}

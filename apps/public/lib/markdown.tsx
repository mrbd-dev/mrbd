import type { ReactNode } from "react";

function renderInline(value: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let cursor = 0;

  for (const match of value.matchAll(pattern)) {
    if (match.index > cursor) parts.push(value.slice(cursor, match.index));
    const token = match[0];

    if (token.startsWith("`")) {
      parts.push(<code key={`${token}-${match.index}`}>{token.slice(1, -1)}</code>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        parts.push(
          <a key={`${token}-${match.index}`} href={link[2]}>
            {link[1]}
          </a>,
        );
      }
    }

    cursor = match.index + token.length;
  }

  if (cursor < value.length) parts.push(value.slice(cursor));
  return parts;
}

export function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  const lines = source.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.replace(/^```/, "").trim();
      const code: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].startsWith("```")) {
        code.push(lines[index]);
        index += 1;
      }

      blocks.push(
        <pre className="codeblock" key={`code-${index}`}>
          <code data-language={language || undefined}>{code.join("\n")}</code>
        </pre>,
      );
      index += 1;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(<h3 key={`h3-${index}`}>{renderInline(line.slice(4))}</h3>);
      index += 1;
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push(<h2 key={`h2-${index}`}>{renderInline(line.slice(3))}</h2>);
      index += 1;
      continue;
    }

    if (line.startsWith("# ")) {
      blocks.push(<h1 key={`h1-${index}`}>{renderInline(line.slice(2))}</h1>);
      index += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`}>
          {items.map((item) => (
            <li key={item}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].startsWith("#") &&
      !lines[index].startsWith("- ") &&
      !lines[index].startsWith("```")
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }

    blocks.push(<p key={`p-${index}`}>{renderInline(paragraph.join(" "))}</p>);
  }

  return <div className="markdown">{blocks}</div>;
}

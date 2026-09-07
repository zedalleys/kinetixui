"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

/* ---- DOM → Markdown (best-effort, for pasting a page into an LLM) ---- */

function inline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  if (node.dataset.headingAnchor !== undefined || node.getAttribute("aria-hidden") === "true") return "";
  const kids = () => Array.from(node.childNodes).map(inline).join("");
  switch (node.tagName) {
    case "CODE":
      return "`" + (node.textContent ?? "") + "`";
    case "STRONG":
    case "B":
      return "**" + kids() + "**";
    case "EM":
    case "I":
      return "*" + kids() + "*";
    case "A": {
      const href = node.getAttribute("href") ?? "";
      return href ? `[${kids()}](${href})` : kids();
    }
    case "BR":
      return "\n";
    default:
      return kids();
  }
}

function headingText(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-heading-anchor]").forEach((n) => n.remove());
  return (clone.textContent ?? "").trim();
}

function listMd(el: HTMLElement, ordered: boolean): string {
  return Array.from(el.children)
    .filter((c) => c.tagName === "LI")
    .map((li, i) => `${ordered ? `${i + 1}.` : "-"} ${inline(li).trim().replace(/\n+/g, " ")}`)
    .join("\n");
}

function tableMd(el: HTMLElement): string {
  const rows = Array.from(el.querySelectorAll("tr"));
  if (!rows.length) return "";
  const cells = (tr: Element) =>
    Array.from(tr.children).map((c) =>
      // escape backslash first, then the cell delimiter
      inline(c as HTMLElement).trim().replace(/\\/g, "\\\\").replace(/\|/g, "\\|"),
    );
  const head = cells(rows[0]);
  const out = [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`];
  for (const tr of rows.slice(1)) out.push(`| ${cells(tr).join(" | ")} |`);
  return out.join("\n");
}

function block(el: HTMLElement): string {
  if (el.dataset.docsChrome !== undefined || el.dataset.cp !== undefined) return "";
  switch (el.tagName) {
    case "H1":
      return "# " + headingText(el);
    case "H2":
      return "## " + headingText(el);
    case "H3":
      return "### " + headingText(el);
    case "H4":
      return "#### " + headingText(el);
    case "P":
      return inline(el).trim();
    case "UL":
      return listMd(el, false);
    case "OL":
      return listMd(el, true);
    case "BLOCKQUOTE":
      return inline(el)
        .trim()
        .split("\n")
        .map((l) => "> " + l)
        .join("\n");
    case "HR":
      return "---";
    case "PRE": {
      const lines = el.querySelectorAll("[data-line]");
      const text = lines.length
        ? Array.from(lines)
            .map((l) => l.textContent ?? "")
            .join("\n")
        : (el.querySelector("code")?.textContent ?? el.textContent ?? "");
      const lang =
        el.getAttribute("data-language") ||
        el.querySelector("[data-language]")?.getAttribute("data-language") ||
        "";
      return "```" + lang + "\n" + text.replace(/\n$/, "") + "\n```";
    }
    default: {
      // wrappers (rehype-pretty-code <figure> → <div> → <pre>, table scroll <div>)
      const table = el.querySelector("table");
      if (table) return tableMd(table as HTMLElement);
      const pre = el.querySelector("pre");
      if (pre) return block(pre as HTMLElement);
      return Array.from(el.children)
        .map((c) => block(c as HTMLElement))
        .filter(Boolean)
        .join("\n\n");
    }
  }
}

function pageToMarkdown(): string {
  const root = document.querySelector("[data-docs-content]");
  if (!root) return "";
  const url = location.origin + location.pathname;
  const body = Array.from(root.children)
    .map((c) => block(c as HTMLElement))
    .filter(Boolean)
    .join("\n\n");
  return `<!-- ${url} -->\n\n${body}\n`;
}

export function DocsPageActions() {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pageToMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.1em] transition-colors",
        copied ? "border-primary/50 text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
      aria-label="Copy this page as Markdown"
    >
      {copied ? <Check className="size-3.5 text-primary" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy as Markdown"}
    </button>
  );
}

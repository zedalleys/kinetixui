"use client";

import * as React from "react";
import { Bold, Code, Eye, EyeOff, Heading2, Italic, Link as LinkIcon, List, ListOrdered, Quote } from "lucide-react";
import { cn } from "../lib/utils";
import { Textarea } from "./textarea";

export interface MarkdownEditorProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

function wrapSelection(text: string, start: number, end: number, before: string, after: string, placeholder: string) {
  const selected = text.slice(start, end) || placeholder;
  const next = text.slice(0, start) + before + selected + after + text.slice(end);
  return { text: next, selectionStart: start + before.length, selectionEnd: start + before.length + selected.length };
}

function prefixLines(text: string, start: number, end: number, prefix: (lineIndex: number) => string) {
  const lineStart = text.lastIndexOf("\n", Math.max(start - 1, 0)) + 1;
  let lineEnd = text.indexOf("\n", Math.max(end, lineStart));
  if (lineEnd === -1) lineEnd = text.length;
  const block = text.slice(lineStart, lineEnd);
  const lines = block.split("\n");
  const prefixed = lines.map((line, i) => prefix(i) + line).join("\n");
  return {
    text: text.slice(0, lineStart) + prefixed + text.slice(lineEnd),
    selectionStart: start + prefix(0).length,
    selectionEnd: end + (prefixed.length - block.length),
  };
}

/** HTML-escapes source text before any markup is inserted — see the render call below. */
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderInline(escaped: string): string {
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label: string, url: string) => {
      const safe = /^(https?:|mailto:|\/|#)/i.test(url.trim());
      return safe ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>` : match;
    });
}

/**
 * A small hand-rolled Markdown → HTML renderer covering exactly the syntax
 * the toolbar below produces (headings, bold, italic, links, inline/block
 * code, bullet/numbered lists, blockquotes, paragraphs) — not a full
 * CommonMark implementation. Kept dependency-free and simple enough to
 * port identically to Compose/SwiftUI/Flutter, the same reasoning as
 * `DiffViewer`'s hand-rolled LCS diff.
 */
function renderMarkdown(source: string): string {
  const lines = source.split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1]!.length;
      out.push(`<h${level}>${renderInline(escapeHtml(heading[2]!))}</h${level}>`);
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      closeList();
      out.push(`<blockquote>${renderInline(escapeHtml(quote[1]!))}</blockquote>`);
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      if (listType !== "ul") {
        closeList();
        out.push("<ul>");
        listType = "ul";
      }
      out.push(`<li>${renderInline(escapeHtml(bullet[1]!))}</li>`);
      continue;
    }

    const numbered = line.match(/^\d+\.\s+(.*)$/);
    if (numbered) {
      if (listType !== "ol") {
        closeList();
        out.push("<ol>");
        listType = "ol";
      }
      out.push(`<li>${renderInline(escapeHtml(numbered[1]!))}</li>`);
      continue;
    }

    closeList();
    if (line.trim() === "") continue;
    out.push(`<p>${renderInline(escapeHtml(line))}</p>`);
  }
  closeList();
  if (inCode) out.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);

  return out.join("\n");
}

/**
 * MarkdownEditor — toolbar + a plain `Textarea` (the markdown source) with
 * an optional rendered preview pane. Deliberately *not* `contenteditable`
 * (no Tiptap/Lexical): `contenteditable` has no native-platform analogue,
 * so a WYSIWYG rich-text editor would be a web-only, eighth standing
 * non-port. A markdown textarea is just a text buffer the toolbar inserts
 * syntax into — SwiftUI's `TextEditor`, Compose's `BasicTextField`, and
 * Flutter's `TextField` all support the same selection-based insertion, so
 * this ports cleanly to all four platforms instead.
 */
const MarkdownEditor = React.forwardRef<HTMLDivElement, MarkdownEditorProps>(
  ({ value, onChange, placeholder, rows = 10, className, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const [showPreview, setShowPreview] = React.useState(false);
    const pendingSelection = React.useRef<{ start: number; end: number } | null>(null);

    React.useEffect(() => {
      if (pendingSelection.current && textareaRef.current) {
        const { start, end } = pendingSelection.current;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start, end);
        pendingSelection.current = null;
      }
    }, [value]);

    const applyInline = (before: string, after: string, placeholder: string) => {
      const el = textareaRef.current;
      if (!el) return;
      const result = wrapSelection(value, el.selectionStart, el.selectionEnd, before, after, placeholder);
      pendingSelection.current = { start: result.selectionStart, end: result.selectionEnd };
      onChange(result.text);
    };

    const applyLinePrefix = (prefix: (lineIndex: number) => string) => {
      const el = textareaRef.current;
      if (!el) return;
      const result = prefixLines(value, el.selectionStart, el.selectionEnd, prefix);
      pendingSelection.current = { start: result.selectionStart, end: result.selectionEnd };
      onChange(result.text);
    };

    return (
      <div ref={ref} className={cn("overflow-hidden rounded-md border font-sans", className)} {...props}>
        <div role="toolbar" aria-label="Formatting" className="flex items-center gap-0.5 border-b bg-muted/40 p-1">
          <ToolbarButton label="Bold" onClick={() => applyInline("**", "**", "bold text")}>
            <Bold className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Italic" onClick={() => applyInline("*", "*", "italic text")}>
            <Italic className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Heading" onClick={() => applyLinePrefix(() => "## ")}>
            <Heading2 className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Link" onClick={() => applyInline("[", "](https://)", "link text")}>
            <LinkIcon className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Bulleted list" onClick={() => applyLinePrefix(() => "- ")}>
            <List className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Numbered list" onClick={() => applyLinePrefix((i) => `${i + 1}. `)}>
            <ListOrdered className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Code" onClick={() => applyInline("`", "`", "code")}>
            <Code className="size-4" />
          </ToolbarButton>
          <ToolbarButton label="Quote" onClick={() => applyLinePrefix(() => "> ")}>
            <Quote className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label={showPreview ? "Hide preview" : "Show preview"}
            onClick={() => setShowPreview((v) => !v)}
            active={showPreview}
            className="ml-auto"
          >
            {showPreview ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </ToolbarButton>
        </div>
        <div className={cn("grid", showPreview && "grid-cols-2 divide-x")}>
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            className="resize-none rounded-none border-0 font-mono text-[13px] focus-visible:border-transparent focus-visible:shadow-none"
          />
          {showPreview && (
            <div
              className="overflow-auto p-3 text-sm [&_a]:text-primary [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em] [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_pre]:overflow-auto [&_pre]:rounded-sm [&_pre]:bg-muted [&_pre]:p-2 [&_ul]:list-disc"
              // Rendered from renderMarkdown above, which HTML-escapes all
              // source text before inserting any markup — safe from
              // injection, same trust boundary as any other self-generated
              // innerHTML (not raw user HTML).
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
            />
          )}
        </div>
      </div>
    );
  },
);
MarkdownEditor.displayName = "MarkdownEditor";

function ToolbarButton({
  label,
  onClick,
  active,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground",
        active && "bg-accent text-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

export { MarkdownEditor };

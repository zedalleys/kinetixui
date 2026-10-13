import { CopyButton } from "@/components/copy-button";
import type { Token, TokenKind } from "@/lib/highlight";

/**
 * One implementation explorer panel: a platform's real `Switch` excerpt and the three facts under it.
 *
 * Shared by the server and the client on purpose. The panel the page opens on is rendered on the server
 * (`implementation-explorer.tsx`) and arrives as HTML; the other four are not in the page's HTML or its
 * component tree at all. They travel as `PanelData` — the excerpt as compact runs of text, no markup — and the
 * small tab controller (`explorer-tabs.tsx`) renders one with this same function only when its tab is chosen.
 * One renderer, so a panel looks the same whichever side drew it.
 *
 * Markup is kept lean because the excerpt is the heaviest thing on the page: one element per line, one per
 * coloured run, nothing else. Line numbers are a CSS counter (`.kx-code`), not elements, and the copy button
 * copies the lines it renders rather than a second copy of the same text.
 */

/** A coloured run, or a plain string for uncoloured text (most of a line). */
export type Run = string | [kind: Exclude<TokenKind, "plain">, text: string];
export type PanelFile = { file: string; firstLine: number; lastLine: number; lines: Run[][]; reads: number[] };
export type PanelData = {
  label: string;
  maturity: string;
  distribution: string;
  verification: string | null;
  evidence: string;
  files: PanelFile[];
};

/** Highlighted lines → compact runs: plain text as bare strings, adjacent plain runs merged. */
export function toRuns(lines: Token[][]): Run[][] {
  return lines.map((line) =>
    line.reduce<Run[]>((out, [kind, text]) => {
      const last = out[out.length - 1];
      if (kind === "plain") {
        if (typeof last === "string") out[out.length - 1] = last + text;
        else out.push(text);
      } else out.push([kind, text]);
      return out;
    }, []),
  );
}

// Literal class names, not built from the kind: Tailwind keeps a `@layer components` rule only if it finds the
// class name written out in the source.
const TOKEN_CLASS: Record<Exclude<TokenKind, "plain">, string> = {
  comment: "kx-tok-comment",
  string: "kx-tok-string",
  keyword: "kx-tok-keyword",
  type: "kx-tok-type",
};

const textOf = (line: Run[]) => line.map((r) => (typeof r === "string" ? r : r[1])).join("");

export function ExplorerPanel({ component, data }: { component: string; data: PanelData }) {
  return (
    <>
      <div className="relative">
        <CopyButton
          value={data.files.map((f) => f.lines.map(textOf).join("\n")).join("\n\n")}
          label={`Copy the ${data.label} ${component} excerpt`}
          className="absolute end-3 top-2.5 z-10"
        />
        {data.files.map((f) => (
          <div key={f.file}>
            <p className="kx-code-file">
              <span className="text-foreground [overflow-wrap:anywhere]" dir="ltr">
                {f.file}
              </span>
              <span>
                lines {f.firstLine}–{f.lastLine}
              </span>
            </p>
            <div
              // long lines scroll sideways, so the keyboard has to be able to reach the region
              tabIndex={0}
              role="region"
              aria-label={`${data.label} ${component} source, ${f.file} lines ${f.firstLine} to ${f.lastLine}`}
              className="kx-code-scroll"
            >
              <pre dir="ltr" className="kx-code font-mono text-body-sm leading-relaxed" style={{ counterReset: `kx-line ${f.firstLine - 1}` }}>
                <code>
                  {f.lines.map((line, i) => (
                    <span key={i} className="kx-ln" {...(f.reads.includes(i) ? { "data-reads": "" } : {})}>
                      {line.map((r, j) => (typeof r === "string" ? r : <span key={j} className={TOKEN_CLASS[r[0]]}>{r[1]}</span>))}
                    </span>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        ))}
      </div>

      {/* what is true of THIS implementation: three separate facts, never one badge */}
      <dl className="kx-code-facts">
        <div>
          <dt>Package</dt>
          <dd>
            {data.maturity} · {data.distribution}
          </dd>
        </div>
        <div>
          <dt>{component} verification</dt>
          <dd>{data.verification ?? "none recorded"}</dd>
        </div>
        <div>
          <dt>Evidence on file</dt>
          <dd>{data.evidence || "none"}</dd>
        </div>
      </dl>
    </>
  );
}

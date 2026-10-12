import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import type { Token } from "@/lib/highlight";
import type { Platform } from "@/lib/platform-parity";
import { TAB_OF, type CodeTab } from "@/lib/platform-tabs";
import { ExplorerTabs } from "./explorer-tabs";

/**
 * "Same contract. Different platform." — the real `Switch` source on every platform, side by side.
 *
 * Not an example and not a snippet: each tab is a window of the implementation file in that platform's own
 * package, cut around the line that reads `action` by `lib/systems-in-motion.ts` (Angular's is two windows, the
 * component and its stylesheet, because that is how the Angular package is built). The file and line range are
 * the real ones; the whole file is a link away. The line that reads the token is marked, so the token the hero
 * follows is visible again here, consumed natively in five languages.
 *
 * A server component: the source, its highlighting and the facts under it render here, once, as HTML. Only the
 * tab selection is client state (`explorer-tabs.tsx`).
 */

export type ExplorerFile = {
  file: string;
  firstLine: number;
  lastLine: number;
  language: string;
  text: string;
  lines: Token[][];
  readsToken: number[];
};
export type ExplorerPlatform = {
  platform: Platform;
  label: string;
  maturity: string;
  distribution: string;
  files: ExplorerFile[];
  verification: string | null;
  evidence: string[];
};

const EVIDENCE_LABEL: Record<string, string> = {
  build: "build",
  interaction: "interaction",
  accessibility: "accessibility",
  rtl: "RTL",
  largeText: "large text",
  reducedMotion: "reduced motion",
  visual: "visual",
  published: "published",
};

const TOKEN_CLASS: Record<Token[0], string | undefined> = {
  comment: "kx-tok-comment",
  string: "kx-tok-string",
  keyword: "kx-tok-keyword",
  type: "kx-tok-type",
  plain: undefined,
};

export function ImplementationExplorer({
  component,
  componentHref,
  platforms,
}: {
  component: string;
  componentHref: string;
  platforms: ExplorerPlatform[];
}) {
  const tabs = platforms.map((t) => ({
    tab: TAB_OF[t.platform] as CodeTab,
    platform: t.platform,
    label: t.label,
    maturity: t.maturity,
    panel: <Panel component={component} platform={t} />,
  }));
  return (
    <ExplorerTabs
      component={component}
      tabs={tabs}
      footer={
        <p className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-body-sm text-muted-foreground">
          <span>
            <span aria-hidden="true" className="me-2 inline-block size-2 rounded-[2px] bg-primary align-middle" />
            Marked lines read the <code className="kx-source text-body-sm text-foreground">action</code> token.
          </span>
          <Link href={componentHref} className="inline-flex min-h-9 items-center gap-1 font-medium text-primary underline underline-offset-4">
            {component} on every platform <ArrowUpRight aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
          </Link>
        </p>
      }
    />
  );
}

function Panel({ component, platform: t }: { component: string; platform: ExplorerPlatform }) {
  return (
    <>
      <div className="relative">
        <CopyButton
          value={t.files.map((f) => f.text).join("\n\n")}
          label={`Copy the ${t.label} ${component} excerpt`}
          className="absolute end-3 top-2.5 z-10"
        />
        {t.files.map((f) => (
          <div key={f.file}>
            <p className="flex flex-wrap items-baseline gap-x-3 border-b border-border py-2.5 pe-14 ps-4 font-mono text-label-md text-muted-foreground">
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
              aria-label={`${t.label} ${component} source, ${f.file} lines ${f.firstLine} to ${f.lastLine}`}
              className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <pre dir="ltr" className="py-3 font-mono text-body-sm leading-relaxed">
                <code className="grid min-w-max">
                  {f.lines.map((line, i) => (
                    <span key={i} className="kx-code-line grid grid-cols-[3.25rem_1fr] pe-6" {...(f.readsToken.includes(i) ? { "data-reads": "" } : {})}>
                      <span aria-hidden="true" className="select-none pe-4 text-end text-muted-foreground">
                        {f.firstLine + i}
                      </span>
                      <span>
                        {line.length === 0
                          ? " "
                          : line.map(([kind, text], j) =>
                              TOKEN_CLASS[kind] ? (
                                <span key={j} className={TOKEN_CLASS[kind]}>
                                  {text}
                                </span>
                              ) : (
                                text
                              ),
                            )}
                      </span>
                    </span>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        ))}
      </div>

      {/* what is true of THIS implementation: three separate facts, never one badge */}
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-border bg-card/60 px-4 py-4 text-sm sm:grid-cols-3">
        <div className="min-w-0">
          <dt className="font-mono text-label-md text-muted-foreground">Package</dt>
          <dd className="mt-0.5 text-foreground">
            {t.maturity} · {t.distribution}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="font-mono text-label-md text-muted-foreground">{component} verification</dt>
          <dd className="mt-0.5 text-foreground">{t.verification ?? "none recorded"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-mono text-label-md text-muted-foreground">Evidence on file</dt>
          <dd className="mt-0.5 text-foreground">{t.evidence.map((e) => EVIDENCE_LABEL[e] ?? e).join(" · ") || "none"}</dd>
        </div>
      </dl>
    </>
  );
}

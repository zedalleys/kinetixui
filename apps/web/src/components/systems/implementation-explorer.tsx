import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Token } from "@/lib/highlight";
import type { Platform } from "@/lib/platform-parity";
import { TAB_OF, type CodeTab } from "@/lib/platform-tabs";
import { ExplorerPanel, toRuns, type PanelData } from "./explorer-panel";
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
 * A server component. The panel the page opens on (the first platform) renders here as HTML; the other four
 * reach the page only as compact data and are drawn by the same renderer (`explorer-panel.tsx`) when their tab
 * is chosen, so four excerpts the reader may never open add neither markup nor a component tree to the page.
 * The tab selection is the only client state (`explorer-tabs.tsx`).
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

export function ImplementationExplorer({
  component,
  componentHref,
  platforms,
}: {
  component: string;
  componentHref: string;
  platforms: ExplorerPlatform[];
}) {
  const data = (t: ExplorerPlatform): PanelData => ({
    label: t.label,
    maturity: t.maturity,
    distribution: t.distribution,
    verification: t.verification,
    evidence: t.evidence.map((e) => EVIDENCE_LABEL[e] ?? e).join(" · "),
    files: t.files.map((f) => ({ file: f.file, firstLine: f.firstLine, lastLine: f.lastLine, lines: toRuns(f.lines), reads: f.readsToken })),
  });
  const [first, ...rest] = platforms;
  return (
    <ExplorerTabs
      component={component}
      tabs={platforms.map((t) => ({ tab: TAB_OF[t.platform] as CodeTab, platform: t.platform, label: t.label, maturity: t.maturity }))}
      // the panel the page opens on, rendered here as HTML; the rest wait as data until their tab is chosen
      initial={<ExplorerPanel component={component} data={data(first!)} />}
      later={Object.fromEntries(rest.map((t) => [TAB_OF[t.platform], data(t)]))}
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

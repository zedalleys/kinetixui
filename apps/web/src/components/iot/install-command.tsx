"use client";

import { CopyButton } from "@/components/copy-button";
import { trackFenceCopy } from "@/lib/analytics-surfaces";

/**
 * A copyable shell command, with the same chrome as `<HeroCommand>` and `<CodeBlock>`.
 *
 * The copy is reported through `trackFenceCopy`, which is the one classifier the docs' own fences use — so
 * `pnpm add @kinetixui/iot` produces `install_command_copied` with the package read from `PACKAGE_NAMES`, and
 * this component invents no event of its own. Nothing from the snippet reaches analytics: `CopyButton` calls
 * `onCopy` with no arguments, and the classifier only ever forwards a package name it already knew.
 *
 * Note what this deliberately is not: `component_code_copied`. That event means a core catalogue component was
 * activated, and it can only fire on a `/docs/components/<slug>` page — IoT primitives are module primitives and
 * are not in that catalogue, so folding them in would quietly corrupt the activation metric.
 */
export function InstallCommand({ command, language = "bash" }: { command: string; language?: string }) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-border bg-muted/40">
      <div className="flex items-center justify-between border-b border-border px-4 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>{language}</span>
        <CopyButton value={command} onCopy={() => trackFenceCopy(command, language, "/iot")} />
      </div>
      {/* Commands stay left-to-right in RTL: a shell command is not prose. `tabIndex={0}` for the same reason
          as in `CodeSample` — a horizontally scrolling region needs keyboard access. */}
      <pre
        dir="ltr"
        tabIndex={0}
        className="overflow-x-auto p-4 text-[13px] leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <code>{command}</code>
      </pre>
    </div>
  );
}

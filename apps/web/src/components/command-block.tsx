"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@kinetixui/ui";
import { CopyButton } from "@/components/copy-button";
import { trackFenceCopy } from "@/lib/analytics-surfaces";
import { cn } from "@/lib/utils";
import { useDocumentDirection } from "@/lib/use-document-direction";
import {
  PACKAGE_MANAGERS,
  PACKAGE_MANAGER_LABELS,
  renderCommand,
  type OperationId,
  type PackageManager,
  type RenderParams,
} from "@/lib/pm-commands";
import { setPreferredPackageManager, usePreferredPackageManager } from "@/lib/pm-preference";

/**
 * One KinetixUI command, in the reader's package manager.
 *
 * Replaces the hand-typed ```bash fence. A fence could only ever say one manager's spelling, so the site said
 * npm's and left pnpm, Yarn and Bun readers to translate — including the two command families where the
 * translation is not mechanical (`npx` → `pnpm dlx` / `bunx`, and Yarn, where Classic has no `dlx` at all).
 *
 * The command itself is not written here. `renderCommand` derives it from the operation and the manager, so
 * this file cannot show a command that the contract in `pm-commands.ts` has not validated.
 *
 * What the tabs give, and what each one costs if it is missing:
 *   - **One preference, site-wide.** Driven by `pm-preference`, so picking pnpm once holds for the thirteen
 *     blocks on /docs/cli and for the next page. Radix Tabs is controlled here rather than `defaultValue`,
 *     which is what makes every block on a page move together.
 *   - **Copy copies what is on screen.** Radix unmounts an inactive `TabsContent`, so the only copy button in
 *     the tree is the visible manager's. There is no way to copy pnpm's command while npm's is shown.
 *   - **The caveat is shown, not swallowed.** `yarn dlx` needs Yarn 2+. Rather than keep four tidy tabs and
 *     let a Yarn 1 reader discover it from `command not found`, the limitation is printed under the command.
 *   - **A placeholder says it is one.** `cli-add` with no component renders `<component…>`; the line under it
 *     says to replace it. A copyable string that looks like a command but is not would be worse than prose.
 */
export function CommandBlock({
  op,
  className,
  title,
  ...params
}: { op: OperationId; className?: string; title?: string } & RenderParams) {
  const dir = useDocumentDirection();
  const pathname = usePathname();
  const pm = usePreferredPackageManager();

  // Rendered for all four so a tab change is instant and a bad parameter fails the build, not the click.
  const commands = React.useMemo(
    () => Object.fromEntries(PACKAGE_MANAGERS.map((m) => [m, renderCommand(op, m, params)])) as Record<
      PackageManager,
      ReturnType<typeof renderCommand>
    >,
    // params is spread from props: its fields, not its identity, are what matter
    [op, params.components, params.component, params.theme, params.preset, params.path], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const label = title ?? commands[pm].id;

  return (
    <div
      data-command-block={op}
      data-command-pm={pm}
      className={cn("my-4 overflow-hidden rounded-lg border border-border bg-muted/40", className)}
    >
      <Tabs
        dir={dir}
        value={pm}
        onValueChange={(next) => {
          const parsed = PACKAGE_MANAGERS.find((m) => m === next);
          if (parsed) setPreferredPackageManager(parsed);
        }}
      >
        <TabsList aria-label="Package manager" className="px-2">
          {PACKAGE_MANAGERS.map((m) => (
            <TabsTrigger key={m} value={m}>
              {PACKAGE_MANAGER_LABELS[m]}
            </TabsTrigger>
          ))}
        </TabsList>
        {PACKAGE_MANAGERS.map((m) => {
          const c = commands[m];
          return (
            <TabsContent key={m} value={m}>
              <div className="relative">
                <CopyButton
                  value={c.command}
                  label={`Copy the ${PACKAGE_MANAGER_LABELS[m]} command`}
                  onCopy={() => trackFenceCopy(c.command, "bash", pathname ?? "/")}
                  className="absolute end-2 top-2 z-10 size-8"
                />
                {/* A command can be longer than the column — a preset code alone is ~200 characters — so the
                    region scrolls sideways, which means it must be reachable and named for the keyboard.
                    `dir="ltr"` keeps the terminal text left-to-right inside an RTL page. */}
                <div
                  role="group"
                  aria-label={`${PACKAGE_MANAGER_LABELS[m]} command for ${label}`}
                  tabIndex={0}
                  className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <pre dir="ltr" className="w-max min-w-full py-3 pe-12 ps-4 font-mono text-code leading-relaxed">
                    <code>{c.command}</code>
                  </pre>
                </div>
              </div>
              {c.placeholder || c.caveats.length > 0 ? (
                <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                  {c.placeholder ? <p>Replace the value in angle brackets before running this.</p> : null}
                  {c.caveats.map((note, i) => (
                    <p key={note} className={cn((c.placeholder || i > 0) && "mt-1")}>
                      {note}
                    </p>
                  ))}
                </div>
              ) : null}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

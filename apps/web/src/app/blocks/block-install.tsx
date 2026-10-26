"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { trackFenceCopy } from "@/lib/analytics-surfaces";
import { PACKAGES } from "@/lib/packages";
import { renderCommand } from "@/lib/pm-commands";
import { usePreferredPackageManager } from "@/lib/pm-preference";
import { PLATFORM_DEFINITIONS, type Platform } from "@/lib/platform-parity";
import { manifestPlatformFor, usePreferredPlatform } from "@/lib/platform-preference";
import { SETUP_SECTION_HREF } from "@/lib/platform-tabs";
import { componentDocs } from "@/lib/site";

const link = "text-primary underline underline-offset-2";

/**
 * How to install a block's code on the reader's platform, above the blocks.
 *
 * The page used to give one route for everything: "add the components it uses with `npx @kinetixui/cli add …`",
 * which is React's and only React's. This follows the platform the reader picked in any block's code tab (the
 * same remembered choice as the component pages), and every fact in it comes from the manifest's platform
 * definitions: the package, whether it is published, and where.
 */
export function BlocksInstallGuide() {
  const platform = manifestPlatformFor(usePreferredPlatform()) ?? "React";
  const pm = usePreferredPackageManager();
  const def = PLATFORM_DEFINITIONS[platform];
  const setup = (
    <Link href={SETUP_SECTION_HREF[platform]} className={link}>
      {def.label} setup
    </Link>
  );

  let body: React.ReactNode;
  if (platform === "React") {
    body = (
      <>
        Copy a block&apos;s code, then add the components it uses with the CLI command under that block, or install{" "}
        <code className="text-foreground">{def.distribution.coordinate}</code> from npm and import from it. Either way the
        project needs Tailwind CSS 3 and the KinetixUI preset: {setup}.
      </>
    );
  } else if (def.distribution.published) {
    // Angular is the only published non-React platform, so it is the only one with an install operation in the
    // command contract. Anything else that becomes published gets its own operation; until then the sentence
    // names the coordinate without spelling a command it cannot derive.
    const install = platform === "Angular" ? renderCommand("install-angular", pm).command : null;
    body = (
      <>
        The {def.label} code imports from <code className="text-foreground">{def.distribution.coordinate}</code>:{" "}
        {install ? (
          <>
            install{" "}
            <code dir="ltr" className="text-foreground">
              {install}
            </code>
          </>
        ) : (
          <>
            install it together with <code className="text-foreground">{PACKAGES.tokens}</code>
          </>
        )}
        , then follow {setup}. The React CLI does not install {def.label} components.
      </>
    );
  } else {
    body = (
      <>
        The {def.label} code uses the KinetixUI {def.label} library, which is source only and not on{" "}
        {def.distribution.channel} yet. Add it from a repository checkout pinned to a commit: {setup}. The React CLI does
        not install {def.label} components.
      </>
    );
  }

  return (
    <div data-blocks-install={platform} className="mt-4 max-w-2xl rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
      <p className="font-medium text-foreground">
        Installing a block on {def.label}
        {def.maturity !== "stable" && <span className="font-normal text-muted-foreground"> · {def.maturity}</span>}
      </p>
      <p className="mt-1 text-muted-foreground">{body}</p>
      <p className="mt-1 text-xs text-muted-foreground">Follows the platform you pick in any block&apos;s code tab.</p>
    </div>
  );
}

/**
 * Under one block, on React only: the CLI command that adds exactly the components its React code imports.
 * The list comes from the block's source (`block-components.ts`); on any other platform it would be the wrong
 * instructions, so nothing is shown there and the guide above says what to do instead.
 */
export function BlockReactInstall({ components, platforms }: { components: string[]; platforms: Platform[] }) {
  const pathname = usePathname();
  const preferred = manifestPlatformFor(usePreferredPlatform());
  const shown = preferred && platforms.includes(preferred) ? preferred : platforms[0];
  const pm = usePreferredPackageManager();
  if (shown !== "React" || components.length === 0) return null;
  // the same contract the docs fences render from, so this line follows the reader's package manager
  // rather than hard-coding npx; there is no room for four tabs under each block, so it follows the
  // choice made elsewhere on the site instead of offering its own.
  const command = renderCommand("cli-add", pm, { components }).command;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>React components it uses:</span>
      <code dir="ltr" className="min-w-0 break-all font-mono text-foreground">
        {command}
      </code>
      {/* classified like a docs fence: a CLI copy reports the package and nothing else */}
      <CopyButton value={command} label="Copy React CLI command for this block" onCopy={() => trackFenceCopy(command, "bash", pathname ?? "/blocks")} className="size-6 shrink-0" />
    </p>
  );
}

/**
 * Under every block, on every platform: links to the component pages its React version is built from. The list is
 * the same one the CLI command uses (read from the block's React source), and it is labelled as React's because only
 * that file is read; each component page then says what the component is on every platform. Plain links,
 * server-rendered with the page, so a reader (or a crawler) on /blocks is one step from the components themselves.
 */
export function BlockComponentLinks({ components }: { components: string[] }) {
  const pages = components
    .map((slug) => componentDocs.find((c) => c.href === `/docs/components/${slug}`))
    .filter((c): c is (typeof componentDocs)[number] => Boolean(c));
  if (pages.length === 0) return null;
  return (
    <p data-block-components className="mt-1.5 text-xs text-muted-foreground">
      <span>Built from (React version): </span>
      {pages.map((c, i) => (
        <span key={c.href}>
          {i > 0 ? ", " : null}
          <Link href={c.href} className={link}>
            {c.title}
          </Link>
        </span>
      ))}
    </p>
  );
}

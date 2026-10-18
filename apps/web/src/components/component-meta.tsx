"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { registryItemFor } from "@/lib/registry-items";
import { PRIMITIVE, COMPONENT_CATEGORY } from "@/lib/component-registry";
import { PlatformVerification } from "@/components/platform-verification";
import { STATUS } from "@/lib/component-status";
import { PACKAGES } from "@/lib/packages";
import { NpmLinks } from "./npm-links";
import { PLATFORMS, PLATFORM_DEFINITIONS } from "@/lib/platform-parity";
import { GUIDANCE_LABEL, SETUP_HREF, WAVE_LABEL, platformStateFor } from "@/lib/platform-tabs";
import { trackFenceCopy } from "@/lib/analytics-surfaces";
import { CopyButton } from "./copy-button";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div data-component-meta className="flex flex-wrap items-baseline gap-x-3 px-3.5 py-2">
      {/* The 5rem label column resolves to 160px at the reader's doubled text size and `shrink-0`
          forbade it from yielding, so the row could not fit a narrow viewport. Below `sm` the label and
          its value wrap instead; the aligned column returns where there is room for it. */}
      <dt className="font-mono text-label-md uppercase tracking-[0.14em] text-muted-foreground sm:w-20 sm:shrink-0">
        {label}
      </dt>
      <dd className="min-w-0 font-mono text-body-sm sm:flex-1 sm:basis-0">{children}</dd>
    </div>
  );
}


function Command({ value, label, pathname }: { value: string; label: string; pathname: string }) {
  return (
    // wraps rather than overflowing: at 200% text the docs column can be very narrow, and the button then sits under the command
    <span className="flex flex-wrap items-center gap-1">
      {/* text-body-sm: the global inline-code rule is 0.875em, which inside this 12px row is 10.5px */}
      <code className="min-w-0 break-all text-body-sm">{value}</code>
      {/* The command is classified by the same rule as a docs fence; only a package name and platform are sent. */}
      <CopyButton value={value} label={label} onCopy={() => trackFenceCopy(value, "bash", pathname)} className="size-6 shrink-0" />
    </span>
  );
}

/**
 * How to get this component on each platform, on the component's own page.
 *
 * Everything is derived: the platform list, labels and maturity from the manifest's platform definitions, whether a
 * package is published from `distribution.published`, and what this component is on each platform from the same
 * parity data the code tabs read. So a native port that is not on its registry says "source only" here, and an
 * Angular gap says "not implemented yet", without either being written down twice.
 */
function InstallStrip({ slug, pathname }: { slug: string; pathname: string }) {
  return (
    // `overflow-wrap:anywhere`: this strip used to be pinned at 13px, which does not grow with the reader's text size,
    // and that is the only reason it fitted the 70px-wide column a docs page leaves it at 1280px and 200% text. On the
    // type scale it grows, and a word such as "Compose" is then wider than the column; `anywhere` (unlike
    // `break-word`) lets the flex rows' min-content shrink below a word, so it wraps instead of overflowing.
    // The narrow column itself is the docs layout's, recorded as a follow-up.
    <ul aria-label="Install by platform" className="space-y-2 font-sans text-body-md [overflow-wrap:anywhere]">
      {PLATFORMS.map((p) => {
        const def = PLATFORM_DEFINITIONS[p];
        const state = platformStateFor(slug, p);
        if (!state) return null;
        return (
          <li key={p} data-platform={p} className="space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span>
                <span className="font-medium text-foreground">{def.label}</span>
                {def.maturity !== "stable" && <span className="text-muted-foreground"> · {def.maturity}</span>}
              </span>
              <Link href={SETUP_HREF[p]} className="text-primary underline underline-offset-2">
                {/* named per platform for assistive tech; the visible words stay short and are part of the name */}
                <span className="sr-only">{def.label}</span> Setup →
              </Link>
            </div>
            {state !== "implementation" ? (
              <p className="text-muted-foreground">
                {state.type === "planned"
                  ? `${GUIDANCE_LABEL.planned}${state.wave ? ` · ${WAVE_LABEL[state.wave] ?? state.wave} wave` : ""}.`
                  : `${GUIDANCE_LABEL[state.type]} · KinetixUI ships no ${def.label} component for this.`}
              </p>
            ) : def.distribution.published ? (
              <div className="space-y-1 font-mono text-body-sm">
                {p === "React" && <Command value={`npx ${PACKAGES.cli} add ${slug}`} label={`Copy ${def.label} CLI command`} pathname={pathname} />}
                <Command value={`npm i ${def.distribution.coordinate} ${PACKAGES.tokens}`} label={`Copy ${def.label} npm command`} pathname={pathname} />
                <NpmLinks names={[def.distribution.coordinate, PACKAGES.tokens]} />
              </div>
            ) : (
              <p className="text-muted-foreground">Source only, not on {def.distribution.channel} yet: use a repository checkout pinned to a commit.</p>
            )}
            {p === "React" && state === "implementation" && (
              <p className="text-muted-foreground">
                The CLI copies React source. Usage imports from {def.distribution.coordinate} require the npm package;
                for copied source, use your configured local import instead.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Compact spec strip under a component-doc title. Auto-derived from the route. */
export function ComponentMeta() {
  const pathname = usePathname();
  const slug = pathname.startsWith("/docs/components/") ? pathname.split("/").pop()! : "";
  if (!slug) return null;

  return (
    <dl
      aria-label="Component metadata"
      className="my-6 divide-y divide-border rounded-lg border border-border bg-muted/20"
    >
      {COMPONENT_CATEGORY[slug] && <Row label="Category">{COMPONENT_CATEGORY[slug]}</Row>}
      {STATUS[slug] && (
        <Row label="Status">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className={
                STATUS[slug] === "deprecated"
                  ? "size-1.5 rounded-full bg-destructive"
                  : "size-1.5 rounded-full bg-info"
              }
            />
            <span className="capitalize">{STATUS[slug]}</span>
            {STATUS[slug] === "beta" && (
              <span className="text-muted-foreground">
                — new this release,{" "}
                <Link href="/docs/contributing#component-status" className="text-primary underline underline-offset-2">
                  what that means →
                </Link>
              </span>
            )}
          </span>
        </Row>
      )}
      {PRIMITIVE[slug] && <Row label="Built on">{PRIMITIVE[slug]}</Row>}
      <Row label="Platforms">
        <PlatformVerification slug={slug} />
      </Row>
      <Row label="Install">
        <InstallStrip slug={slug} pathname={pathname} />
      </Row>
      <Row label="Registry">
        <a
          href={`/r/${registryItemFor(slug)}.json`}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          /r/{registryItemFor(slug)}.json
        </a>
      </Row>
      <Row label="A11y">
        {/* the axe and keyboard runs this links to cover the React library; each platform's own evidence is in the
            Platforms row above, so this must not read as a claim about all five */}
        <Link href="/docs/accessibility" className="text-primary underline underline-offset-2">
          React: audited in CI →
        </Link>
      </Row>
    </dl>
  );
}

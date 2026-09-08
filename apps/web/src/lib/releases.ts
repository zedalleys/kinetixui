/**
 * Curated release history — the single source for /docs/changelog and the
 * infographic's timeline. Distilled from packages/{cli,tokens,ui}/CHANGELOG.md
 * (Changesets-generated, commit-level) into a few readable highlights per
 * version. Newest first.
 *
 * When you cut a release: add an entry at the top of RELEASES. The per-package
 * CHANGELOG.md files stay the exhaustive record (linked from the page footer).
 */
export type ReleaseChange = {
  /** short bold lead */
  title: string;
  /** optional one- or two-sentence detail */
  body?: string;
};

export type Release = {
  version: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  /** one line — what this release is about */
  summary: string;
  changes: ReleaseChange[];
};

export const RELEASES: Release[] = [
  {
    version: "0.6.0",
    date: "2026-09-08",
    summary: "New AppBar component — a web application top bar.",
    changes: [
      {
        title: "AppBar",
        body: "AppBar + AppBarBrand / AppBarNav / AppBarLink / AppBarActions (and a useAppBar hook): a sticky bordered header with a brand slot, a row of primary nav links (active marks the current one, asChild forwards to a framework <Link>), and a trailing actions slot. Below the md breakpoint the nav collapses behind a menu toggle. NavigationBar stays the mobile back-button bar; AppBar is the desktop app shell. Ported to SwiftUI, Jetpack Compose and Flutter (native ports keep the nav visible and horizontally scrollable instead of a menu toggle).",
      },
    ],
  },
  {
    version: "0.5.1",
    date: "2026-09-08",
    summary: "Security hardening for the CLI and the chart style injection.",
    changes: [
      {
        title: "@kinetixui/cli input validation",
        body: "The CLI now validates the registry base URL (http/https only), every component / registry-dependency name, and every npm dependency spec before it reaches a fetch URL or the package manager, and refuses to write files outside the project root — a hostile registry or a checked-in kinetixui.json can no longer steer it.",
      },
      {
        title: "chart.tsx <style> sanitisation",
        body: "The one component that emits an inline <style> now strips its interpolated identifiers to [\\w-] and drops colour values carrying characters that could close the declaration, the rule, or the element.",
      },
      {
        title: "Published with npm provenance",
        body: "Releases now carry OIDC provenance attestations, and the site ships a Content-Security-Policy plus the standard hardening headers.",
      },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-09-06",
    summary: "Action-blue primary set per theme; component gallery and infographic overhaul.",
    changes: [
      {
        title: "New azure token ramp — --primary is a real action blue",
        body: "The Figma navy read as near-black once pushed for contrast, so --primary / --ring / --accent-foreground now resolve to a dedicated 15-step azure ramp: #1d4ed8 on light, #60a5fa on dark, each chosen to clear WCAG AA on its own surface. Light and dark are two independent palettes. --secondary deepened to green.200 so a secondary control reads against the page.",
      },
      {
        title: "Components gallery — every card previews its component",
        body: "Portal components (dialog, sheet, menus, popover…) and near-empty ones (table, chart, image…) get a purpose-built static mock instead of a lone trigger button. Cards gain a hover lift, an accent edge, and a loading skeleton on navigation.",
      },
      {
        title: "Infographic trimmed to the visual modules",
        body: "Dropped the prose-heavy sections; the world map is now interactive — hover or focus a platform node to trace its link back to the token contract.",
      },
      {
        title: "/colors — azure ramp listed first",
        body: "Ramp notes corrected: blue is the navy surface family, azure backs the interactive tokens.",
      },
    ],
  },
  {
    version: "0.4.3",
    date: "2026-09-06",
    summary: "Data-visualisation expansion.",
    changes: [
      {
        title: "--chart-6 / --chart-7 / --chart-8",
        body: "Three more data-viz hues (light + dark, plus the chart.6/7/8 Tailwind colours) so stacked and categorical charts past five series stay distinguishable.",
      },
      {
        title: "ChartContainer states",
        body: 'Adds state ("loading" | "empty" | "error") with a shimmer / message / alert placeholder, stateMessage, and srTable — a visually-hidden data table for screen readers.',
      },
      {
        title: "+14 chart recipes, +8 infographic modules, a dotted world map",
      },
    ],
  },
  {
    version: "0.4.2",
    date: "2026-09-06",
    summary: "Chart and focus-ring accessibility.",
    changes: [
      {
        title: "Dark-mode focus ring",
        body: "--shadow-focus{,-destructive,-success,-warning} now carry a real dark set built from the dark --ring / semantic primitives. The ring went from ~1.7:1 to 8.8:1 against the dark surface. New export @kinetixui/tokens/css/extras/dark.",
      },
      {
        title: "Light --warning to WCAG AA",
        body: "Moved from the Figma orange #f97907 (2.6–2.7:1 as text) to amber.800 #7f5b21 (5.8–6.1:1). Dark --warning unchanged.",
      },
      {
        title: "Chart text alternative",
        body: 'ChartContainer renders role="img" with a label summary; redundant Recharts a11y artefacts are scrubbed from the output.',
      },
      {
        title: "NumberInput steppers get a focus-visible ring",
      },
    ],
  },
  {
    version: "0.4.1",
    date: "2026-09-06",
    summary: "Destructive colour to WCAG AA; repository move.",
    changes: [
      {
        title: "Light --destructive to WCAG AA",
        body: "Resolves to red.500 #c60a0a instead of the Figma error value #ec5047, which failed AA (3.3:1 as button text, 3.6:1 on the page). It now clears 5.6–6.1:1. Dark mode unchanged.",
      },
      {
        title: "Repository moved to github.com/zedalleys",
      },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-09-06",
    summary: "Four-platform component parity.",
    changes: [
      {
        title: "SwiftUI and Flutter libraries",
        body: "packages/ui-swiftui and packages/ui-flutter join Jetpack Compose — each a 1:1 port of ~68 components on the same token contract, CI-verified per platform. Standing non-ports: Form, NavigationMenu, Combobox.",
      },
      {
        title: "Type scale wired on all four platforms",
        body: "KinetixType.swift / KinetixType.kt / app_text.dart are generated from the typography composites and consumed by the native components.",
      },
      {
        title: "The four-platform rule",
        body: "A new /docs/contributing page: a component or block isn't done until it ships on all four platforms (or is a documented non-port).",
      },
    ],
  },
  {
    version: "0.3.1",
    date: "2026-09-05",
    summary: "One shared version line.",
    changes: [
      {
        title: "@kinetixui/{cli,tokens,ui} on a single version",
        body: "Changesets fixed group — tokens and ui realigned from 0.1.0 to match the CLI. From here they always version and publish together.",
      },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-09-05",
    summary: "CLI list + add --all; Jetpack Compose library.",
    changes: [
      {
        title: "CLI list + add --all",
        body: "npx @kinetixui/cli list prints every component in the registry; add --all installs all of them at once. Backed by a new registry index manifest (apps/web/public/r/registry.json).",
      },
      {
        title: "Jetpack Compose library",
        body: "packages/ui-compose — native Kinetix* composables on the token contract, one per React component, compiled in CI on every push.",
      },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-09-03",
    summary: "Rebrand to KinetixUI.",
    changes: [
      { title: "Strata → KinetixUI", body: "New scope @kinetixui/*, new home kinetixui.com." },
      { title: "Input and Textarea", body: "Generated 1:1 from the design source." },
      { title: "kinetixui.com", body: "The Next.js App Router site, built on @kinetixui/ui." },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-09-02",
    summary: "First public release.",
    changes: [
      {
        title: "@kinetixui/tokens",
        body: "The token contract — CSS variables (light + dark), --shadow-* / --text-* composites, a typed tokens object, and native text styles.",
      },
      {
        title: "@kinetixui/ui",
        body: "React components on the token contract (CVA + Radix + Tailwind) plus the Tailwind preset. Also installable through the shadcn registry at kinetixui.com/r/*.json.",
      },
      {
        title: "@kinetixui/cli",
        body: "A first-party install tool — kinetixui init sets up kinetixui.json, @kinetixui/cli add <name> resolves registry dependencies and writes the source into your tree.",
      },
      {
        title: "Token engine + portable registry",
        body: "DTCG source compiled to web / iOS / Android / Flutter; every component serialised to a shadcn-compatible descriptor. Button generated 1:1 from the design source.",
      },
    ],
  },
];

export const LATEST_VERSION = RELEASES[0].version;

/** GitHub links to the exhaustive, commit-level per-package changelogs. */
export const PACKAGE_CHANGELOGS: { name: string; href: string }[] = [
  { name: "@kinetixui/ui", href: "https://github.com/zedalleys/kinetixui/blob/main/packages/ui/CHANGELOG.md" },
  { name: "@kinetixui/tokens", href: "https://github.com/zedalleys/kinetixui/blob/main/packages/tokens/CHANGELOG.md" },
  { name: "@kinetixui/cli", href: "https://github.com/zedalleys/kinetixui/blob/main/packages/cli/CHANGELOG.md" },
];

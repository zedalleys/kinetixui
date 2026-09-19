/**
 * Curated release history — the source for /docs/changelog and the infographic's timeline.
 * Distilled from packages/{cli,tokens,ui}/CHANGELOG.md (Changesets-generated, commit-level) into
 * readable highlights per version. Newest first.
 *
 * When you cut a release, add an entry at the top of RELEASES. `pnpm check:releases` (CI) fails if
 * the top entry isn't the version the packages published, if a version in the package changelogs has
 * no entry, or if an entry after 0.6.0 leaves `breaking` out. Which packages actually changed is
 * generated (release-packages.json), not written here. The per-package CHANGELOG.md files stay the
 * exhaustive record, linked from the page footer.
 */
import uiPackage from "../../../../packages/ui/package.json";
import packageMeta from "./release-packages.json";

/** Which of the three (version-locked) packages actually changed in a release — generated, see scripts/gen-release-meta.mjs. */
export function packagesChanged(version: string): { cli: boolean; tokens: boolean; ui: boolean } | undefined {
  return (packageMeta.versions as Record<string, { cli: boolean; tokens: boolean; ui: boolean }>)[version];
}

/** What kind of change this is — drives the tag on each line and the page's filters. */
export type ChangeKind = "new" | "improved" | "fixed" | "security" | "accessibility" | "breaking" | "deprecated";

/** Which part of the system it touches. `platforms` = SwiftUI / Compose / Flutter; `release` = publishing plumbing. */
export type ChangeArea = "components" | "tokens" | "cli" | "platforms" | "release";

export type ReleaseChange = {
  /** short bold lead */
  title: string;
  /** optional one- or two-sentence detail */
  body?: string;
  /** omitted on the oldest entries (before 0.6.1), which predate this classification */
  kind?: ChangeKind;
  /** one area, or several when a change is both (e.g. a CLI command that reports platform coverage) */
  area?: ChangeArea | ChangeArea[];
  /** where to read more — a docs route, e.g. "/docs/cli#inspect" */
  href?: string;
};

export type Release = {
  version: string;
  /** ISO date, YYYY-MM-DD (the release tag's date) */
  date: string;
  /** one line — what this release is about */
  summary: string;
  changes: ReleaseChange[];
  /**
   * Explicit breaking changes. `[]` means "none, and I checked". Required from 0.6.1 on; the older
   * entries were not audited for it, so they leave it out rather than claim "none".
   */
  breaking?: string[];
  /** what to do about a breaking or behaviour change */
  migration?: string;
  /** what this release deliberately does NOT do — as visible as the features */
  limitations?: string[];
  /** new components, grouped for scanning; the page adds platform badges from platform-parity.json */
  newComponents?: { group: string; slugs: string[] }[];
};

export const RELEASES: Release[] = [
  {
    version: "0.17.0",
    date: "2026-09-19",
    summary: "Accessibility hardening for the hand-built widgets, contrast fixes, and a richer `inspect`.",
    breaking: [],
    limitations: [
      "DataGrid still has no arrow-key movement between cells, and its column reorder and resize are pointer-only.",
    ],
    changes: [
      {
        kind: "accessibility",
        area: "components",
        title: "Tour, MultiSelect, DataGrid and sliders work from the keyboard",
        body: "Tour now has an accessible name, moves focus into its card, traps Tab and restores focus on close. MultiSelect can be opened and an option chosen without a mouse. DataGrid sortable headers and editable cells are reachable with Tab (Enter / Space / F2 / Esc). Slider and ColorPicker put their accessible name on the thumb — the element that actually has role=\"slider\".",
        href: "/docs/accessibility",
      },
      {
        kind: "accessibility",
        area: "tokens",
        title: "Contrast fixes on tinted and pressed surfaces",
        body: "Banner and Inform information text was 4.15:1 on its own tint; it now uses a new text-info-on-container utility (--semantic-on-info-container). Button Primary pressed is 4.54:1 (was 4.11) and Secondary pressed is a solid fill (was 3.97). All clear WCAG AA in both themes.",
        href: "/colors",
      },
      {
        kind: "new",
        area: "cli",
        title: "`kinetixui inspect` shows parts and props",
        body: "It now prints a component's first release and status, and each part (the component and its sub-components) with the props it declares itself. Specs exist for every component — previously only the 18 that define a cva() variant matrix.",
        href: "/docs/cli#inspect",
      },
      {
        kind: "improved",
        area: "components",
        title: "Components use the type-scale aliases",
        body: "Button, Badge, Tag, Kbd, Input, Select, NativeSelect, Textarea and Modal use text-label-* / text-body-md / text-title-dialog instead of re-deriving them from Tailwind literals. No visual change. cn() now knows the type scale so a text-label-* class no longer swallows a text colour.",
        href: "/docs/tokens",
      },
    ],
  },
  {
    version: "0.16.1",
    date: "2026-09-18",
    summary: "CLI reliability and security hardening for the commands added since 0.13.",
    breaking: [],
    changes: [
      {
        kind: "security",
        area: "cli",
        title: "Theme names are validated before they touch the filesystem",
        body: "`kinetixui theme create ../../../tmp/evil` could read or write outside kinetixui-themes/. Theme names now go through the same charset validation as every other user-supplied identifier. Upgrade if you run the CLI on untrusted input.",
      },
      {
        kind: "fixed",
        area: "cli",
        title: "`inspect` survives a malformed kinetixui.json",
        body: "It prints a warning on the Installed line and carries on, instead of aborting with a raw JSON.parse error — matching how `doctor` already behaved.",
      },
      {
        kind: "fixed",
        area: "cli",
        title: "`doctor` checks the utils alias",
        body: "The alias points at a file, not a directory like the other three, so it was silently skipped. It now gets its own extension-aware existence check.",
      },
      {
        kind: "fixed",
        area: "cli",
        title: "`lint` no longer scans a nested ui directory twice",
        body: "Directories are de-duplicated by containment before any recursive walk starts.",
      },
      {
        kind: "improved",
        area: "cli",
        title: "`lint` spacing pattern hardened",
        body: "Negative arbitrary values (-top-[10px], -inset-[6px]) are now an explicit part of the pattern. The old pattern already caught them, so this is a hardening, not a fix for a missed case.",
      },
    ],
  },
  {
    version: "0.16.0",
    date: "2026-09-18",
    summary: "Design-system linting: `kinetixui lint`.",
    breaking: [],
    limitations: [
      "Does not detect unknown or deprecated tokens (needs a live token list).",
      "Does not check accessibility (needs a real a11y engine) or cross-platform inconsistencies (doesn't apply to a single-platform project).",
    ],
    changes: [
      {
        kind: "new",
        area: "cli",
        title: "`kinetixui lint [path]`",
        body: "Scans for hardcoded hex colours and arbitrary spacing values in Tailwind utilities and inline styles that should be semantic tokens. With no path it scans your components and ui aliases. Reports file:line with a suggestion, skips comments, and only fires in real Tailwind/style contexts (not anchor links or URL fragments). Exits non-zero on any hit unless --no-fail is passed, so it is CI-safe.",
        href: "/docs/cli",
      },
    ],
  },
  {
    version: "0.15.0",
    date: "2026-09-18",
    summary: "Theme tooling: `theme create` and `theme build`.",
    breaking: [],
    limitations: [
      "CSS output only. Native (SwiftUI / Compose / Flutter) theme compilation is not included.",
    ],
    changes: [
      {
        kind: "new",
        area: "cli",
        title: "`kinetixui theme create <name>` and `theme build <name>`",
        body: "Scaffold a token override file (kinetixui-themes/<name>.csv) and compile it to a drop-in CSS :root override block plus a WCAG AA contrast report. It ports the same hex / HSL / contrast maths as the /theme-builder web tool, so both produce identical output for the same input.",
        href: "/theme-builder",
      },
    ],
  },
  {
    version: "0.14.0",
    date: "2026-09-18",
    summary: "Cross-platform inspection from the CLI: `kinetixui parity`.",
    breaking: [],
    changes: [
      {
        kind: "new",
        area: ["cli", "platforms"],
        title: "`kinetixui parity [components...]`",
        body: "A table of which native platforms carry each component, with a status tag for anything beta or deprecated. It reads the same registry index (platform-parity.json / component-status.json) that powers the docs site, so the two cannot drift.",
        href: "/docs/cli#parity",
      },
    ],
  },
  {
    version: "0.13.0",
    date: "2026-09-18",
    summary: "Inspect, Doctor, interaction tokens and the first RTL support.",
    breaking: [],
    limitations: [
      "RTL is slice 1: most components are not yet converted. scripts/check-rtl.mjs tracks the rest and fails CI if a converted file regresses or a new component ships with physical-direction classes.",
      "Only two interaction tokens are wired to a component so far (focus.width and drag.threshold).",
    ],
    changes: [
      {
        kind: "new",
        area: "cli",
        title: "`kinetixui inspect` and `kinetixui doctor`",
        body: "`inspect <name>` shows a registry item's description, dependencies, files, whether it is installed, and — for the ~20 components with a variant matrix — its variant axes. `doctor` checks kinetixui.json, its aliases, the Tailwind CSS target and registry reachability, and exits non-zero on failure so it is CI-safe.",
        href: "/docs/cli#inspect",
      },
      {
        kind: "new",
        area: "tokens",
        title: "Interaction tokens",
        body: "target.minimum (44px), target.default (40px), focus.width (1px), focus.offset (2px), press.opacity (0.8) and drag.threshold (4): behavioural values alongside motion and opacity. focus.width now backs every shadow.focus* token (compiled CSS unchanged) and drag.threshold drives KanbanBoard's activation distance — which gives @kinetixui/ui a new runtime dependency on @kinetixui/tokens.",
        href: "/docs/tokens",
      },
      {
        kind: "new",
        area: "components",
        title: "RTL support: KinetixDirectionProvider",
        body: "A thin wrapper over @radix-ui/react-direction, plus logical-property CSS in InputGroup, Select, NativeSelect, Dialog, Sheet, Drawer, DropdownMenu, Alert and AppBar. Radix portals default to ltr regardless of the page's dir, so converting classes alone left every portaled component mispositioned under dir=\"rtl\"; wrap your app in the provider to fix that.",
        href: "/docs/rtl",
      },
    ],
    newComponents: [{ group: "Internationalisation", slugs: ["direction-provider"] }],
  },
  {
    version: "0.12.0",
    date: "2026-09-17",
    summary: "Twelve advanced components, the largest component release so far.",
    breaking: [],
    limitations: [
      "All twelve are currently marked beta. Platform badges show today's coverage: KanbanBoard and Tour are React-only by design.",
    ],
    changes: [
      {
        kind: "new",
        area: "components",
        title: "Twelve new components",
        body: "Grouped below. Where Radix has no primitive the widget is hand-built: ColorPicker's 2D square, TreeView, and KanbanBoard's drag and drop (on @dnd-kit).",
      },
    ],
    newComponents: [
      { group: "Data & developer tools", slugs: ["data-grid", "json-viewer", "diff-viewer", "virtual-list"] },
      { group: "Productivity", slugs: ["kanban-board", "markdown-editor"] },
      { group: "Communication", slugs: ["message-bubble", "notification-center"] },
      { group: "Selection & input", slugs: ["color-picker", "multi-select"] },
      { group: "Navigation & guidance", slugs: ["tree-view", "tour"] },
    ],
  },
  {
    version: "0.11.0",
    date: "2026-09-16",
    summary: "ComparisonSlider, Marquee and PageHeader.",
    breaking: [],
    changes: [
      { kind: "new", area: "components", title: "ComparisonSlider", body: "A drag handle wiping between two stacked layers (before/after image, a redesign preview), built on Radix Slider for the drag, keyboard and ARIA behaviour." },
      { kind: "new", area: "components", title: "Marquee", body: "An auto-scrolling horizontal ticker that pauses on hover and respects prefers-reduced-motion." },
      { kind: "new", area: "components", title: "PageHeader", body: "Title, optional breadcrumb, description, action cluster and optional tabs row, closed off with a bottom border." },
    ],
    newComponents: [{ group: "Layout & display", slugs: ["comparison-slider", "marquee", "page-header"] }],
  },
  {
    version: "0.10.0",
    date: "2026-09-16",
    summary: "Banner, DescriptionList, SegmentedControl and Timeline.",
    breaking: [],
    changes: [
      { kind: "new", area: "components", title: "Banner", body: "A full-bleed, page-level notice (info / promo / maintenance), optionally dismissible with an action. Distinct from Alert (in-flow, static)." },
      { kind: "new", area: "components", title: "DescriptionList", body: "<dl> term / detail rows in the site's spec-sheet skin." },
      { kind: "new", area: "components", title: "SegmentedControl", body: "An iOS-style single-select strip — a documented preset over ToggleGroup type=\"single\"." },
      { kind: "new", area: "components", title: "Timeline", body: "Ordered events down a rail; `alternating` lays content either side of a centred rail." },
    ],
    newComponents: [{ group: "Layout & display", slugs: ["banner", "description-list", "segmented-control", "timeline"] }],
  },
  {
    version: "0.9.0",
    date: "2026-09-16",
    summary: "ButtonGroup and NativeSelect.",
    breaking: [],
    changes: [
      { kind: "new", area: "components", title: "ButtonGroup and NativeSelect", body: "ButtonGroup / ButtonGroupSeparator / ButtonGroupText, and NativeSelect / NativeSelectOption / NativeSelectOptGroup — closing gaps flagged in an audit against shadcn/ui's component matrix. NativeSelect is React-only by design (KinetixSelect already wraps each platform's own native picker)." },
    ],
    newComponents: [{ group: "Actions & input", slugs: ["button-group", "native-select"] }],
  },
  {
    version: "0.8.0",
    date: "2026-09-16",
    summary: "Empty and Kbd.",
    breaking: [],
    changes: [
      { kind: "new", area: "components", title: "Empty", body: "A composable placeholder for zero-result states (empty table, empty search, fresh workspace)." },
      { kind: "new", area: "components", title: "Kbd and KbdGroup", body: "A single keyboard key glyph, plus a wrapper for shortcut combos. Ships on all four platforms." },
    ],
    newComponents: [{ group: "Feedback & display", slugs: ["empty", "kbd"] }],
  },
  {
    version: "0.7.0",
    date: "2026-09-16",
    summary: "Motion, opacity and z-index tokens; asChild on Badge and Tag.",
    breaking: [],
    changes: [
      {
        kind: "new",
        area: "tokens",
        title: "Motion, opacity and z-index tokens",
        body: "Three new DTCG primitives — duration / easing, opacity and z-index — grounded in the values already hard-coded across the component library (duration-200/300/500/1000, ease-linear / ease-in-out, the opacity-0/50/70/100 usages, the z-10…z-50 layers).",
        href: "/docs/tokens",
      },
      {
        kind: "improved",
        area: "components",
        title: "Badge and Tag support asChild",
        body: "Both can render as a single wrapped element (<Badge asChild><a href=\"/new\">New</a></Badge>) instead of always forcing a <div> / <span>.",
      },
    ],
  },
  {
    version: "0.6.5",
    date: "2026-09-15",
    summary: "CLI reports its real version.",
    breaking: [],
    changes: [
      { kind: "fixed", area: "cli", title: "`kinetixui --version` printed a stale \"0.3.0\"", body: "The version is now read from package.json and inlined at build time, so it can't drift from a release again." },
    ],
  },
  {
    version: "0.6.4",
    date: "2026-09-15",
    summary: "React 19 toolchain and dependency upgrade.",
    breaking: [
      "Public props are unchanged, but Calendar, Chart, DataTable and ResizablePanel* were ported to react-day-picker v10, recharts v3, @tanstack/react-table v9 and react-resizable-panels v4. Anything that reaches past them into the underlying library's DOM, class names or data attributes (e.g. .day-range-start, data-panel-group-direction) may change.",
    ],
    migration:
      "If you style or query Calendar, Chart, DataTable or the Resizable components by the underlying library's class names or data attributes, re-check those selectors against the new libraries' output. Nothing changes if you only use the components' own props.",
    changes: [
      { kind: "improved", area: "components", title: "Upgrade to React 19 and current Radix, recharts, react-day-picker, @tanstack/react-table, react-resizable-panels and zod", body: "The peer range is still react >=18." },
    ],
  },
  {
    version: "0.6.3",
    date: "2026-09-09",
    summary: "Release plumbing: npm trusted publishing.",
    breaking: [],
    changes: [
      { kind: "improved", area: "release", title: "Publish via npm trusted publishing (OIDC)", body: "Each package has a trusted publisher configured on npmjs.com, replacing a long-lived NPM_TOKEN." },
    ],
  },
  {
    version: "0.6.2",
    date: "2026-09-09",
    summary: "Release plumbing: provenance-preserving publish.",
    breaking: [],
    changes: [
      { kind: "fixed", area: "release", title: "Provenance was being dropped", body: "Releases now publish with `pnpm -r publish --provenance` (a directory publish) instead of `changeset publish`, whose tarball step drops the attestation. Git tags come from `changeset git-tag`." },
    ],
  },
  {
    version: "0.6.1",
    date: "2026-09-09",
    summary: "Publishes carry npm provenance.",
    breaking: [],
    changes: [
      { kind: "security", area: "release", title: "npm provenance attestation on every publish", body: "You can verify each package was built from this repository by the release workflow." },
    ],
  },
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

export type ReleaseType = "Major" | "Minor" | "Patch" | "Initial";

/** Major / Minor / Patch, by comparing a release with the one before it (the oldest is the "Initial" release). */
export function releaseTypeAt(index: number): ReleaseType {
  const cur = RELEASES[index]!.version.split(".").map(Number);
  const prev = RELEASES[index + 1]?.version.split(".").map(Number);
  if (!prev) return "Initial";
  if (cur[0] !== prev[0]) return "Major";
  if (cur[1] !== prev[1]) return "Minor";
  return "Patch";
}

/**
 * Feature releases and any patch that carries something users must know (security, accessibility or a
 * breaking change) get a full entry; other patches render compactly, and are left off the infographic.
 */
export function isNotable(index: number): boolean {
  const r = RELEASES[index]!;
  return (
    releaseTypeAt(index) !== "Patch" ||
    (r.breaking?.length ?? 0) > 0 ||
    r.changes.some((c) => c.kind === "security" || c.kind === "accessibility" || c.kind === "breaking")
  );
}

/**
 * The version the packages actually published — read from packages/ui/package.json, never from
 * RELEASES[0]. This is what froze the page at 0.6.0 for eleven releases. `scripts/check-releases.mjs`
 * (CI) fails if the top entry above doesn't match it.
 */
export const LATEST_VERSION: string = uiPackage.version;

/** GitHub links to the exhaustive, commit-level per-package changelogs. */
export const PACKAGE_CHANGELOGS: { name: string; href: string }[] = [
  { name: "@kinetixui/ui", href: "https://github.com/zedalleys/kinetixui/blob/main/packages/ui/CHANGELOG.md" },
  { name: "@kinetixui/tokens", href: "https://github.com/zedalleys/kinetixui/blob/main/packages/tokens/CHANGELOG.md" },
  { name: "@kinetixui/cli", href: "https://github.com/zedalleys/kinetixui/blob/main/packages/cli/CHANGELOG.md" },
];

/**
 * Search titles and descriptions for every page that is not a component page, in one table.
 *
 * Why one table rather than a `metadata` object in each file: the search-intent map
 * (marketing/seo/SEARCH-INTENT-MAP.md) assigns every route ONE primary intent so pages stop competing with
 * each other, and that assignment is only checkable if the titles sit side by side. A unit test
 * (route-seo.test.ts) keeps them unique, inside a readable length, and free of claims CLAIMS.md forbids;
 * `pnpm check:seo` then checks what the build actually emitted.
 *
 * Every platform list and count here is DERIVED from the manifest — the same rule the rest of the site
 * follows, because a title is a coverage claim that a reader acts on.
 *
 * Component pages are not here: their title and description are generated from the manifest per component
 * (`componentMetadata` in seo.ts), which is the only way 98 pages get distinct, truthful metadata.
 */
import type { Metadata } from "next";
import { blockTotal, platformsWithBlocks } from "./blocks";
import { IOT_MATURITY } from "./iot";
import { PLATFORMS, PLATFORM_DEFINITIONS, type Platform } from "./platform-parity";
import { list } from "./platform-prose";
import { pageMetadata, type PageSeo } from "./seo";
import { siteConfig } from "./site";

const label = (p: Platform) => PLATFORM_DEFINITIONS[p].label;
const short = (p: Platform) => label(p).replace(/^Jetpack /, "");
/** "React, Angular, SwiftUI, Compose & Flutter" */
const shortAll = (() => {
  const s = PLATFORMS.map(short);
  return `${s.slice(0, -1).join(", ")} & ${s.at(-1)}`;
})();
/** "React, Angular, SwiftUI, Jetpack Compose and Flutter" */
const longAll = list(PLATFORMS.map(label));
const native = PLATFORMS.filter((p) => PLATFORM_DEFINITIONS[p].family === "native");
const nativeShort = list(native.map(short));

/**
 * A native platform page's description: what it is, then the distribution truth read from the manifest, so the
 * day a port reaches its registry the snippet stops saying "source you build" without anyone editing it.
 */
function nativeDescription(p: Platform, lead: string): string {
  const d = PLATFORM_DEFINITIONS[p];
  const distribution = d.distribution.published
    ? `Installs from ${d.distribution.channel}.`
    : `Compiled in CI; source you build today, not yet on ${d.distribution.channel}.`;
  return `${lead} ${distribution}`;
}

const angular = PLATFORM_DEFINITIONS.Angular;

/** "Angular installs from npm; SwiftUI, Jetpack Compose and Flutter build from a repository checkout." — derived. */
function installDistribution(): string {
  const others = PLATFORMS.filter((p) => p !== "React");
  const registry = others.filter((p) => PLATFORM_DEFINITIONS[p].distribution.published);
  const source = others.filter((p) => !PLATFORM_DEFINITIONS[p].distribution.published);
  const parts = [
    ...registry.map((p) => `${label(p)} installs from ${PLATFORM_DEFINITIONS[p].distribution.channel}`),
    source.length ? `${list(source.map(label))} build from a repository checkout` : "",
  ].filter(Boolean);
  return parts.length ? `${parts.join("; ")}.` : "";
}

/** Keyed by route. The order follows SEARCH-INTENT-MAP.md. */
export const ROUTE_SEO = {
  "/": {
    title: `${siteConfig.name} — Cross-platform design system infrastructure`,
    absoluteTitle: true,
    type: "website",
    description: `A design system for teams shipping on more than one platform: one DTCG token source generates native tokens for ${longAll}, components are implemented natively per platform, and every platform claim is checked against real source in CI.`,
    // The share card keeps the hero line; search gets the category.
    social: { title: `${siteConfig.name} — ${siteConfig.tagline}` },
  },
  "/components": {
    title: `UI components for ${shortAll}`,
    type: "website",
    description: `Browse every component in the KinetixUI registry — live previews, which platforms implement each one, and the CLI command to add it. React and Angular install from npm; the ${list(native.map(label))} implementations are source you compile.`,
  },
  "/docs/platforms": {
    title: `Platform coverage for ${shortAll}`,
    description: `What KinetixUI implements on each platform — component coverage, maturity, distribution and the CI that verifies each claim, read from the manifest, including where coverage is thin.`,
  },
  "/docs/tokens": {
    title: "Design tokens for web, iOS and Android from one DTCG source",
    description: `How the token engine works: one DTCG source compiled by Style Dictionary into CSS variables and TypeScript for the web, and colour, type, spacing and motion constants for ${list(native.map(label))}. One token traced through every platform's output.`,
  },
  "/docs/angular": {
    title: `Angular component library and design tokens (${angular.maturity})`,
    description: `KinetixUI for Angular: standalone components and directives on native elements, on the shared KinetixUI token contract. Published on npm as ${angular.distribution.coordinate} and in ${angular.maturity} — a deliberate subset of the catalogue, versioned on its own.`,
  },
  "/docs/swiftui": {
    title: "SwiftUI component library and design tokens",
    description: nativeDescription(
      "SwiftUI",
      "Native SwiftUI views implementing the shared KinetixUI component contract, on Swift tokens generated from the same DTCG source as the web.",
    ),
  },
  "/docs/compose": {
    title: "Jetpack Compose component library and design tokens",
    description: nativeDescription(
      "Compose",
      "Kotlin composables implementing the shared KinetixUI component contract for Android, on Compose tokens generated from the same DTCG source as the web.",
    ),
  },
  "/docs/flutter": {
    title: "Flutter component library and design tokens",
    description: nativeDescription(
      "Flutter",
      "Dart widgets implementing the shared KinetixUI component contract, with Material and Cupertino theme adapters so stock widgets inherit the generated tokens.",
    ),
  },
  "/docs": {
    title: "Documentation: tokens, native components and verification",
    description:
      "How KinetixUI fits together: one design-token source compiled to CSS, TypeScript, Swift, Kotlin and Dart, and the component libraries implemented separately on top of it — which are installable today and which are source you compile is on Supported platforms.",
  },
  "/docs/installation": {
    title: "Installation: CLI, npm packages and native source",
    // the page opens with a platform choice, so the snippet names every platform's route, derived like the title
    description: `Install KinetixUI on your platform. React: the CLI copies component source into your repo, or npm adds it as a versioned dependency, on the same tokens. ${installDistribution()}`,
  },
  "/docs/foundations": {
    title: "Foundations: spacing grid, radius, elevation and motion",
    description: `KinetixUI's spatial grid, radius, elevation and motion tokens — one source, compiled to ${longAll}.`,
  },
  "/docs/theming": {
    title: "Theming with semantic design tokens",
    description:
      "The semantic token contract — background, foreground, action, destructive and the rest — and how to retheme KinetixUI by overriding those variables rather than restyling components.",
  },
  "/docs/colors": {
    title: "Colour palette and semantic colour tokens with contrast",
    description:
      "Every colour in the KinetixUI palette: the primitive ramps, the semantic tokens they back, and each pair's WCAG contrast in light and dark. Click a swatch to copy its value.",
  },
  "/docs/dark-mode": {
    title: "Dark mode with design tokens",
    description: "How KinetixUI's dark theme works — a second value set for the same semantic tokens — and how to wire a toggle.",
  },
  "/docs/rtl": {
    title: "RTL support: right-to-left components and layout",
    description:
      `Right-to-left support in KinetixUI: React components mirror under dir="rtl" through logical properties enforced in CI, how ${nativeShort} read layout direction, and the two pieces a consuming app provides.`,
  },
  "/docs/accessibility": {
    title: "Accessibility: keyboard, focus, contrast and the evidence",
    description:
      "How KinetixUI components handle keyboard interaction, focus visibility and contrast, what CI checks on every change, and the known trade-offs — evidence rather than a compliance badge.",
  },
  "/docs/icons": {
    title: "Icons across platforms: sources, sizing and direction",
    description:
      "How icons work in KinetixUI: each platform's own icon source as the default, components that own an icon's size, colour, name and direction, and slots that take your product's icons.",
  },
  "/docs/cli": {
    title: "CLI: add components and themes from the registry",
    description:
      "The kinetixui CLI: init a project, add components from the registry, inspect a component's platform coverage, build a custom theme, and lint your code for hardcoded colours and spacing.",
  },
  "/docs/kinetixui-json": {
    title: "kinetixui.json configuration",
    description: "The kinetixui.json file the CLI reads: the stylesheet that receives the token contract, the import aliases components land under, and an optional registry mirror.",
  },
  "/docs/component-specs": {
    title: "Platform-independent component specs",
    description:
      "A generated, platform-independent contract per component — variant axes, exported parts and the props each declares, extracted from the real source.",
  },
  "/docs/iot": {
    title: "IoT module: device state, commands and telemetry",
    description: `KinetixUI IoT is a React-only, ${IOT_MATURITY} module for connected products: device state, a command lifecycle that separates requested from confirmed, telemetry, alerts, automation rules, pairing and places. It ships no transport, no automation engine and no video.`,
  },
  "/docs/contributing": {
    title: "Contributing: the platform rule",
    description:
      `The platform rule — every new component ships React, ${list(native.map(label))} code, each CI-verified, and declares what its Angular tab shows.`,
  },
  "/docs/changelog": {
    title: "Changelog: components, platforms and tokens",
    description:
      "New components, platform support, token updates, CLI improvements, accessibility fixes, and breaking changes across KinetixUI.",
  },
  "/blocks": {
    title: "UI blocks: sign-in, settings, dashboard and pricing sections",
    type: "website",
    description: `${blockTotal} ready-made sections — sign-in and account forms, settings lists, dashboard stats and tables, pricing, empty and loading states — assembled from KinetixUI components, with source for ${list(platformsWithBlocks.map(label))}.`,
  },
  "/charts": {
    title: "React charts themed with design tokens",
    type: "website",
    description: "Area, bar, line, pie, radar and radial charts built on Recharts and coloured by the KinetixUI chart tokens, so they follow the theme in light and dark.",
  },
  "/themes": {
    title: "Light and dark themes on one semantic token contract",
    type: "website",
    description: "The KinetixUI light and dark themes side by side: one semantic contract, two value sets, rendered on real components.",
  },
  "/create": {
    title: `Theme builder for web, ${nativeShort}`,
    type: "website",
    description: `Shape the KinetixUI design language visually — theme colour, neutral, radius and surface — preview it on real web components in light and dark, then export the same theme as web CSS, ${list(native.map(label))}.`,
  },
  "/infographic": {
    title: "How KinetixUI is built, drawn to scale",
    type: "website",
    description: `The KinetixUI system drawn to scale — one design source, the token outputs it generates and the ${PLATFORMS.length} component libraries built on it, measured from the repository.`,
  },
  "/iot": {
    title: "IoT UI components for device state, telemetry and commands",
    type: "website",
    description:
      "Controls, telemetry, pairing and automation patterns for real asynchronous hardware. KinetixUI IoT is a React-only, experimental module that draws what a device confirmed differently from what a user requested. It ships no transport, no automation engine and no video; every demo on this page is simulated.",
    social: {
      title: "KinetixUI IoT — Build connected products that tell the truth about device state",
      description:
        "Controls, telemetry, pairing and automation patterns for real asynchronous hardware. React-only and experimental, with no transport and no automation engine.",
    },
  },
  "/demos/building-operations": {
    title: "Building operations dashboard demo (simulated)",
    type: "website",
    description:
      "A simulated commercial building operations console built with KinetixUI: floors, an interactive floor plan, occupancy against zone capacity, camera placeholders with connection status and telemetry, and alerts. Five scripted scenarios, including a crowded zone, an offline camera, stale telemetry and recovery after a link failure. No real devices, video or people detection.",
    social: {
      title: "KinetixUI Building Operations demo (simulated)",
      description:
        "Floors, occupancy, camera placeholders and alerts that stay honest when readings go stale or devices drop off. Simulated data only.",
    },
  },
} satisfies Record<string, Omit<PageSeo, "path">>;

export type SeoRoute = keyof typeof ROUTE_SEO;

/** `export const metadata = routeMetadata("/docs/swiftui")` — the page's search and share metadata. */
export function routeMetadata(path: SeoRoute): Metadata {
  return pageMetadata({ path, ...(ROUTE_SEO[path] as Omit<PageSeo, "path">) });
}

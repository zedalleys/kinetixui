/**
 * Data for /docs/platforms. Component counts are derived from components.manifest.json (the single source
 * for per-platform coverage); the verification facts below are what each platform's CI workflow actually
 * runs, with the workflow named so they can be re-checked. Nothing here is aspirational — anything the
 * repository does not implement is listed under `notSupported`, not given a status.
 */
import manifest from "../../../../components.manifest.json";
import { CATALOG_PLATFORMS, NATIVE_PLATFORMS, evidenceStatus, type Platform } from "./platform-parity";

type Guidance = { type: "native-equivalent" | "composition" | "planned"; reason?: string; wave?: string };
type ManifestComponent = {
  status: string;
  kind: "component" | "recipe";
  platforms: string[];
  platformNote?: string;
  platformGuidance?: Record<string, Guidance>;
};
const components = manifest.components as Record<string, ManifestComponent>;
const all = Object.keys(components);

const count = (platform: string) => all.filter((n) => components[n]!.platforms.includes(platform)).length;
export const componentTotal = all.length;

/** How many components ship on `platform` — the one place prose and tables get a coverage number from. */
export const platformCount = count;

/**
 * Catalogue entries that the manifest itself says are not components.
 *
 * `combobox` is a documented composition of `Command`. This used to be detected by matching "not a component"
 * in its `platformNote`; the manifest now declares `kind: "recipe"` and `check:manifest` holds the note and the
 * kind to each other, so the prose stays true for the marketing drafts that still parse it while the code reads
 * a field. `scripts/marketing-stats.mjs` reads the same field, which is why the two agree.
 *
 * This matters publicly: "98 components" overstates by one, and `marketing/CLAIMS.md` B2 makes the honest
 * phrasing a condition of quoting the number at all.
 */
export const recipes = all.filter((n) => components[n]!.kind === "recipe");

/** Entries that really are components — 98 minus the documented recipes. */
export const componentCount = componentTotal - recipes.length;

/** Derived from the manifest's platform families — never a second hard-coded list. */
const NATIVE: readonly string[] = NATIVE_PLATFORMS;

/**
 * The standing non-ports: components with no native implementation on ANY native platform. Derived, so adding
 * one to the manifest (or porting one) changes every sentence and list that mentions them. A component missing
 * from only some platforms (`chart` on Compose) is a gap, not a standing non-port.
 */
export const nonPorts = all.filter((n) => NATIVE.every((p) => !components[n]!.platforms.includes(p)));

/**
 * The RTL cell, derived from the verification evidence rather than typed.
 *
 * These were hand-written ("Core controls tested; the rest not audited") and drifted in both directions: Flutter
 * gained RTL evidence on most of its catalogue while its cell still said "core controls", and Compose's cell implied
 * more than its single component of evidence. The count is the one `verification.json` holds, so the cell cannot
 * disagree with the evidence table on the same page. `mechanism` is the platform's own direction API, which is a
 * fact about the platform rather than a measurement.
 */
const rtlCell = (platform: Platform, mechanism: string) => {
  // the same evidence state the verification cards print, so the two cannot describe one count differently
  const e = evidenceStatus(platform, "rtl");
  const evidence =
    e.state === "not-yet-verified"
      ? "no RTL test evidence yet"
      : e.count === e.of
        ? `RTL test evidence for all ${e.of} catalogue entries`
        : `${e.label.toLowerCase()}: RTL test evidence for ${e.count} of ${e.of} catalogue entries; the rest are not audited`;
  return `${mechanism} — ${evidence}`;
};

export type PlatformRow = {
  id: string;
  name: string;
  technology: string;
  package: string;
  distribution: string;
  components: number;
  tokens: string;
  darkMode: string;
  rtl: string;
  verification: string;
  workflow: string;
};

export const platforms: PlatformRow[] = [
  {
    id: "react",
    name: "Web · React",
    technology: "React + Radix + Tailwind",
    package: "@kinetixui/ui",
    distribution: "npm, and source via `npx @kinetixui/cli add`",
    components: count("React"),
    tokens: "CSS variables, Tailwind preset, typed TS object",
    darkMode: "Yes — `.dark` class",
    rtl: rtlCell("React", "Logical properties plus `KinetixDirectionProvider`"),
    verification: "Unit, interaction and keyboard tests; axe in jsdom and in a real browser (light + dark); contrast, RTL, typography and grid guardrails",
    workflow: "ci.yml, a11y-browser.yml",
  },
  {
    id: "angular",
    name: "Web · Angular",
    technology: "Angular (standalone components, signal inputs)",
    package: "@kinetixui/angular",
    distribution: "npm — versioned independently of `@kinetixui/{tokens,ui,cli}`",
    components: count("Angular"),
    tokens: "The same generated CSS custom properties as React — one stylesheet, no Angular-specific token set",
    darkMode: "Yes — the same `.dark` class contract",
    rtl: rtlCell("Angular", "The document's `dir`"),
    verification:
      "`ng-packagr` AOT build with strictTemplates (every template compiled), plus Vitest behaviour tests for roles, keyboard, disabled state, forms integration and RTL. No browser-level axe pass yet",
    workflow: "ci.yml",
  },
  {
    id: "swiftui",
    name: "iOS · SwiftUI",
    technology: "SwiftUI (Swift package)",
    package: "KinetixUI",
    distribution: "From a repository checkout — not published to a registry yet",
    components: count("SwiftUI"),
    tokens: "Swift enums: colors (light + dark), type styles, spacing, radius, motion",
    darkMode: "Yes — follows the system color scheme",
    rtl: rtlCell("SwiftUI", "The `layoutDirection` environment value"),
    verification: "`swift build` and `swift test` on macOS: WCAG contrast of the light and dark colour sets, and the spacing / radius scale. No view-level interaction or accessibility tests yet",
    workflow: "native-swiftui.yml",
  },
  {
    id: "compose",
    name: "Android · Jetpack Compose",
    technology: "Jetpack Compose",
    package: "com.kinetixui:ui-compose",
    distribution: "From a repository checkout — not published to a registry yet",
    components: count("Compose"),
    tokens: "Kotlin objects and `dimens.xml`: colors (light + dark), type styles, spacing, radius, motion",
    darkMode: "Yes — follows `isSystemInDarkTheme()`",
    rtl: rtlCell("Compose", "`LocalLayoutDirection`"),
    verification: "`gradle assembleDebug`, `lintDebug` and Compose UI tests (Robolectric) for the core controls: interaction and accessibility semantics (counted in the evidence table). No screenshot tests yet",
    workflow: "native-compose.yml",
  },
  {
    id: "flutter",
    name: "Flutter",
    technology: "Flutter widgets",
    package: "kinetix_ui",
    distribution: "From a repository checkout — not published to a registry yet",
    components: count("Flutter"),
    tokens: "Dart classes: color scheme (light + dark), type styles, spacing, radius, motion",
    darkMode: "Yes — follows the platform brightness",
    rtl: rtlCell("Flutter", "`Directionality`"),
    verification: "`flutter analyze`, widget smoke tests (light and dark), interaction and accessibility-semantics tests for the core controls, and RTL and large-text tests across most of the catalogue (counted in the evidence table). No golden tests yet",
    workflow: "native-flutter.yml",
  },
];

/** Components that are deliberately not on every platform, with the repository's own reason. */
export const gaps = all
  .map((slug) => {
    const c = components[slug]!;
    const missing = CATALOG_PLATFORMS.filter((p) => !c.platforms.includes(p));
    // What the gap IS, from the manifest's guidance — a composition, or a concept the platform already has.
    // Only reported when every missing platform agrees; a mixed row would need a per-platform table, and
    // there is currently no component whose exceptions disagree.
    const kinds = new Set(missing.map((p) => c.platformGuidance?.[p]?.type).filter(Boolean));
    return { slug, missing, note: c.platformNote, kind: kinds.size === 1 ? [...kinds][0]! : null };
  })
  .filter((g) => g.missing.length > 0);

/** Platforms people ask about that have NO implementation in the repository. */
export const notSupported = [
  { name: "Wear OS", note: "No implementation yet. Approved as a separate track that derives from Core tokens rather than shrinking the phone components (design spec: `WEARABLES.md`)." },
  { name: "watchOS", note: "No implementation yet. Approved on the same track, following watchOS conventions rather than Wear OS's (design spec: `WEARABLES.md`)." },
  { name: "Plain HTML / CSS package", note: "There is no `kx-*` class API. On the web, use React or the registry (`npx @kinetixui/cli add`)." },
] as const;

export const statusCounts = all.reduce<Record<string, number>>((acc, n) => {
  const s = components[n]!.status;
  acc[s] = (acc[s] ?? 0) + 1;
  return acc;
}, {});

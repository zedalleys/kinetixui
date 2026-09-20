/**
 * Data for /docs/platforms. Component counts are derived from components.manifest.json (the single source
 * for per-platform coverage); the verification facts below are what each platform's CI workflow actually
 * runs, with the workflow named so they can be re-checked. Nothing here is aspirational — anything the
 * repository does not implement is listed under `notSupported`, not given a status.
 */
import manifest from "../../../../components.manifest.json";

type ManifestComponent = { status: string; platforms: string[]; platformNote?: string };
const components = manifest.components as Record<string, ManifestComponent>;
const all = Object.keys(components);

const count = (platform: string) => all.filter((n) => components[n]!.platforms.includes(platform)).length;
export const componentTotal = all.length;

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
    rtl: "In progress — logical properties plus `KinetixDirectionProvider`",
    verification: "Unit, interaction and keyboard tests; axe in jsdom and in a real browser (light + dark); contrast, RTL, typography and grid guardrails",
    workflow: "ci.yml, a11y-browser.yml",
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
    rtl: "Not audited yet",
    verification: "`swift build` on macOS (compiles). No unit or snapshot tests yet",
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
    rtl: "Not audited yet",
    verification: "`gradle assembleDebug` and `lintDebug` (compiles, lints). No unit or screenshot tests yet",
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
    rtl: "Not audited yet",
    verification: "`flutter analyze` plus widget smoke tests that build ~55 widgets in light and dark",
    workflow: "native-flutter.yml",
  },
];

/** Components that are deliberately not on every platform, with the repository's own reason. */
export const gaps = all
  .map((slug) => {
    const c = components[slug]!;
    const missing = ["React", "SwiftUI", "Compose", "Flutter"].filter((p) => !c.platforms.includes(p));
    return { slug, missing, note: c.platformNote };
  })
  .filter((g) => g.missing.length > 0);

/** Platforms people ask about that have NO implementation in the repository. */
export const notSupported = [
  { name: "Angular", note: "No package, directive or component." },
  { name: "Wear OS", note: "No implementation. Wearables are a distinct design problem (glanceability, circular screens, large targets), not small phones." },
  { name: "watchOS", note: "No implementation. Follows watchOS conventions if it is ever built — not Wear OS's." },
  { name: "Plain HTML / CSS package", note: "There is no `kx-*` class API. On the web, use React or the registry (`npx @kinetixui/cli add`)." },
] as const;

export const statusCounts = all.reduce<Record<string, number>>((acc, n) => {
  const s = components[n]!.status;
  acc[s] = (acc[s] ?? 0) + 1;
  return acc;
}, {});

import uiPkg from "@kinetixui/ui/package.json";
import { CATEGORY_ORDER as TAXONOMY_ORDER, categoryOf as categoryOfSlug } from "./component-taxonomy";
import { IOT_MATURITY } from "./iot";
import { PLATFORMS, PLATFORM_DEFINITIONS, type Platform } from "./platform-parity";
import { availabilityClause } from "./platform-prose";

/**
 * A platform's maturity as a nav tag, read from `platformDefinitions` in components.manifest.json. Stable
 * platforms get no tag — the tag exists to flag the exception, and a nav full of "stable" labels is noise.
 */
function maturityBadge(platform: Platform): string | undefined {
  const m = PLATFORM_DEFINITIONS[platform].maturity;
  return m === "stable" ? undefined : m;
}

export const siteConfig = {
  name: "KinetixUI",
  // The canonical hero, `marketing/MESSAGING.md` §E, and the same sentence the homepage renders.
  //
  // It replaces "One token architecture, in motion across every platform.", which Phase 2 retired from the
  // hero but which survived here — so every page title, every shared-link card and the generated OG image
  // still carried it. Two things were wrong with it: "every platform" invites the parity reading the whole
  // position rejects, and leading with the mechanism speaks only to someone already convinced that token
  // architecture is the answer.
  //
  // The count is DERIVED, never typed. This string is painted into the OG image at 72px and into every
  // `<title>`, so a hard-coded number here would be a wrong number on a surface nobody re-reads.
  tagline: `One design language. ${PLATFORMS.length} platforms. Claims you can check.`,
  // Derived, not typed: this is the OpenGraph and search snippet, and it named four platforms for weeks
  // after Angular shipped. It also used to say one source becomes "tokens and components", which implies the
  // component code is generated too — it is not, and the homepage stopped saying so in #199.
  //
  // It now carries `availabilityClause` rather than `platformSentence`. Both name all five platforms, but
  // `platformSentence` is derived from maturity alone, and every native port is "stable" on that axis while
  // being on no package registry. A search snippet is a surface someone acts on, so it has to say which of
  // the five they can install — see platform-prose.ts.
  description: `KinetixUI compiles one DTCG token source into every platform's own token output. Components are native per platform: ${availabilityClause}.`,
  url: "https://kinetixui.com",
  repo: "https://github.com/zedalleys/kinetixui",
  figma: "https://www.figma.com/design/GQXTKKJAPbawd4wcuE77Pf/KinetixUI?node-id=3877-10388",
  // Read from @kinetixui/ui at build time — @kinetixui/{ui,cli,tokens} are a
  // changesets `fixed` group, so this one number tracks all three.
  version: uiPkg.version,
  license: uiPkg.license,
};

export type NavItem = {
  title: string;
  href: string;
  /** show a "soon" marker in the nav; the route is a coming-soon page */
  soon?: boolean;
  /** a short status tag shown beside the title (e.g. a platform's maturity) — derive it, never type it */
  badge?: string;
};

export type NavGroup = { title: string; items: NavItem[] };

export const mainNav: NavItem[] = [
  { title: "Docs", href: "/docs" },
  { title: "Components", href: "/components" },
  { title: "Blocks", href: "/blocks" },
  { title: "Charts", href: "/charts" },
  { title: "Infographic", href: "/infographic" },
  { title: "Themes", href: "/themes" },
  { title: "Create", href: "/create" },
  // A module, beside Create, rather than a sixth entry in any platform list: IoT adds a domain vocabulary on
  // top of the token contract, it does not re-implement the component surface for a platform.
  //
  // No `badge` here on purpose. The primary nav and the mobile sheet render `soon` but not `badge` — badges are
  // a docs-sidebar affordance — so one would be a prop that silently does nothing, and IoT would be the only
  // item in an eight-item bar carrying a maturity. The module's maturity is stated where someone reads it: the
  // /iot hero, the homepage module section, and the docs sidebar entry below.
  { title: "IoT", href: "/iot" },
];

const built = (title: string, slug: string): NavItem => ({ title, href: `/docs/components/${slug}` });

const slugOf = (href: string) => href.split("/").pop() ?? "";

/** Alphabetical master list — drives the /components gallery. */
export const componentDocs: NavItem[] = [
  built("Accordion", "accordion"),
  built("Address Fields", "address-fields"),
  built("Alert", "alert"),
  built("Alert Dialog", "alert-dialog"),
  built("Amount Display", "amount-display"),
  built("App Bar", "app-bar"),
  built("Aspect Ratio", "aspect-ratio"),
  built("Audio Player", "audio-player"),
  built("Avatar", "avatar"),
  built("Avatar Group", "avatar-group"),
  built("Badge", "badge"),
  built("Banner", "banner"),
  built("Breadcrumb", "breadcrumb"),
  built("Button", "button"),
  built("Button Group", "button-group"),
  built("Calendar", "calendar"),
  built("Card", "card"),
  built("Carousel", "carousel"),
  built("Chart", "chart"),
  built("Checkbox", "checkbox"),
  built("Circular Progress", "circular-progress"),
  built("Code Block", "code-block"),
  built("Collapsible", "collapsible"),
  built("Color Picker", "color-picker"),
  built("Combobox", "combobox"),
  built("Command", "command"),
  built("Comparison Slider", "comparison-slider"),
  built("Context Menu", "context-menu"),
  built("Country Select", "country-select"),
  built("Data Grid", "data-grid"),
  built("Data Table", "data-table"),
  built("Date Picker", "date-picker"),
  built("Date Range Input", "date-range-input"),
  built("Description List", "description-list"),
  built("Dialog", "dialog"),
  built("Diff Viewer", "diff-viewer"),
  built("Direction Provider", "direction-provider"),
  built("Drawer", "drawer"),
  built("Dropdown Menu", "dropdown-menu"),
  built("Empty", "empty"),
  built("Fab", "fab"),
  built("Field", "field"),
  built("File Upload", "file-upload"),
  built("Footer", "footer"),
  built("Form", "form"),
  built("Guest Picker", "guest-picker"),
  built("Hover Card", "hover-card"),
  built("Image", "image"),
  built("Inform", "inform"),
  built("Input", "input"),
  built("Input Group", "input-group"),
  built("Input OTP", "input-otp"),
  built("Password Input", "password-input"),
  built("JSON Viewer", "json-viewer"),
  built("Kanban Board", "kanban-board"),
  built("Kbd", "kbd"),
  built("Label", "label"),
  built("List", "list"),
  built("Markdown Editor", "markdown-editor"),
  built("Marquee", "marquee"),
  built("Menubar", "menubar"),
  built("Message Bubble", "message-bubble"),
  built("Metric", "metric"),
  built("Modal", "modal"),
  built("Multi-Select", "multi-select"),
  built("Native Select", "native-select"),
  built("Navigation Bar", "navigation-bar"),
  built("Navigation Menu", "navigation-menu"),
  built("Notification Center", "notification-center"),
  built("Number Input", "number-input"),
  built("Page Header", "page-header"),
  built("Pagination", "pagination"),
  built("Pass Card", "pass-card"),
  built("Phone Input", "phone-input"),
  built("Popover", "popover"),
  built("Price Breakdown", "price-breakdown"),
  built("Progress", "progress"),
  built("Quote", "quote"),
  built("Radio Group", "radio-group"),
  built("Rating", "rating"),
  built("Reference Code", "reference-code"),
  built("Resizable", "resizable"),
  built("Result State", "result-state"),
  built("Scroll Area", "scroll-area"),
  built("Segmented Control", "segmented-control"),
  built("Select", "select"),
  built("Separator", "separator"),
  built("Sheet", "sheet"),
  built("Sidebar", "sidebar"),
  built("Skeleton", "skeleton"),
  built("Slider", "slider"),
  built("Sonner", "sonner"),
  built("Spinner", "spinner"),
  built("Stepper", "stepper"),
  built("Switch", "switch"),
  built("Tab Bar", "tab-bar"),
  built("Tag", "tag"),
  built("Table", "table"),
  built("Table of Contents", "table-of-contents"),
  built("Tabs", "tabs"),
  built("Textarea", "textarea"),
  built("Time Slot Picker", "time-slot-picker"),
  built("Timeline", "timeline"),
  built("Toggle", "toggle"),
  built("Toggle Group", "toggle-group"),
  built("Tooltip", "tooltip"),
  built("Tour", "tour"),
  built("Tree View", "tree-view"),
  built("Virtual List", "virtual-list"),
];

/**
 * The functional taxonomy, generated from `components.manifest.json` (`pnpm gen:manifest`).
 *
 * Both of these used to be hand-written here, with a 107-entry twin in `scripts/gen-stories.mjs` and a
 * comment in each claiming to mirror the other. They had drifted, and an unknown slug fell back to
 * "Data Display" (CAT-BUG-019). Re-exported rather than re-declared so every existing import keeps working.
 */
export { COMPONENT_CATEGORY, CATEGORY_ORDER, CATEGORY_RULE, categoryOf } from "@/lib/component-taxonomy";

const componentGroups: NavGroup[] = TAXONOMY_ORDER.map((title) => ({
  title,
  // categoryOf, not a lookup with a default: a component missing from the manifest throws here rather than
  // appearing under Data Display, and check:manifest is what keeps the throw unreachable.
  items: componentDocs.filter((i) => categoryOfSlug(slugOf(i.href)) === title),
}));

/** The docs' own guide pages, without the per-component groups. What the mobile menu lists. */
export const docsGuideNav: NavGroup[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "Supported platforms", href: "/docs/platforms" },
      { title: "CLI", href: "/docs/cli" },
      { title: "kinetixui.json", href: "/docs/kinetixui-json" },
      { title: "Component specs", href: "/docs/component-specs" },
    ],
  },
  {
    title: "Styling",
    items: [
      { title: "Foundations", href: "/docs/foundations" },
      { title: "Tokens", href: "/docs/tokens" },
      { title: "Colors", href: "/docs/colors" },
      { title: "Icons", href: "/docs/icons" },
      { title: "Theming", href: "/docs/theming" },
      { title: "Dark Mode", href: "/docs/dark-mode" },
      { title: "RTL", href: "/docs/rtl" },
      { title: "Accessibility", href: "/docs/accessibility" },
    ],
  },
  {
    // web and native implementation libraries together — "Native Platforms" stopped being true when Angular arrived
    title: "Platform libraries",
    items: [
      { title: "Angular", href: "/docs/angular", badge: maturityBadge("Angular") },
      { title: "Jetpack Compose", href: "/docs/compose" },
      { title: "SwiftUI", href: "/docs/swiftui" },
      { title: "Flutter", href: "/docs/flutter" },
    ],
  },
  {
    // Not "Platform libraries": a module adds a domain vocabulary on top of the token contract, it does
    // not re-implement the component surface for a platform. Filing IoT above would have implied a sixth
    // platform and an IoT port of all 98 components, neither of which exists.
    title: "Modules",
    items: [{ title: "IoT", href: "/docs/iot", badge: IOT_MATURITY }],
  },
  {
    title: "Project",
    items: [
      { title: "Contributing", href: "/docs/contributing" },
      { title: "Changelog", href: "/docs/changelog" },
    ],
  },
];

/** Every docs page: the guide groups, then one group per component category. Drives the sidebar and search. */
export const docsNav: NavGroup[] = [...docsGuideNav, ...componentGroups];

export const allDocsLinks: NavItem[] = docsNav.flatMap((g) => g.items);

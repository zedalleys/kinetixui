import uiPkg from "@kinetixui/ui/package.json";
import { PLATFORM_DEFINITIONS, type Platform } from "./platform-parity";
import { platformSentence } from "./platform-prose";

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
  tagline: "One token architecture, in motion across every platform.",
  // Derived, not typed: this is the OpenGraph and search snippet, and it named four platforms for weeks
  // after Angular shipped. It also used to say one source becomes "tokens and components", which implies the
  // component code is generated too — it is not, and the homepage stopped saying so in #199.
  description: `KinetixUI compiles one DTCG token source into every platform's own token output, and ships native component implementations for ${platformSentence}.`,
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
];

const built = (title: string, slug: string): NavItem => ({ title, href: `/docs/components/${slug}` });

const slugOf = (href: string) => href.split("/").pop() ?? "";

/** Alphabetical master list — drives the /components gallery. */
export const componentDocs: NavItem[] = [
  built("Accordion", "accordion"),
  built("Alert", "alert"),
  built("Alert Dialog", "alert-dialog"),
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
  built("Data Grid", "data-grid"),
  built("Data Table", "data-table"),
  built("Date Picker", "date-picker"),
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
  built("Popover", "popover"),
  built("Progress", "progress"),
  built("Quote", "quote"),
  built("Radio Group", "radio-group"),
  built("Rating", "rating"),
  built("Resizable", "resizable"),
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
  built("Timeline", "timeline"),
  built("Toggle", "toggle"),
  built("Toggle Group", "toggle-group"),
  built("Tooltip", "tooltip"),
  built("Tour", "tour"),
  built("Tree View", "tree-view"),
  built("Virtual List", "virtual-list"),
];

/** slug → sidebar category. Mirrors the taxonomy in scripts/gen-stories.mjs. */
export const COMPONENT_CATEGORY: Record<string, string> = {
  "aspect-ratio": "Foundations", separator: "Foundations", skeleton: "Foundations",
  spinner: "Foundations", label: "Foundations", image: "Foundations", "code-block": "Foundations",
  kbd: "Foundations", "direction-provider": "Foundations",

  input: "Form Inputs", textarea: "Form Inputs", checkbox: "Form Inputs", "radio-group": "Form Inputs",
  select: "Form Inputs", "native-select": "Form Inputs", "multi-select": "Form Inputs", slider: "Form Inputs", switch: "Form Inputs", "input-otp": "Form Inputs",
  "input-group": "Form Inputs", "password-input": "Form Inputs", "number-input": "Form Inputs",
  field: "Form Inputs", form: "Form Inputs", "file-upload": "Form Inputs", "date-picker": "Form Inputs",
  calendar: "Form Inputs", rating: "Form Inputs", "color-picker": "Form Inputs", "markdown-editor": "Form Inputs",

  button: "Controls & Actions", "button-group": "Controls & Actions", toggle: "Controls & Actions",
  "toggle-group": "Controls & Actions", "segmented-control": "Controls & Actions",
  fab: "Controls & Actions", pagination: "Controls & Actions", command: "Controls & Actions",
  combobox: "Controls & Actions", "comparison-slider": "Controls & Actions",

  breadcrumb: "Navigation", tabs: "Navigation", "tab-bar": "Navigation", "navigation-menu": "Navigation",
  "page-header": "Navigation", "tree-view": "Navigation",
  "navigation-bar": "Navigation", "app-bar": "Navigation", menubar: "Navigation", sidebar: "Navigation",
  stepper: "Navigation", "table-of-contents": "Navigation",

  dialog: "Overlays", "alert-dialog": "Overlays", sheet: "Overlays", drawer: "Overlays",
  popover: "Overlays", "hover-card": "Overlays", tooltip: "Overlays", "dropdown-menu": "Overlays",
  "notification-center": "Overlays", tour: "Overlays",
  "context-menu": "Overlays", modal: "Overlays",

  alert: "Feedback", inform: "Feedback", banner: "Feedback", progress: "Feedback", "circular-progress": "Feedback",
  empty: "Feedback",
  sonner: "Feedback", badge: "Feedback", tag: "Feedback", metric: "Feedback",

  accordion: "Data Display", card: "Data Display", table: "Data Display", "data-table": "Data Display", "data-grid": "Data Display",
  carousel: "Data Display", chart: "Data Display", avatar: "Data Display", "avatar-group": "Data Display", collapsible: "Data Display",
  "scroll-area": "Data Display", resizable: "Data Display", list: "Data Display", quote: "Data Display",
  footer: "Data Display", "audio-player": "Data Display", "description-list": "Data Display",
  timeline: "Data Display", marquee: "Data Display", "message-bubble": "Data Display",
  "virtual-list": "Data Display", "json-viewer": "Data Display", "diff-viewer": "Data Display",
  "kanban-board": "Data Display",
};

export const CATEGORY_ORDER = [
  "Foundations",
  "Form Inputs",
  "Controls & Actions",
  "Navigation",
  "Overlays",
  "Feedback",
  "Data Display",
] as const;

const componentGroups: NavGroup[] = CATEGORY_ORDER.map((title) => ({
  title,
  items: componentDocs.filter((i) => (COMPONENT_CATEGORY[slugOf(i.href)] ?? "Data Display") === title),
}));

export const docsNav: NavGroup[] = [
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
    title: "Project",
    items: [
      { title: "Contributing", href: "/docs/contributing" },
      { title: "Changelog", href: "/docs/changelog" },
    ],
  },
  ...componentGroups,
];

export const allDocsLinks: NavItem[] = docsNav.flatMap((g) => g.items);

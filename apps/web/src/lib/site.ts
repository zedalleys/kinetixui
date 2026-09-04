export const siteConfig = {
  name: "KinetixUI",
  tagline: "One token architecture, in motion across every platform.",
  description:
    "KinetixUI turns a single design source into living tokens and components for React, SwiftUI, Jetpack Compose and Flutter.",
  url: "https://kinetixui.com",
  repo: "https://github.com/ziadfteha/kinetixui",
  figma: "https://www.figma.com/design/GQXTKKJAPbawd4wcuE77Pf/KinetixUI?node-id=3877-10388",
};

export type NavItem = {
  title: string;
  href: string;
};

export type NavGroup = { title: string; items: NavItem[] };

export const mainNav: NavItem[] = [
  { title: "Docs", href: "/docs" },
  { title: "Components", href: "/components" },
  { title: "Blocks", href: "/blocks" },
  { title: "Charts", href: "/charts" },
  { title: "Themes", href: "/themes" },
  { title: "Colors", href: "/colors" },
];

const built = (title: string, slug: string): NavItem => ({ title, href: `/docs/components/${slug}` });

const slugOf = (href: string) => href.split("/").pop() ?? "";

/** Alphabetical master list — drives the /components gallery. */
export const componentDocs: NavItem[] = [
  built("Accordion", "accordion"),
  built("Alert", "alert"),
  built("Alert Dialog", "alert-dialog"),
  built("Aspect Ratio", "aspect-ratio"),
  built("Audio Player", "audio-player"),
  built("Avatar", "avatar"),
  built("Badge", "badge"),
  built("Breadcrumb", "breadcrumb"),
  built("Button", "button"),
  built("Calendar", "calendar"),
  built("Card", "card"),
  built("Carousel", "carousel"),
  built("Chart", "chart"),
  built("Checkbox", "checkbox"),
  built("Circular Progress", "circular-progress"),
  built("Code Block", "code-block"),
  built("Collapsible", "collapsible"),
  built("Combobox", "combobox"),
  built("Command", "command"),
  built("Context Menu", "context-menu"),
  built("Data Table", "data-table"),
  built("Date Picker", "date-picker"),
  built("Dialog", "dialog"),
  built("Drawer", "drawer"),
  built("Dropdown Menu", "dropdown-menu"),
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
  built("Label", "label"),
  built("List", "list"),
  built("Menubar", "menubar"),
  built("Metric", "metric"),
  built("Modal", "modal"),
  built("Navigation Bar", "navigation-bar"),
  built("Navigation Menu", "navigation-menu"),
  built("Number Input", "number-input"),
  built("Pagination", "pagination"),
  built("Popover", "popover"),
  built("Progress", "progress"),
  built("Quote", "quote"),
  built("Radio Group", "radio-group"),
  built("Rating", "rating"),
  built("Resizable", "resizable"),
  built("Scroll Area", "scroll-area"),
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
  built("Toggle", "toggle"),
  built("Toggle Group", "toggle-group"),
  built("Tooltip", "tooltip"),
];

/** slug → sidebar category. Mirrors the taxonomy in scripts/gen-stories.mjs. */
const COMPONENT_CATEGORY: Record<string, string> = {
  "aspect-ratio": "Foundations", separator: "Foundations", skeleton: "Foundations",
  spinner: "Foundations", label: "Foundations", image: "Foundations", "code-block": "Foundations",

  input: "Form Inputs", textarea: "Form Inputs", checkbox: "Form Inputs", "radio-group": "Form Inputs",
  select: "Form Inputs", slider: "Form Inputs", switch: "Form Inputs", "input-otp": "Form Inputs",
  "input-group": "Form Inputs", "password-input": "Form Inputs", "number-input": "Form Inputs",
  field: "Form Inputs", form: "Form Inputs", "file-upload": "Form Inputs", "date-picker": "Form Inputs",
  calendar: "Form Inputs", rating: "Form Inputs",

  button: "Controls & Actions", toggle: "Controls & Actions", "toggle-group": "Controls & Actions",
  fab: "Controls & Actions", pagination: "Controls & Actions", command: "Controls & Actions",
  combobox: "Controls & Actions",

  breadcrumb: "Navigation", tabs: "Navigation", "tab-bar": "Navigation", "navigation-menu": "Navigation",
  "navigation-bar": "Navigation", menubar: "Navigation", sidebar: "Navigation", stepper: "Navigation",
  "table-of-contents": "Navigation",

  dialog: "Overlays", "alert-dialog": "Overlays", sheet: "Overlays", drawer: "Overlays",
  popover: "Overlays", "hover-card": "Overlays", tooltip: "Overlays", "dropdown-menu": "Overlays",
  "context-menu": "Overlays", modal: "Overlays",

  alert: "Feedback", inform: "Feedback", progress: "Feedback", "circular-progress": "Feedback",
  sonner: "Feedback", badge: "Feedback", tag: "Feedback", metric: "Feedback",

  accordion: "Data Display", card: "Data Display", table: "Data Display", "data-table": "Data Display",
  carousel: "Data Display", chart: "Data Display", avatar: "Data Display", collapsible: "Data Display",
  "scroll-area": "Data Display", resizable: "Data Display", list: "Data Display", quote: "Data Display",
  footer: "Data Display", "audio-player": "Data Display",
};

const CATEGORY_ORDER = [
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
      { title: "kinetixui.json", href: "/docs/kinetixui-json" },
      { title: "Theming", href: "/docs/theming" },
      { title: "Dark Mode", href: "/docs/dark-mode" },
      { title: "Accessibility", href: "/docs/accessibility" },
      { title: "CLI", href: "/docs/cli" },
      { title: "Tokens", href: "/docs/tokens" },
      { title: "Changelog", href: "/docs/changelog" },
    ],
  },
  ...componentGroups,
];

export const allDocsLinks: NavItem[] = docsNav.flatMap((g) => g.items);

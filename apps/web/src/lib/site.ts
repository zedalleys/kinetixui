export const siteConfig = {
  name: "KinetixUI",
  tagline: "One token architecture, in motion across every platform.",
  description:
    "KinetixUI turns a single design source into living tokens and components for React, SwiftUI, Jetpack Compose and Flutter.",
  url: "https://kinetixui.com",
  repo: "https://github.com/kinetixui/kinetixui",
  figma: "https://www.figma.com/design/GQXTKKJAPbawd4wcuE77Pf/KinetixUI?node-id=3877-10388",
};

export type NavItem = {
  title: string;
  href: string;
  label?: string;
  disabled?: boolean;
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

/** built = has a real component + doc page; soon = doc shell only */
const built = (title: string, slug: string): NavItem => ({ title, href: `/docs/components/${slug}` });
const soon = (title: string, slug: string): NavItem => ({
  title,
  href: `/docs/components/${slug}`,
  label: "Soon",
  disabled: true,
});

export const docsNav: NavGroup[] = [
  {
    title: "Getting Started",
    items: [
      { title: "Introduction", href: "/docs" },
      { title: "Installation", href: "/docs/installation" },
      { title: "components.json", href: "/docs/components-json" },
      { title: "Theming", href: "/docs/theming" },
      { title: "Dark Mode", href: "/docs/dark-mode" },
      { title: "CLI", href: "/docs/cli" },
      { title: "Tokens", href: "/docs/tokens" },
      { title: "Changelog", href: "/docs/changelog" },
    ],
  },
  {
    title: "Components",
    items: [
      built("Accordion", "accordion"),
      built("Alert", "alert"),
      built("Alert Dialog", "alert-dialog"),
      built("Aspect Ratio", "aspect-ratio"),
      built("Avatar", "avatar"),
      built("Badge", "badge"),
      built("Breadcrumb", "breadcrumb"),
      built("Button", "button"),
      soon("Calendar", "calendar"),
      built("Card", "card"),
      soon("Carousel", "carousel"),
      soon("Chart", "chart"),
      built("Checkbox", "checkbox"),
      built("Collapsible", "collapsible"),
      soon("Combobox", "combobox"),
      soon("Command", "command"),
      soon("Context Menu", "context-menu"),
      soon("Data Table", "data-table"),
      soon("Date Picker", "date-picker"),
      built("Dialog", "dialog"),
      soon("Drawer", "drawer"),
      built("Dropdown Menu", "dropdown-menu"),
      soon("Form", "form"),
      built("Hover Card", "hover-card"),
      built("Input", "input"),
      soon("Input OTP", "input-otp"),
      built("Label", "label"),
      soon("Menubar", "menubar"),
      soon("Navigation Menu", "navigation-menu"),
      built("Pagination", "pagination"),
      built("Popover", "popover"),
      built("Progress", "progress"),
      built("Radio Group", "radio-group"),
      soon("Resizable", "resizable"),
      built("Scroll Area", "scroll-area"),
      built("Select", "select"),
      built("Separator", "separator"),
      built("Sheet", "sheet"),
      soon("Sidebar", "sidebar"),
      built("Skeleton", "skeleton"),
      built("Slider", "slider"),
      built("Sonner", "sonner"),
      built("Switch", "switch"),
      built("Table", "table"),
      built("Tabs", "tabs"),
      built("Textarea", "textarea"),
      built("Toggle", "toggle"),
      built("Toggle Group", "toggle-group"),
      built("Tooltip", "tooltip"),
    ],
  },
];

export const allDocsLinks: NavItem[] = docsNav.flatMap((g) => g.items);

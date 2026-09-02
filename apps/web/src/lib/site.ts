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

/** top bar */
export const mainNav: NavItem[] = [
  { title: "Docs", href: "/docs" },
  { title: "Components", href: "/components" },
  { title: "Blocks", href: "/blocks" },
  { title: "Charts", href: "/charts" },
  { title: "Themes", href: "/themes" },
  { title: "Colors", href: "/colors" },
];

/** docs left sidebar */
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
      { title: "Button", href: "/docs/components/button" },
      { title: "Input", href: "/docs/components/input" },
      { title: "Textarea", href: "/docs/components/textarea" },
      { title: "Select", href: "/docs/components/select", label: "Soon", disabled: true },
      { title: "Checkbox", href: "/docs/components/checkbox", label: "Soon", disabled: true },
      { title: "Radio Group", href: "/docs/components/radio-group", label: "Soon", disabled: true },
      { title: "Switch", href: "/docs/components/switch", label: "Soon", disabled: true },
      { title: "Badge", href: "/docs/components/badge", label: "Soon", disabled: true },
      { title: "Tag", href: "/docs/components/tag", label: "Soon", disabled: true },
      { title: "Dialog", href: "/docs/components/dialog", label: "Soon", disabled: true },
    ],
  },
];

/** flat list for the ⌘K command menu */
export const allDocsLinks: NavItem[] = docsNav.flatMap((g) => g.items);

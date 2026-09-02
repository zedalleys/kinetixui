export const siteConfig = {
  name: "Strata",
  tagline: "The design system, in code and design.",
  description:
    "A personal design system compiled from Figma. Tokens for web, iOS, Android and Flutter; React components; a shadcn registry.",
  url: "https://strata.design",
  repo: "https://github.com/strata/design-system",
  figma:
    "https://www.figma.com/design/GQXTKKJAPbawd4wcuE77Pf/Personal-Design-System?node-id=3877-10388",
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

/** docs left sidebar — mirrors shadcn's structure */
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

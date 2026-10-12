/**
 * The guides registry as plain data, with no imports, so build scripts (`check:editorial`) can read it with Node
 * directly. Rendering helpers live in `guides.ts`; read that file's header for the publication rules.
 */
export type GuideStatus = "draft" | "published";

export type Guide = {
  slug: string;
  /** The H1 and the article headline. */
  title: string;
  /** The search title, when the headline is too long for a results page. The root template appends " — KinetixUI". */
  searchTitle?: string;
  /** Plain-text search snippet. */
  description: string;
  /** The one intent this guide owns; must match its row in SEARCH-INTENT-MAP.md. */
  primaryIntent: string;
  role: "pillar" | "supporting";
  status: GuideStatus;
  /** ISO date (YYYY-MM-DD) the guide was published. Only when `status` is "published", and only the real date. */
  datePublished?: string;
  /** ISO date of a meaningful revision after publication. Optional, and never a build date. */
  dateModified?: string;
  /** The one primary call to action: a product page that continues the reader's question. */
  cta: { label: string; href: string };
};

export const GUIDES: readonly Guide[] = [
  {
    slug: "cross-platform-design-systems",
    title: "Cross-platform design systems: architecture, parity and trade-offs",
    searchTitle: "Cross-platform design systems: architecture, parity, trade-offs",
    description:
      "How a design system for web, iOS and Android is put together: shared tokens, native components, what parity really requires, how to verify it, and what to check before adopting one.",
    primaryIntent: "cross-platform design system architecture",
    role: "pillar",
    status: "draft",
    cta: { label: "Explore platform coverage", href: "/docs/platforms" },
  },
  {
    slug: "generated-tokens-vs-generated-components",
    title: "Generated tokens vs generated components",
    searchTitle: "Generated tokens vs generated components in a design system",
    description:
      "Why design tokens can be generated for every platform from one source while components usually cannot, and what a hand-written component on each platform costs and buys.",
    primaryIntent: "generated design tokens vs generated components",
    role: "supporting",
    status: "draft",
    cta: { label: "See token implementation", href: "/docs/tokens" },
  },
  {
    slug: "verify-design-system-parity",
    title: "How to verify design system parity across web, iOS and Android",
    searchTitle: "How to verify design system parity across web, iOS and Android",
    description:
      "A practical way to check that components behave alike on every platform: evidence by kind, measured from the tests, reported by the weakest component, with negative controls.",
    primaryIntent: "design system parity verification",
    role: "supporting",
    status: "draft",
    cta: { label: "View verification evidence", href: "/docs/platforms#availability-package-maturity-and-verification-are-three-different-things" },
  },
  {
    slug: "evaluate-cross-platform-component-library",
    title: "What a cross-platform component library should actually give you",
    searchTitle: "Evaluating a cross-platform component library: a checklist",
    description:
      "A checklist for teams choosing a component library for more than one platform: coverage per platform, distribution, maturity, behaviour evidence, accessibility, RTL, theming and updates.",
    primaryIntent: "cross-platform component library evaluation",
    role: "supporting",
    status: "draft",
    cta: { label: "Explore components", href: "/components" },
  },
];

export const PILLAR = GUIDES.find((g) => g.role === "pillar")!;

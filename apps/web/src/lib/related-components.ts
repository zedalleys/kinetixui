/**
 * Which component pages a component page links to under "Related components".
 *
 * Two sources, in order. An explicit relation, for the families a reader genuinely chooses between (a Dialog
 * reader may want an Alert Dialog, a Sheet or a Drawer instead). Whatever that leaves of the four is filled with the
 * component's neighbours in its own catalogue category, nearest first either side and wrapping round, so every page gets the same number of
 * inbound links from its siblings and none is left out because it sorts last. Nothing is per-page copy: a new
 * component joins its category's ring the moment it is in `componentDocs` and the manifest.
 */
import { categoryOf } from "./component-taxonomy";
import { componentDocs } from "./site";

export type RelatedComponent = { slug: string; title: string; href: string };

const SLUG = (href: string) => href.split("/").pop() ?? "";

/** Families a reader picks between. Every slug must be a real component page; the tests check it. */
export const RELATED: Record<string, readonly string[]> = {
  dialog: ["alert-dialog", "modal", "sheet", "drawer"],
  "alert-dialog": ["dialog", "modal", "sheet", "drawer"],
  modal: ["dialog", "alert-dialog", "sheet", "drawer"],
  sheet: ["drawer", "dialog", "modal", "sidebar"],
  drawer: ["sheet", "dialog", "modal", "alert-dialog"],
  popover: ["hover-card", "tooltip", "dropdown-menu", "dialog"],
  tooltip: ["hover-card", "popover", "kbd"],
  "hover-card": ["popover", "tooltip"],
  "dropdown-menu": ["context-menu", "menubar", "select", "command"],
  "context-menu": ["dropdown-menu", "menubar"],
  menubar: ["dropdown-menu", "navigation-menu", "context-menu"],
  select: ["native-select", "combobox", "multi-select", "command"],
  "native-select": ["select", "combobox", "radio-group"],
  combobox: ["select", "multi-select", "command", "input"],
  "multi-select": ["select", "combobox", "checkbox", "tag"],
  command: ["combobox", "select", "dropdown-menu", "kbd"],
  input: ["input-group", "textarea", "password-input", "number-input"],
  textarea: ["input", "markdown-editor", "field"],
  "input-group": ["input", "number-input", "password-input", "button-group"],
  "password-input": ["input", "input-group", "input-otp"],
  "number-input": ["input", "input-group", "slider"],
  "input-otp": ["input", "password-input"],
  field: ["form", "label", "input", "textarea"],
  form: ["field", "label", "input", "file-upload"],
  checkbox: ["switch", "radio-group", "toggle"],
  switch: ["checkbox", "toggle", "segmented-control"],
  "radio-group": ["checkbox", "segmented-control", "select", "native-select"],
  toggle: ["toggle-group", "switch", "button"],
  "toggle-group": ["toggle", "segmented-control", "button-group"],
  "segmented-control": ["tabs", "toggle-group", "radio-group"],
  button: ["button-group", "toggle", "fab"],
  "button-group": ["button", "toggle-group", "input-group"],
  breadcrumb: ["pagination", "tabs", "navigation-menu"],
  tabs: ["segmented-control", "tab-bar", "accordion"],
  "tab-bar": ["tabs", "navigation-bar", "app-bar"],
  "navigation-bar": ["tab-bar", "app-bar", "sidebar"],
  pagination: ["breadcrumb", "data-table", "virtual-list"],
  table: ["data-table", "data-grid", "description-list"],
  "data-table": ["table", "data-grid", "pagination"],
  "data-grid": ["data-table", "table", "virtual-list"],
  accordion: ["collapsible", "tabs"],
  collapsible: ["accordion"],
  alert: ["banner", "inform", "sonner", "alert-dialog"],
  banner: ["alert", "inform", "notification-center"],
  sonner: ["alert", "notification-center", "banner"],
  progress: ["circular-progress", "spinner", "skeleton"],
  "circular-progress": ["progress", "spinner"],
  spinner: ["progress", "skeleton", "circular-progress"],
  skeleton: ["spinner", "progress", "empty"],
  badge: ["tag", "avatar"],
  tag: ["badge", "multi-select"],
  avatar: ["avatar-group", "badge"],
  "avatar-group": ["avatar"],
  calendar: ["date-picker"],
  "date-picker": ["calendar", "input"],
  "virtual-list": ["list", "data-grid", "scroll-area"],
};

const PAGES = new Map(componentDocs.map((i) => [SLUG(i.href), i]));

const toRelated = (slug: string): RelatedComponent => {
  const page = PAGES.get(slug)!;
  return { slug, title: page.title, href: page.href };
};

/** The component pages to offer from `slug`'s page: up to four, never itself, each a real page. */
export function relatedComponents(slug: string, limit = 4): RelatedComponent[] {
  if (!PAGES.has(slug)) return [];
  const picks = (RELATED[slug] ?? []).filter((s) => s !== slug && PAGES.has(s)).slice(0, limit);

  // fill what the explicit list leaves with neighbours in the category ring
  const category = categoryOf(slug);
  const ring = [...PAGES.keys()].filter((s) => categoryOf(s) === category);
  const at = ring.indexOf(slug);
  for (const step of [1, -1, 2, -2, 3, -3]) {
    if (picks.length >= limit || ring.length < 2) break;
    const s = ring[(at + step + ring.length * 4) % ring.length]!;
    if (s !== slug && !picks.includes(s)) picks.push(s);
  }
  return picks.map(toRelated);
}

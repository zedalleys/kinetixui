import { COMPONENT_CATEGORY, CATEGORY_ORDER } from "@/lib/site";

export { COMPONENT_CATEGORY, CATEGORY_ORDER };

/**
 * slug → the primitive the component is built on (only the ones we're sure of).
 * Single source of truth — imported by both <ComponentMeta> (doc pages) and the
 * /components gallery. Keep in sync with the components as they gain/lose a base.
 */
export const PRIMITIVE: Record<string, string> = {
  accordion: "Radix Accordion",
  "alert-dialog": "Radix Alert Dialog",
  "aspect-ratio": "Radix Aspect Ratio",
  avatar: "Radix Avatar",
  "avatar-group": "Radix Avatar",
  calendar: "React DayPicker",
  "date-picker": "React DayPicker",
  carousel: "Embla Carousel",
  checkbox: "Radix Checkbox",
  collapsible: "Radix Collapsible",
  combobox: "cmdk + Radix Popover",
  command: "cmdk",
  "context-menu": "Radix Context Menu",
  dialog: "Radix Dialog",
  modal: "Radix Dialog",
  drawer: "Vaul",
  sheet: "Radix Dialog",
  "dropdown-menu": "Radix Dropdown Menu",
  "hover-card": "Radix Hover Card",
  label: "Radix Label",
  menubar: "Radix Menubar",
  "navigation-menu": "Radix Navigation Menu",
  popover: "Radix Popover",
  progress: "Radix Progress",
  "circular-progress": "Radix Progress",
  "radio-group": "Radix Radio Group",
  resizable: "react-resizable-panels",
  "scroll-area": "Radix Scroll Area",
  select: "Radix Select",
  separator: "Radix Separator",
  slider: "Radix Slider",
  sonner: "Sonner",
  switch: "Radix Switch",
  tabs: "Radix Tabs",
  "tab-bar": "Radix Tabs",
  toggle: "Radix Toggle",
  "toggle-group": "Radix Toggle Group",
  tooltip: "Radix Tooltip",
  form: "React Hook Form + Radix",
  chart: "Recharts",
};

/** Category for a component slug, falling back to the sidebar default. */
export function categoryOf(slug: string): string {
  return COMPONENT_CATEGORY[slug] ?? "Data Display";
}

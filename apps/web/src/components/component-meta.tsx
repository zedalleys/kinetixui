"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** slug → the primitive the component is built on (only the ones we're sure of). */
const PRIMITIVE: Record<string, string> = {
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
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 px-3.5 py-2">
      <dt className="w-20 shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 font-mono text-[12px]">{children}</dd>
    </div>
  );
}

/** Compact spec strip under a component-doc title. Auto-derived from the route. */
export function ComponentMeta() {
  const pathname = usePathname();
  const slug = pathname.startsWith("/docs/components/") ? pathname.split("/").pop()! : "";
  if (!slug) return null;

  return (
    <dl className="my-6 divide-y divide-border rounded-lg border border-border bg-muted/20">
      {PRIMITIVE[slug] && <Row label="Built on">{PRIMITIVE[slug]}</Row>}
      <Row label="CLI">
        <span className="break-all">npx @kinetixui/cli add {slug}</span>
      </Row>
      <Row label="Registry">
        <a
          href={`/r/${slug}.json`}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          /r/{slug}.json
        </a>
      </Row>
      <Row label="A11y">
        <Link href="/docs/accessibility" className="text-primary underline underline-offset-2">
          audited in CI →
        </Link>
      </Row>
    </dl>
  );
}

/**
 * Static, non-interactive "open state" mock-ups for the /components gallery.
 *
 * Portal components (dialog, sheet, dropdown-menu, …) only render a trigger
 * button until opened, so their live demo reads as a lone button floating in an
 * empty card. A handful of others (table, chart, image, aspect-ratio…) render
 * near-empty placeholders. For those slugs the gallery shows one of these mocks
 * instead — plain markup styled against the token contract, no state, no portal.
 *
 * Keyed by component slug. A slug with no entry falls through to its live demo.
 */
import * as React from "react";

/* — shared bits ————————————————————————————————————————————————— */
const Bar = ({ w = "w-full", h = "h-2" }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} rounded-full bg-muted-foreground/25`} />
);
const Btn = ({ solid = false, children }: { solid?: boolean; children: React.ReactNode }) => (
  <span
    className={`rounded-md px-2 py-1 text-[10px] font-medium ${
      solid ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
    }`}
  >
    {children}
  </span>
);
const Panel = ({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={`rounded-lg border border-border bg-card p-3 shadow-lg ${className}`}
  >
    {children}
  </div>
);

/* — dialog family ——————————————————————————————————————————————— */
function DialogMock({ danger = false }: { danger?: boolean }) {
  return (
    <Panel className="w-[220px]">
      <p className="text-xs font-semibold text-foreground">
        {danger ? "Delete project?" : "Edit profile"}
      </p>
      <div className="mt-2 space-y-1.5">
        <Bar w="w-11/12" />
        <Bar w="w-3/5" />
      </div>
      <div className="mt-3 flex justify-end gap-1.5">
        <Btn>Cancel</Btn>
        <Btn solid>{danger ? "Delete" : "Save"}</Btn>
      </div>
    </Panel>
  );
}

function SheetMock({ side = "right" }: { side?: "right" | "bottom" }) {
  const panel = (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-2.5 shadow-lg">
      <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
      <Bar w="w-24" />
      <Bar w="w-16" />
      <Bar w="w-20" />
    </div>
  );
  return (
    <div
      className={`flex h-full w-full ${
        side === "right" ? "justify-end" : "items-end"
      } overflow-hidden rounded-md bg-muted/30 p-1`}
    >
      {panel}
    </div>
  );
}

/* — menus ———————————————————————————————————————————————————————— */
function MenuMock() {
  return (
    <Panel className="w-[160px] p-1.5">
      {["Profile", "Settings", "Team"].map((r, i) => (
        <div
          key={r}
          className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] ${
            i === 1 ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          }`}
        >
          <span className="size-1.5 rounded-full bg-current opacity-60" />
          {r}
        </div>
      ))}
      <div className="my-1 h-px bg-border" />
      <div className="px-2 py-1 text-[11px] text-muted-foreground">Log out</div>
    </Panel>
  );
}

/* — floating cards ————————————————————————————————————————————— */
function PopoverMock({ arrow = true }: { arrow?: boolean }) {
  return (
    <div className="relative">
      <Panel className="w-[180px]">
        <p className="text-[11px] font-semibold text-foreground">Dimensions</p>
        <div className="mt-2 space-y-1.5">
          <Bar w="w-full" />
          <Bar w="w-2/3" />
        </div>
      </Panel>
      {arrow && (
        <div className="absolute left-6 top-full size-2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-card" />
      )}
    </div>
  );
}

function TooltipMock() {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="rounded-md bg-foreground px-2.5 py-1 text-[10px] font-medium text-background shadow-lg">
        Add to library
      </span>
      <span className="size-2 -translate-y-1 rotate-45 bg-foreground" />
      <span className="mt-0.5 rounded-md border border-border px-2.5 py-1 text-[10px] text-muted-foreground">
        Hover
      </span>
    </div>
  );
}

/* — command / combobox ————————————————————————————————————————— */
function CommandMock() {
  return (
    <Panel className="w-[210px] p-0">
      <div className="flex items-center gap-2 border-b border-border px-2.5 py-2">
        <span className="size-3 rounded-full border border-muted-foreground/40" />
        <Bar w="w-24" />
      </div>
      <div className="space-y-0.5 p-1.5">
        {["Calendar", "Search", "Settings"].map((r, i) => (
          <div
            key={r}
            className={`rounded px-2 py-1 text-[11px] ${
              i === 0 ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            {r}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* — navigation ————————————————————————————————————————————————— */
function BreadcrumbMock() {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <span>Home</span>
      <span className="opacity-40">/</span>
      <span>Docs</span>
      <span className="opacity-40">/</span>
      <span className="font-medium text-foreground">Components</span>
    </div>
  );
}

function PaginationMock() {
  return (
    <div className="flex items-center gap-1">
      <span className="rounded border border-border px-1.5 py-1 text-[11px] text-muted-foreground">‹</span>
      {["1", "2", "3"].map((n) => (
        <span
          key={n}
          className={`rounded px-2 py-1 text-[11px] ${
            n === "2"
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground"
          }`}
        >
          {n}
        </span>
      ))}
      <span className="px-1 text-[11px] text-muted-foreground">…</span>
      <span className="rounded border border-border px-1.5 py-1 text-[11px] text-muted-foreground">›</span>
    </div>
  );
}

function TocMock() {
  return (
    <div className="space-y-1.5 border-l border-border pl-3 text-[11px]">
      <p className="font-medium text-primary">Overview</p>
      <p className="text-muted-foreground">Installation</p>
      <p className="pl-3 text-muted-foreground">CLI</p>
      <p className="text-muted-foreground">Usage</p>
    </div>
  );
}

function FooterMock() {
  return (
    <div className="w-full max-w-[240px] space-y-2">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((c) => (
          <div key={c} className="space-y-1">
            <div className="h-1.5 w-10 rounded-full bg-muted-foreground/40" />
            <Bar w="w-12" h="h-1.5" />
            <Bar w="w-10" h="h-1.5" />
            <Bar w="w-11" h="h-1.5" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border pt-2">
        <Bar w="w-16" h="h-1.5" />
        <Bar w="w-8" h="h-1.5" />
      </div>
    </div>
  );
}

/* — data display ——————————————————————————————————————————————— */
function TableMock() {
  return (
    <div className="w-[230px] overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-3 gap-2 border-b border-border bg-muted/40 px-2.5 py-1.5">
        {["Name", "Status", "Role"].map((h) => (
          <span key={h} className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {h}
          </span>
        ))}
      </div>
      {[0, 1, 2].map((r) => (
        <div key={r} className="grid grid-cols-3 gap-2 border-b border-border/60 px-2.5 py-1.5 last:border-0">
          <Bar w="w-12" h="h-1.5" />
          <Bar w="w-8" h="h-1.5" />
          <Bar w="w-10" h="h-1.5" />
        </div>
      ))}
    </div>
  );
}

function ChartMock() {
  const bars = [40, 62, 30, 78, 52, 88, 46];
  return (
    <div className="flex h-[110px] w-[210px] items-end gap-1.5 rounded-lg border border-border bg-card p-3">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-t bg-primary/80"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function ImageMock() {
  return (
    <div className="relative h-[110px] w-[170px] overflow-hidden rounded-lg border border-border bg-gradient-to-br from-accent to-muted">
      <svg viewBox="0 0 170 110" className="absolute inset-0 h-full w-full text-muted-foreground/50">
        <circle cx="128" cy="30" r="12" className="fill-current" />
        <path d="M0 110 L52 54 L92 92 L124 62 L170 110 Z" className="fill-current opacity-70" />
      </svg>
    </div>
  );
}

function AspectRatioMock() {
  return (
    <div className="w-[190px]">
      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 font-mono text-[11px] text-muted-foreground">
        16 : 9
      </div>
    </div>
  );
}

function ScrollAreaMock() {
  return (
    <div className="flex w-[190px] gap-1.5 rounded-lg border border-border bg-card p-2.5">
      <div className="flex-1 space-y-1.5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bar key={i} w={i % 3 === 0 ? "w-full" : "w-4/5"} h="h-1.5" />
        ))}
      </div>
      <div className="w-1 rounded-full bg-muted">
        <div className="h-4 w-full rounded-full bg-muted-foreground/40" />
      </div>
    </div>
  );
}

function ResizableMock() {
  return (
    <div className="flex h-[92px] w-[210px] overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex-1 space-y-1.5 p-2.5">
        <Bar w="w-4/5" h="h-1.5" />
        <Bar w="w-3/5" h="h-1.5" />
      </div>
      <div className="flex w-2 items-center justify-center bg-border">
        <div className="h-6 w-0.5 rounded-full bg-muted-foreground/60" />
      </div>
      <div className="flex-1 space-y-1.5 p-2.5">
        <Bar w="w-3/4" h="h-1.5" />
        <Bar w="w-2/3" h="h-1.5" />
      </div>
    </div>
  );
}

function SeparatorMock() {
  return (
    <div className="w-[170px] space-y-2 text-[11px] text-muted-foreground">
      <p className="font-medium text-foreground">KinetixUI</p>
      <p>An open-source UI kit.</p>
      <div className="h-px bg-border" />
      <div className="flex gap-3">
        <span>Blog</span>
        <span>Docs</span>
        <span>Source</span>
      </div>
    </div>
  );
}

/* — registry ———————————————————————————————————————————————————— */
export const THUMBNAIL_MOCKS: Record<string, React.ComponentType> = {
  dialog: () => <DialogMock />,
  modal: () => <DialogMock />,
  "alert-dialog": () => <DialogMock danger />,
  sheet: () => <SheetMock side="right" />,
  drawer: () => <SheetMock side="bottom" />,
  "dropdown-menu": MenuMock,
  "context-menu": MenuMock,
  menubar: MenuMock,
  popover: () => <PopoverMock />,
  "hover-card": () => <PopoverMock />,
  tooltip: TooltipMock,
  command: CommandMock,
  combobox: CommandMock,
  breadcrumb: BreadcrumbMock,
  pagination: PaginationMock,
  "table-of-contents": TocMock,
  footer: FooterMock,
  table: TableMock,
  "data-table": TableMock,
  chart: ChartMock,
  image: ImageMock,
  "aspect-ratio": AspectRatioMock,
  "scroll-area": ScrollAreaMock,
  resizable: ResizableMock,
  separator: SeparatorMock,
};

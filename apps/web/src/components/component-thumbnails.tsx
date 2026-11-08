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
    className={`rounded-md px-2 py-0.5 text-label-md ${
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

/* — dialog family ———————————————————————————————————————————————
 *
 * Dialog, Modal and Alert Dialog differ in structure, not in wording, so the mocks differ the same way —
 * read off the three components (`packages/ui/src/components/{dialog,modal,alert-dialog}.tsx`):
 *
 *  - Dialog      a scrim and a free-form card with a close affordance in its corner.
 *  - Modal       header + close · divider · body · divider · right-aligned footer, on the wider xl corner.
 *  - AlertDialog no close affordance at all — it must be answered — and a destructive confirm.
 */

/** The dimmed page behind an overlay. A frame, not a component: it says "this one covers the page". */
const Scrim = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full w-full items-center justify-center rounded-md bg-muted/40 p-2">{children}</div>
);

/** The × of a close affordance, drawn rather than imported: a mock carries no icon semantics. */
const CloseGlyph = () => (
  <span aria-hidden className="relative block size-3 text-muted-foreground">
    <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 rotate-45 bg-current" />
    <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 -rotate-45 bg-current" />
  </span>
);

function DialogMock() {
  return (
    <Scrim>
      <Panel className="relative w-[216px]">
        <div className="absolute end-3 top-3">
          <CloseGlyph />
        </div>
        <p className="pe-5 text-body-md font-semibold text-foreground">Edit profile</p>
        <p className="mt-1.5 text-body-sm leading-snug text-muted-foreground">
          Changes are saved to your workspace straight away.
        </p>
        <div className="mt-3 flex justify-end gap-1.5">
          <Btn>Cancel</Btn>
          <Btn solid>Save</Btn>
        </div>
      </Panel>
    </Scrim>
  );
}

function ModalMock() {
  return (
    <Scrim>
      <div className="w-[224px] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <p className="text-body-md font-semibold text-foreground">Invite teammate</p>
          <CloseGlyph />
        </div>
        <div className="h-px w-full bg-border" />
        <p className="px-3 py-2.5 text-body-sm leading-snug text-muted-foreground">
          They will get editor access to this project.
        </p>
        <div className="h-px w-full bg-border" />
        <div className="flex justify-end gap-1.5 px-3 py-2">
          <Btn>Cancel</Btn>
          <Btn solid>Confirm</Btn>
        </div>
      </div>
    </Scrim>
  );
}

function AlertDialogMock() {
  return (
    <Scrim>
      {/* no close affordance: an alert dialog is answered by one of its two actions */}
      <Panel className="w-[216px]">
        <div className="flex items-start gap-2">
          <span
            aria-hidden
            className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-destructive/15 text-body-sm font-semibold text-destructive"
          >
            !
          </span>
          <div className="min-w-0">
            <p className="text-body-md font-semibold text-foreground">Delete 3 projects?</p>
            <p className="mt-1 text-body-sm leading-snug text-muted-foreground">
              This cannot be undone.
            </p>
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-1.5">
          <Btn>Cancel</Btn>
          <span className="rounded-md bg-destructive px-2 py-0.5 text-label-md text-destructive-foreground">
            Delete
          </span>
        </div>
      </Panel>
    </Scrim>
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

/* — menus ————————————————————————————————————————————————————————
 *
 * All three are the same Radix menu surface; what differs is where it comes from, so that is what the mocks
 * draw: a dropdown hangs off a button, a context menu opens at the pointer, a menubar belongs to a bar of
 * top-level menus.
 */
const MenuRow = ({
  children,
  active = false,
  shortcut,
}: {
  children: React.ReactNode;
  active?: boolean;
  shortcut?: string;
}) => (
  <div
    className={`flex items-center justify-between gap-3 rounded px-2 py-1 text-body-sm ${
      active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
    }`}
  >
    <span>{children}</span>
    {shortcut && (
      <span dir="ltr" className="font-mono text-label-sm tracking-tight text-muted-foreground">
        {shortcut}
      </span>
    )}
  </div>
);

function DropdownMenuMock() {
  return (
    <div className="flex w-[172px] flex-col items-start gap-1">
      {/* the trigger stays in the picture: a dropdown is anchored to the control that opened it */}
      <span className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-body-sm text-foreground">
        Account
        <span aria-hidden className="text-label-sm text-muted-foreground">
          ▾
        </span>
      </span>
      <Panel className="w-full p-1.5">
        <MenuRow active>Profile</MenuRow>
        <MenuRow shortcut="⌘,">Settings</MenuRow>
        <div className="my-1 h-px bg-border" />
        <MenuRow>Sign out</MenuRow>
      </Panel>
    </div>
  );
}

function ContextMenuMock() {
  return (
    <div className="relative w-[196px] rounded-md border border-dashed border-border bg-muted/25 p-2.5">
      {/* a context menu opens at the pointer, so the pointer is where the surface starts */}
      <span aria-hidden className="absolute start-2 top-2 text-body-sm text-foreground">
        ➤
      </span>
      <div className="ms-3 mt-2">
        <Panel className="w-full p-1.5">
          <MenuRow shortcut="⌘X">Cut</MenuRow>
          <MenuRow shortcut="⌘C">Copy</MenuRow>
          <MenuRow shortcut="⌘V">Paste</MenuRow>
        </Panel>
      </div>
    </div>
  );
}

function MenubarMock() {
  return (
    <div className="w-[196px]">
      <div className="flex items-center gap-1 rounded-md border border-border bg-card px-1.5 py-1 text-body-sm">
        <span className="rounded px-1.5 py-0.5 text-muted-foreground">File</span>
        <span className="rounded bg-accent px-1.5 py-0.5 text-accent-foreground">Edit</span>
        <span className="rounded px-1.5 py-0.5 text-muted-foreground">View</span>
      </div>
      <div className="ms-8 mt-1 w-[136px]">
        <Panel className="w-full p-1.5">
          <MenuRow shortcut="⌘Z">Undo</MenuRow>
          <MenuRow>Redo</MenuRow>
        </Panel>
      </div>
    </div>
  );
}

/* — floating cards —————————————————————————————————————————————
 *
 * Popover and Hover Card were one mock. They are not one component: a popover is opened by a click and
 * holds controls the reader operates; a hover card is opened by pointing at a reference and holds a
 * read-only preview of what the reference points to.
 */
function PopoverMock() {
  return (
    <div className="relative">
      <Panel className="w-[188px]">
        <p className="text-body-md font-semibold text-foreground">Dimensions</p>
        <div className="mt-2 space-y-1.5">
          {[
            ["Width", "1280"],
            ["Height", "720"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <span className="text-body-sm text-muted-foreground">{label}</span>
              {/* a field, drawn: the content of a popover is operated, not just read */}
              <span className="rounded border border-border bg-background px-1.5 py-0.5 font-mono text-label-md text-foreground">
                {value}
              </span>
            </div>
          ))}
        </div>
      </Panel>
      {/* the arrow points at a trigger on the inline-start side, so it follows the reading direction; the
          border pair is the rotated square's bottom and right edges, which rotate-45 turns into the point
          rtl-ok: physical on purpose — border-b/border-r name the square's own edges, not a reading side */}
      <div className="absolute start-6 top-full size-2 -translate-y-1/2 rotate-45 border-b border-r border-border bg-card" />
    </div>
  );
}

function HoverCardMock() {
  return (
    <div className="w-[196px] space-y-1.5">
      {/* the reference being pointed at — a hover card has no click target of its own */}
      <p className="text-body-sm text-muted-foreground">
        Reviewed by{" "}
        <span className="text-foreground underline decoration-dotted underline-offset-2">@avachen</span>
      </p>
      <Panel className="w-full">
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-label-md font-semibold text-accent-foreground"
          >
            AC
          </span>
          <div className="min-w-0">
            <p className="truncate text-body-md font-semibold text-foreground">Ava Chen</p>
            <p className="truncate text-body-sm text-muted-foreground">Design systems</p>
          </div>
        </div>
        <p className="mt-2 text-body-sm leading-snug text-muted-foreground">Joined 2021 · 48 reviews</p>
      </Panel>
    </div>
  );
}

function TooltipMock() {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="rounded-md bg-foreground px-2.5 py-1 text-label-md text-background shadow-lg">
        Add to library
      </span>
      <span className="size-2 -translate-y-1 rotate-45 bg-foreground" />
      {/* the trigger: a shape, not a word — "Hover" told the reader nothing the tooltip above does not */}
      <span className="mt-0.5 h-6 w-16 rounded-md border border-border" />
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
            className={`rounded px-2 py-1 text-body-sm ${
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
    <div className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
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
      {/* ‹ and › are bidi-mirrored characters: under dir="rtl" they draw pointing the other way on their own */}
      <span className="rounded border border-border px-1.5 py-1 text-body-sm text-muted-foreground">‹</span>
      {["1", "2", "3"].map((n) => (
        <span
          key={n}
          className={`rounded px-2 py-1 text-body-sm ${
            n === "2"
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground"
          }`}
        >
          {n}
        </span>
      ))}
      <span className="px-1 text-body-sm text-muted-foreground">…</span>
      <span className="rounded border border-border px-1.5 py-1 text-body-sm text-muted-foreground">›</span>
    </div>
  );
}

function TocMock() {
  return (
    <div className="space-y-1.5 border-s border-border ps-3 text-body-sm">
      <p className="font-medium text-primary">Overview</p>
      <p className="text-muted-foreground">Installation</p>
      <p className="ps-3 text-muted-foreground">CLI</p>
      <p className="text-muted-foreground">Usage</p>
    </div>
  );
}

function FooterMock() {
  // Spans, never anchors: this mock stands inside the gallery card's own <a>, and a nested anchor is the
  // hydration mismatch that put `footer` in NO_LIVE_THUMBNAIL in the first place (CAT-BUG-006).
  const columns: [string, string[]][] = [
    ["Product", ["Components", "Blocks"]],
    ["Docs", ["Install", "Tokens"]],
    ["Company", ["Blog", "Contact"]],
  ];
  return (
    <div className="w-[252px] space-y-2.5">
      <p className="text-body-md font-semibold text-foreground">KinetixUI</p>
      <div className="grid grid-cols-3 gap-2">
        {columns.map(([heading, links]) => (
          <div key={heading} className="space-y-1">
            <p className="whitespace-nowrap text-label-md font-semibold text-foreground">{heading}</p>
            {links.map((l) => (
              <p key={l} className="whitespace-nowrap text-label-md text-muted-foreground">
                {l}
              </p>
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border pt-1.5 text-label-md text-muted-foreground">
        <span>© 2026 KinetixUI</span>
        <span>Privacy</span>
      </div>
    </div>
  );
}

/* — data display ——————————————————————————————————————————————— */
function TableMock() {
  const rows: [string, string, string][] = [
    ["Ava Chen", "Active", "Admin"],
    ["Milo Park", "Invited", "Editor"],
    ["Dan Reed", "Active", "Viewer"],
  ];
  return (
    <div className="w-[232px] overflow-hidden rounded-lg border border-border">
      <div className="grid grid-cols-3 gap-2 border-b border-border bg-muted/40 px-2.5 py-1.5">
        {["Name", "Status", "Role"].map((h) => (
          <span key={h} className="text-label-md uppercase tracking-wide text-muted-foreground">
            {h}
          </span>
        ))}
      </div>
      {rows.map(([name, status, role]) => (
        <div
          key={name}
          className="grid grid-cols-3 gap-2 border-b border-border/60 px-2.5 py-1.5 text-body-sm last:border-0"
        >
          <span className="truncate text-foreground">{name}</span>
          <span className="truncate text-muted-foreground">{status}</span>
          <span className="truncate text-muted-foreground">{role}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Data Table shared Table's mock, so two different components were one picture (CAT-BUG-007). What the
 * component adds over a plain table is what the mock now shows: a sorted column, row selection and a
 * pagination row.
 */
function DataTableMock() {
  const rows: [string, string, boolean][] = [
    ["Ava Chen", "$1,240", true],
    ["Milo Park", "$980", false],
    ["Dan Reed", "$420", false],
  ];
  // The tick is drawn, not typed: a glyph small enough to fit this box renders at 7px, under the
  // legibility floor the gallery is being held to (CAT-BUG-004).
  const Check = ({ on }: { on: boolean }) => (
    <span
      aria-hidden
      className={`relative grid size-3 shrink-0 place-items-center rounded-[3px] border ${
        on ? "border-primary bg-primary" : "border-muted-foreground/50"
      }`}
    >
      {on && (
        <span className="mt-[-1px] block size-1.5 rotate-45 border-b-2 border-e-2 border-primary-foreground" />
      )}
    </span>
  );
  return (
    <div className="w-[236px] overflow-hidden rounded-lg border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-2.5 py-1.5 text-label-md uppercase tracking-wide text-muted-foreground">
        <Check on={false} />
        <span className="flex flex-1 items-center gap-1 text-foreground">
          Name
          {/* the sorted column, which a plain Table has no notion of */}
          <span aria-hidden className="text-label-sm">
            ↑
          </span>
        </span>
        <span>Amount</span>
      </div>
      {rows.map(([name, amount, selected]) => (
        <div
          key={name}
          className={`flex items-center gap-2 border-b border-border/60 px-2.5 py-1.5 text-body-sm ${
            selected ? "bg-accent/40" : ""
          }`}
        >
          <Check on={selected} />
          <span className="flex-1 truncate text-foreground">{name}</span>
          <span dir="ltr" className="font-mono text-label-md text-muted-foreground">
            {amount}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2 bg-muted/20 px-2.5 py-1.5 text-label-md text-muted-foreground">
        <span>1 selected of 24</span>
        {/* ‹ and › are bidi-mirrored characters: under dir="rtl" they draw pointing the other way on their own */}
        <span className="flex items-center gap-1">
          <span>‹</span>
          <span className="text-foreground">1</span>
          <span>›</span>
        </span>
      </div>
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
      <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-border bg-muted/40 font-mono text-body-sm text-muted-foreground">
        {/* a ratio is read width-first in every script: without dir="ltr" an RTL page reorders it to "9 : 16" */}
        <span dir="ltr">16 : 9</span>
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

/**
 * PageHeader's live demo renders the component's real `<h1>`, and an inert, aria-hidden subtree is still DOM:
 * the gallery page carried a second `h1` that any heading-structure check counts. The mock draws the same
 * shape — breadcrumb, title, description, actions — with no heading element in it.
 */
function PageHeaderMock() {
  // The breadcrumb is drawn as bars rather than words: at thumbnail scale it is the row's position, not its
  // text, that says "page header", and three 10px words in 200px were the smallest text on the gallery.
  return (
    <div className="w-[210px] space-y-2 border-b border-border pb-2.5">
      <div className="flex items-center gap-1.5">
        <Bar w="w-10" h="h-1.5" />
        <span className="text-body-sm text-muted-foreground/60">/</span>
        <Bar w="w-12" h="h-1.5" />
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-title-sm text-foreground">KinetixUI</p>
          <Bar w="w-20" h="h-1.5" />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="size-6 rounded-md border border-border" />
          <Btn solid>Deploy</Btn>
        </div>
      </div>
    </div>
  );
}

function SeparatorMock() {
  return (
    <div className="w-[190px] space-y-2 text-body-sm text-muted-foreground">
      <p className="font-medium text-foreground">KinetixUI</p>
      <p>Cross-platform design system</p>
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
  dialog: DialogMock,
  modal: ModalMock,
  "alert-dialog": AlertDialogMock,
  sheet: () => <SheetMock side="right" />,
  drawer: () => <SheetMock side="bottom" />,
  "dropdown-menu": DropdownMenuMock,
  "context-menu": ContextMenuMock,
  menubar: MenubarMock,
  popover: PopoverMock,
  "hover-card": HoverCardMock,
  tooltip: TooltipMock,
  command: CommandMock,
  combobox: CommandMock,
  breadcrumb: BreadcrumbMock,
  pagination: PaginationMock,
  "table-of-contents": TocMock,
  footer: FooterMock,
  table: TableMock,
  "data-table": DataTableMock,
  chart: ChartMock,
  image: ImageMock,
  "aspect-ratio": AspectRatioMock,
  "scroll-area": ScrollAreaMock,
  resizable: ResizableMock,
  separator: SeparatorMock,
  "page-header": PageHeaderMock,
};

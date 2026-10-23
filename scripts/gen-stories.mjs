/**
 * gen-stories.mjs — generate one Storybook story per component from the
 * canonical demo registry (apps/web/src/registry/demos.tsx).
 *
 *   node scripts/gen-stories.mjs
 *   node scripts/gen-stories.mjs --check   fail if a story is missing, stale or orphaned (CI)
 *
 * Output: packages/ui/src/stories/<Pascal>.stories.tsx (one per `*-demo` entry).
 * Button / Input / Textarea keep their hand-written stories and are skipped.
 *
 * The story set is not decoration. Two suites take their SUBJECTS from this
 * directory — the jsdom axe pass and the real-browser axe pass — so a component
 * with no story is a component nothing checks for accessibility, silently.
 * That is exactly what happened to `direction-provider`: it had no docs page,
 * so it had no demo, so it had no story, so axe never saw it, and the site
 * still reported accessibility coverage as though it had.
 *
 * `--check` closes that. It fails when a story is missing, when a generated one
 * has drifted from what the generator would write, when one is orphaned, and —
 * the part that matters most — when a component in the manifest has no story at
 * all. The expected set is DERIVED from the manifest, never a list kept here.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEMOS = `${ROOT}/apps/web/src/registry/demos.tsx`;
const OUT = `${ROOT}/packages/ui/src/stories`;
const CHECK = process.argv.includes("--check");

const manifest = JSON.parse(readFileSync(`${ROOT}/components.manifest.json`, "utf8"));

/** "AlertDialog.stories.tsx" → "alert-dialog". */
const slugOf = (file) =>
  file
    .replace(/\.stories\.tsx$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();

const HANDWRITTEN = new Set(["button", "input", "textarea"]);

/**
 * Components that intentionally have no Storybook story, with the reason.
 *
 * Empty, and it should stay that way. An entry here removes a component from
 * the accessibility suites' subject list, so adding one is a decision about
 * coverage, not a convenience for making this check pass.
 */
const NO_STORY = {};

/**
 * slug → Storybook group title, generated from `components.manifest.json` (`pnpm gen:manifest`).
 *
 * This was a 107-entry hand-written map, and `apps/web/src/lib/site.ts` had a 109-entry one. They had
 * drifted on `app-bar` and `direction-provider`, which fell through to the "Components" group here while the
 * website filed them under Navigation and Foundations (CAT-BUG-019). Both read the same generated file now,
 * and an unknown slug is a problem rather than a default group.
 */
const TAXONOMY = JSON.parse(readFileSync(`${ROOT}/component-taxonomy.json`, "utf8"));
const GROUP = Object.fromEntries(
  Object.entries(TAXONOMY.components).map(([slug, e]) => [slug, e.category]),
);

const PADDED = new Set([
  "chart", "data-table", "data-grid", "kanban-board", "markdown-editor", "table", "footer", "calendar", "resizable", "carousel",
  "sidebar", "stepper", "menubar", "navigation-menu",
  // `layout: "centered"` sizes the wrapper to its content, so a demo whose width is a percentage of that
  // wrapper resolves to nothing. Measured in Chromium: the Slider story's track was 0x6 and only its 16px
  // thumb was visible, which is also all the axe pass and the large-text pass had ever been looking at.
  // Both of these demos are `w-[60%]`, which is right on the website, where the column has a width.
  "slider", "progress",
  // The Tabs `States` story is `max-w-full`, which only means something inside a wrapper with a width: the
  // large-text pass measures it at 390px with 2x text, where a tab strip that cannot wrap overflows the page.
  "tabs",
  // InputGroup's demo is `w-full max-w-sm`, a width that only means something inside a wrapper with one. In a
  // centered (shrink-to-fit) story the column sized itself to the input's intrinsic width instead — 212px
  // wider than a 390px viewport at 2x text, measured by the large-text pass in Visual Slice 4 — which is a
  // property of the story frame, not of a form column on a page.
  "input-group",
  // The transactional foundations are `w-full` with a max width — a column on a page, not a shrink-wrapped
  // control — and the large-text pass measures them at 390px, where only a frame with a width is honest.
  "result-state", "price-breakdown", "pass-card", "reference-code",
  // The Phase 2 fields are form columns (`w-full` with a max width) for the same reason; GuestPicker,
  // CountrySelect and DateRangeInput also open a popover the width of their trigger.
  "guest-picker", "country-select", "phone-input", "date-range-input", "time-slot-picker", "address-fields",
]);

/**
 * Components with a single primary export and variant-style props get an
 * interactive `Playground` story with controls, alongside the canonical `Default`
 * demo. `comp` is the export used for `component:`; `imports` names any extra
 * identifiers the render needs. Options mirror the CVA variants in the source.
 */
const CONTROLS = {
  badge: {
    comp: "Badge",
    args: `{ variant: "default", children: "Badge" }`,
    argTypes: `{
    variant: { control: "select", options: ["default", "secondary", "destructive", "outline", "subtle"] },
    children: { control: "text" },
  }`,
    render: `(args) => <Badge {...args} />`,
  },
  alert: {
    comp: "Alert",
    imports: "AlertTitle AlertDescription",
    args: `{ variant: "default" }`,
    argTypes: `{
    variant: { control: "inline-radio", options: ["default", "destructive", "success", "warning", "info"] },
  }`,
    render: `(args) => (
    <Alert {...args} className="max-w-md">
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
    </Alert>
  )`,
  },
  spinner: {
    comp: "Spinner",
    args: `{ size: "md", variant: "default" }`,
    argTypes: `{
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    variant: { control: "inline-radio", options: ["default", "muted", "onColor"] },
  }`,
    render: `(args) => <Spinner {...args} />`,
  },
  fab: {
    comp: "Fab",
    imports: "Plus",
    args: `{ variant: "Primary", size: "default", extended: false }`,
    argTypes: `{
    variant: { control: "inline-radio", options: ["Primary", "Secondary"] },
    size: { control: "inline-radio", options: ["default", "sm"] },
    extended: { control: "boolean" },
  }`,
    render: `(args) => (
    <Fab {...args} aria-label="Add">
      <Plus />
      {args.extended ? "New item" : null}
    </Fab>
  )`,
  },
  inform: {
    comp: "Inform",
    args: `{ variant: "information" }`,
    argTypes: `{
    variant: { control: "inline-radio", options: ["information", "warning", "success", "error"] },
  }`,
    render: `(args) => (
    <Inform {...args} className="max-w-md">A new software update is available.</Inform>
  )`,
  },
  tag: {
    comp: "Tag",
    args: `{ variant: "default", children: "tag" }`,
    argTypes: `{
    variant: { control: "select", options: ["default", "secondary", "destructive", "warning", "outline"] },
    children: { control: "text" },
  }`,
    render: `(args) => <Tag {...args} />`,
  },
  toggle: {
    comp: "Toggle",
    imports: "Italic",
    args: `{ variant: "default", size: "default" }`,
    argTypes: `{
    variant: { control: "inline-radio", options: ["default", "outline", "pill"] },
    size: { control: "inline-radio", options: ["default", "sm", "lg"] },
  }`,
    render: `(args) => (
    <Toggle {...args} aria-label="Toggle italic"><Italic className="size-4" /></Toggle>
  )`,
  },
  rating: {
    comp: "Rating",
    args: `{ size: "md", readOnly: false, defaultValue: 3 }`,
    argTypes: `{
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
    readOnly: { control: "boolean" },
  }`,
    render: `(args) => <Rating {...args} />`,
  },
  "circular-progress": {
    comp: "CircularProgress",
    args: `{ value: 66, size: 48, strokeWidth: 4, showValue: true }`,
    argTypes: `{
    value: { control: { type: "range", min: 0, max: 100 } },
    size: { control: { type: "range", min: 24, max: 120 } },
    strokeWidth: { control: { type: "range", min: 2, max: 12 } },
    showValue: { control: "boolean" },
  }`,
    render: `(args) => <CircularProgress aria-label="Upload progress" {...args} />`,
  },
  progress: {
    comp: "Progress",
    args: `{ value: 66 }`,
    argTypes: `{ value: { control: { type: "range", min: 0, max: 100 } } }`,
    render: `(args) => <Progress aria-label="Upload progress" {...args} className="w-60" />`,
  },
  slider: {
    comp: "Slider",
    args: `{ disabled: false }`,
    argTypes: `{ disabled: { control: "boolean" } }`,
    render: `(args) => <Slider aria-label="Volume" {...args} defaultValue={[50]} max={100} step={1} className="w-60" />`,
  },
  separator: {
    comp: "Separator",
    args: `{ orientation: "horizontal" }`,
    argTypes: `{ orientation: { control: "inline-radio", options: ["horizontal", "vertical"] } }`,
    render: `(args) => (
    <div className="flex h-16 w-48 items-center justify-center">
      <Separator {...args} />
    </div>
  )`,
  },
  switch: {
    comp: "Switch",
    args: `{ disabled: false, defaultChecked: false }`,
    argTypes: `{ disabled: { control: "boolean" }, defaultChecked: { control: "boolean" } }`,
    render: `(args) => <Switch aria-label="Airplane mode" {...args} />`,
  },
  checkbox: {
    comp: "Checkbox",
    args: `{ disabled: false, defaultChecked: false }`,
    argTypes: `{ disabled: { control: "boolean" }, defaultChecked: { control: "boolean" } }`,
    render: `(args) => <Checkbox aria-label="Accept terms" {...args} />`,
  },
  "number-input": {
    comp: "NumberInput",
    args: `{ defaultValue: 2, min: 0, max: 10, step: 1 }`,
    argTypes: `{
    min: { control: "number" }, max: { control: "number" }, step: { control: "number" },
  }`,
    render: `(args) => <NumberInput aria-label="Quantity" {...args} className="w-32" />`,
  },
  metric: {
    comp: "Metric",
    args: `{ label: "Active users", value: "2,420", trend: "up", change: "12%" }`,
    argTypes: `{
    trend: { control: "inline-radio", options: ["up", "down", "neutral"] },
    label: { control: "text" }, value: { control: "text" }, change: { control: "text" },
  }`,
    render: `(args) => <Metric {...args} />`,
  },
  image: {
    comp: "Image",
    args: `{ ratio: "4:3", rounded: true }`,
    argTypes: `{
    ratio: { control: "inline-radio", options: ["1:1", "4:3", "3:4", "16:9"] },
    rounded: { control: "boolean" },
  }`,
    render: `(args) => (
    <Image {...args} src="https://picsum.photos/seed/kx/400/300" alt="" className="w-56" />
  )`,
  },
  "aspect-ratio": {
    comp: "AspectRatio",
    args: `{ ratio: 1.7778 }`,
    argTypes: `{ ratio: { control: { type: "number", step: 0.05 } } }`,
    render: `(args) => (
    <div className="w-64">
      <AspectRatio {...args} className="rounded-md bg-muted" />
    </div>
  )`,
  },
  accordion: {
    comp: "Accordion",
    args: `{ type: "single", collapsible: true }`,
    argTypes: `{
    type: { control: "inline-radio", options: ["single", "multiple"] },
    collapsible: { control: "boolean" },
  }`,
    render: `(args) => (
    <Accordion {...args} className="w-full max-w-md">
      <AccordionItem value="a">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>Yes. It follows the WAI-ARIA design pattern.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Is it themed?</AccordionTrigger>
        <AccordionContent>Yes — entirely from the KinetixUI token contract.</AccordionContent>
      </AccordionItem>
    </Accordion>
  )`,
  },
  tabs: {
    comp: "Tabs",
    args: `{ defaultValue: "account" }`,
    argTypes: `{ defaultValue: { control: "inline-radio", options: ["account", "password"] } }`,
    render: `(args) => (
    <Tabs {...args} className="w-[360px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>
      <TabsContent value="account" className="text-sm text-muted-foreground">
        Make changes to your account here.
      </TabsContent>
      <TabsContent value="password" className="text-sm text-muted-foreground">
        Change your password here.
      </TabsContent>
    </Tabs>
  )`,
  },
  "toggle-group": {
    comp: "ToggleGroup",
    args: `{ type: "multiple" }`,
    argTypes: `{ type: { control: "inline-radio", options: ["single", "multiple"] } }`,
    render: `(args) => (
    <ToggleGroup {...args}>
      <ToggleGroupItem value="bold" aria-label="Bold"><Bold className="size-4" /></ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic"><Italic className="size-4" /></ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline"><Underline className="size-4" /></ToggleGroupItem>
    </ToggleGroup>
  )`,
  },
  "radio-group": {
    comp: "RadioGroup",
    args: `{ defaultValue: "comfortable", disabled: false }`,
    argTypes: `{
    defaultValue: { control: "inline-radio", options: ["default", "comfortable", "compact"] },
    disabled: { control: "boolean" },
  }`,
    render: `(args) => (
    <RadioGroup {...args}>
      {["default", "comfortable", "compact"].map((v) => (
        <div key={v} className="flex items-center gap-2">
          <RadioGroupItem value={v} id={v} />
          <Label htmlFor={v} className="capitalize">{v}</Label>
        </div>
      ))}
    </RadioGroup>
  )`,
  },
  collapsible: {
    comp: "Collapsible",
    args: `{ defaultOpen: false, disabled: false }`,
    argTypes: `{ defaultOpen: { control: "boolean" }, disabled: { control: "boolean" } }`,
    render: `(args) => (
    <Collapsible {...args} className="w-full max-w-md space-y-2">
      <div className="flex items-center justify-between rounded-md border px-4 py-2 text-sm">
        @kinetixui starred 3 repositories
        <CollapsibleTrigger asChild>
          <Button variant="Ghost" size="sm">Toggle</Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2">
        <div className="rounded-md border px-4 py-2 text-sm">@radix-ui/primitives</div>
        <div className="rounded-md border px-4 py-2 text-sm">@stitches/react</div>
      </CollapsibleContent>
    </Collapsible>
  )`,
  },
  popover: {
    comp: "Popover",
    args: `{ side: "bottom", align: "center" }`,
    argTypes: `{
    side: { control: "inline-radio", options: ["top", "right", "bottom", "left"] },
    align: { control: "inline-radio", options: ["start", "center", "end"] },
  }`,
    render: `(args) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="Outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent {...args}>
        <p className="text-sm font-medium">Dimensions</p>
        <p className="mt-1 text-sm text-muted-foreground">Set the dimensions for the layer.</p>
      </PopoverContent>
    </Popover>
  )`,
  },
  "hover-card": {
    comp: "HoverCard",
    args: `{ openDelay: 200, closeDelay: 200 }`,
    argTypes: `{
    openDelay: { control: { type: "number", step: 100 } },
    closeDelay: { control: { type: "number", step: 100 } },
  }`,
    render: `(args) => (
    <HoverCard {...args}>
      <HoverCardTrigger asChild>
        <Button variant="Link">@kinetixui</Button>
      </HoverCardTrigger>
      <HoverCardContent>One token architecture, in motion across every platform.</HoverCardContent>
    </HoverCard>
  )`,
  },
  tooltip: {
    comp: "Tooltip",
    args: `{ delayDuration: 200 }`,
    argTypes: `{ delayDuration: { control: { type: "number", step: 100 } } }`,
    render: `(args) => (
    <TooltipProvider>
      <Tooltip {...args}>
        <TooltipTrigger asChild>
          <Button variant="Outline">Hover</Button>
        </TooltipTrigger>
        <TooltipContent>Add to library</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )`,
  },
  select: {
    comp: "Select",
    args: `{ disabled: false }`,
    argTypes: `{ disabled: { control: "boolean" } }`,
    render: `(args) => (
    <Select {...args}>
      <SelectTrigger className="w-[220px]" aria-label="Fruit">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="blueberry">Blueberry</SelectItem>
      </SelectContent>
    </Select>
  )`,
  },
};

/**
 * Extra story exports, beyond the canonical `Default` demo and the `Playground`.
 *
 * A demo's job is to show a component at rest, in the shape a reader is most likely to want. Some
 * component behaviour only exists in a state a tidy demo never reaches — and because both axe passes
 * take their subjects from this directory, behaviour with no story is behaviour nothing checks.
 *
 * An entry is a judgement that the state is one real consumers produce, not a prop combination
 * assembled to make a rule fire. `imports` names identifiers the render needs beyond the demo's own.
 */
const EXTRA = {
  // Business capability roadmap, Phase 2: every timeline status (and the alternating layout, which is where
  // text alignment has to mirror), so both axe passes and the large-text pass see the status markers.
  timeline: [{ name: "Statuses", render: `() => (
    <div className="grid w-full max-w-3xl gap-10 md:grid-cols-2">
      <Timeline
        aria-label="Refund history"
        items={[
          { time: "2 Mar", title: "Refund requested", status: "complete" },
          { time: "3 Mar", title: "Bank details needed", content: "Add an IBAN to receive the refund.", status: "warning", action: <Button size="sm" variant="Outline">Add bank details</Button> },
          { time: "4 Mar", title: "Card refund failed", content: "The card was closed.", status: "error" },
          { title: "Note added by support", status: "neutral" },
          { title: "Refund sent", status: "pending" },
        ]}
      />
      <Timeline
        alternating
        aria-label="Shipment"
        items={[
          { time: "12 Mar", title: "Packed", status: "complete" },
          { time: "13 Mar", title: "In transit", content: "Riyadh hub", status: "current" },
          { title: "Delivered", status: "pending" },
        ]}
      />
    </div>
  )`, imports: "Button" }],
  "time-slot-picker": [{ name: "FullyBooked", render: `() => (
    <TimeSlotPicker
      className="w-full max-w-md"
      label="Pickup time"
      emptyMessage="No pickup times are left today. Try tomorrow."
      groups={[{ slots: [{ value: "09:00", label: "09:00", unavailable: true }, { value: "09:30", label: "09:30", unavailable: true }] }]}
    />
  )` }],
  // Business capability roadmap, Phase 1: every status, composition and state the single demo does not
  // reach, so both axe passes (light and dark) and the large-text pass see them.
  "result-state": [{ name: "Statuses", render: `() => (
    <div className="grid w-full max-w-3xl gap-x-8 gap-y-10 sm:grid-cols-2">
      <ResultState align="start" headingLevel={3} status="success" title="Booking confirmed" description="Two nights from 14 March. We've sent the details to your email." />
      <ResultState align="start" headingLevel={3} status="error" title="Payment declined" description="Your bank declined the charge. Nothing was taken from your account." primaryAction={<Button size="sm">Try another card</Button>} />
      <ResultState align="start" headingLevel={3} status="warning" title="Application submitted with a gap" description="We received it, but the proof of address is missing. Add it within 7 days." primaryAction={<Button size="sm" variant="Outline">Add document</Button>} />
      <ResultState align="start" headingLevel={3} status="pending" title="Transfer processing" description="Transfers usually arrive within one business day. You can leave this page." />
      <ResultState align="start" headingLevel={3} status="info" title="Request received" description="A specialist will review it and reply by Thursday." />
      <ResultState align="start" headingLevel={3} status="partial" title="3 of 4 refunds issued" description="One refund needs your bank details before we can send it." primaryAction={<Button size="sm" variant="Outline">Review refunds</Button>} />
    </div>
  )` }],
  "price-breakdown": [{ name: "TransferAndLoading", render: `() => (
    <div className="grid w-full max-w-2xl gap-10 sm:grid-cols-2">
      <PriceBreakdown aria-label="Transfer summary">
        <PriceBreakdownLine label="You send" value="1,000.00 USD" />
        <PriceBreakdownLine label="Transfer fee" value="−4.20 USD" kind="deduction" />
        <PriceBreakdownLine label="Exchange rate" description="Guaranteed for 24 hours" value="1 USD = 0.9213 EUR" />
        <PriceBreakdownTotal label="They receive" value="917.43 EUR" />
      </PriceBreakdown>
      {/* While a quote is recalculated: aria-busy on the list, and placeholders the same shape as the amounts. */}
      <PriceBreakdown aria-label="Quote" aria-busy="true">
        <PriceBreakdownLine label="2 nights" value={<Skeleton className="h-4 w-16" />} />
        <PriceBreakdownLine label="Cleaning fee" value={<Skeleton className="h-4 w-12" />} />
        <PriceBreakdownLine label="Taxes" value={<Skeleton className="h-4 w-12" />} />
        <PriceBreakdownTotal label="Total" value={<Skeleton className="h-6 w-20" />} />
      </PriceBreakdown>
    </div>
  )`, imports: "Skeleton" }],
  "pass-card": [{ name: "Compositions", render: `() => (
    <div className="grid w-full max-w-4xl items-start gap-6 md:grid-cols-3">
      <PassCard>
        <PassCardHeader>
          <div className="flex min-w-0 flex-col gap-1">
            <PassCardTitle>Northern Lights Live</PassCardTitle>
            <PassCardDescription>Harbour Arena · General admission</PassCardDescription>
          </div>
        </PassCardHeader>
        <PassCardFields>
          <PassCardField label="Doors">
            <time dateTime="2026-05-02T19:00">2 May, 19:00</time>
          </PassCardField>
          <PassCardField label="Entrance" emphasis>C</PassCardField>
        </PassCardFields>
        <PassCardDivider />
        <PassCardCode label="Ticket QR code" value="0742 1189 2201">
          <QR_DEMO size={112} />
        </PassCardCode>
      </PassCard>
      <PassCard>
        <PassCardHeader>
          <div className="flex min-w-0 flex-col gap-1">
            <PassCardTitle>Parking permit</PassCardTitle>
            <PassCardDescription>Riverside Garage, level 2</PassCardDescription>
          </div>
          <Tag>Active</Tag>
        </PassCardHeader>
        <PassCardFields>
          <PassCardField label="Plate" emphasis>KX 24 RTL</PassCardField>
          <PassCardField label="Bay" emphasis>2-117</PassCardField>
          <PassCardField label="Valid until">
            <time dateTime="2026-12-31">31 Dec 2026</time>
          </PassCardField>
        </PassCardFields>
        <PassCardFooter>Show this permit if asked. It is not transferable.</PassCardFooter>
      </PassCard>
      <PassCard>
        <PassCardHeader>
          <div className="flex min-w-0 flex-col gap-1">
            <PassCardTitle>€25 gift voucher</PassCardTitle>
            <PassCardDescription>Studio Kinetix</PassCardDescription>
          </div>
          <Tag variant="outline">Used</Tag>
        </PassCardHeader>
        <PassCardFields>
          <PassCardField label="Redeemed">
            <time dateTime="2026-02-11">11 Feb 2026</time>
          </PassCardField>
          <PassCardField label="Balance">€0.00</PassCardField>
        </PassCardFields>
        <PassCardDivider />
        <PassCardCode label="Voucher code" value="GIFT-7KQ2-XP19">
          <QR_DEMO size={96} />
        </PassCardCode>
      </PassCard>
    </div>
  )`, imports: "Tag" }],
  // The surface model (TOKENS.md) in the three places a card actually lives, so both axe passes and
  // `check:card-visual` see the states a tidy single-card demo never reaches.
  card: [
    {
      name: "Grouped",
      // Cards on a grouped section — a settings page's region. This is the arrangement that inverted in dark
      // mode while the group was `bg-muted`, which is lighter than `card` there.
      render: `() => (
    <section aria-labelledby="card-grouped-heading" className="w-[36rem] max-w-full rounded-xl bg-surface-grouped p-4 sm:p-6">
      <h2 id="card-grouped-heading" className="mb-4 text-title-md text-foreground">Workspace settings</h2>
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Choose what reaches your inbox.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="card-grouped-digest">Weekly digest</Label>
              <Switch id="card-grouped-digest" defaultChecked />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Danger zone</CardTitle>
            <CardDescription>Archiving hides the workspace from every member.</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="Outline" size="sm">Archive workspace</Button>
          </CardFooter>
        </Card>
      </div>
    </section>
  )`,
      imports: "Label Switch",
    },
    {
      name: "Dense",
      // A dashboard's KPI row: small padding, numbers first, three abreast on a page.
      render: `() => (
    <div className="grid w-[40rem] max-w-full gap-3 sm:grid-cols-3">
      {[
        ["Revenue", "$45,231", "+12.5% this month"],
        ["Active users", "2,420", "+8.1% this month"],
        ["Churn", "1.2%", "−0.3% this month"],
      ].map(([label, value, change]) => (
        <Card key={label}>
          <CardContent className="flex flex-col gap-1 p-4">
            <span className="text-body-sm text-muted-foreground">{label}</span>
            <span className="text-headline-sm font-medium tabular-nums">{value}</span>
            <span className="text-body-sm text-muted-foreground">{change}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )`,
    },
    {
      name: "Interactive",
      // The opt-in contract: the element is the action. Links are navigation (one is the current page), the
      // buttons are toggles. A <button> may only hold phrasing content, so its card uses spans, not CardHeader.
      render: `() => (
    <div className="grid w-[40rem] max-w-full gap-4 sm:grid-cols-2">
      <Card asChild>
        <a href="#reports-q3">
          <CardHeader>
            <CardTitle>Q3 report</CardTitle>
            <CardDescription>Revenue, churn and cohort retention.</CardDescription>
          </CardHeader>
        </a>
      </Card>
      <Card asChild>
        <a href="#reports-q4" aria-current="page">
          <CardHeader>
            <CardTitle>Q4 report</CardTitle>
            <CardDescription>The report you are viewing.</CardDescription>
          </CardHeader>
        </a>
      </Card>
      <Card asChild>
        <button type="button" aria-pressed="true" className="p-6">
          <span className="block font-semibold leading-none tracking-tight">Daily backups</span>
          <span className="mt-1.5 block text-sm text-muted-foreground">Included in this plan.</span>
        </button>
      </Card>
      <Card asChild>
        <button type="button" aria-pressed="false" className="p-6">
          <span className="block font-semibold leading-none tracking-tight">Audit log</span>
          <span className="mt-1.5 block text-sm text-muted-foreground">Add to this plan.</span>
        </button>
      </Card>
    </div>
  )`,
    },
  ],
  // The selection-control state contract (TOKENS.md, "Selection controls"). Each control's demo shows one
  // resting value; these show every value and condition a real form produces side by side — unchecked,
  // checked, mixed, invalid (a required consent the user skipped), disabled — so both axe passes and
  // `check:selection-visual` measure them, and in a raised Card, which is where a settings form puts them.
  checkbox: [
    {
      name: "States",
      imports: "Card CardContent Label",
      render: `() => (
    <Card className="w-[22rem] max-w-full">
      <CardContent className="grid gap-4 p-6">
        {([
          ["unchecked", "Email me about product updates", {}],
          ["checked", "Email me about security alerts", { defaultChecked: true }],
          ["mixed", "Select all regions", { checked: "indeterminate" }],
          ["invalid", "I accept the terms of service", { "aria-invalid": true, "aria-describedby": "cb-terms-error" }],
          ["invalid-checked", "I accept the data processing terms", { "aria-invalid": true, defaultChecked: true }],
          ["disabled", "Archive automatically (admins only)", { disabled: true }],
          ["disabled-checked", "Keep an audit log (always on)", { disabled: true, defaultChecked: true }],
        ] as const).map(([key, label, props]) => (
          <div key={key} className="flex items-center gap-3">
            <Checkbox id={\`cb-\${key}\`} data-kx-case={key} {...props} />
            <Label htmlFor={\`cb-\${key}\`}>{label}</Label>
          </div>
        ))}
        <p id="cb-terms-error" className="text-body-sm text-destructive">Accept the terms to continue.</p>
      </CardContent>
    </Card>
  )`,
    },
    {
      // MX1b-1b, selection motion: a box at rest off and on, the uncontrolled mixed box whose glyph was drawn as
      // a tick, a box whose owner moves it through every state (each \`data-kx-action\` sets one), and a box in
      // a right-to-left row. \`check:motion\` and \`check:checkbox-radio-motion\` drive these.
      name: "Motion",
      imports: "Button KinetixDirectionProvider Label",
      render: `() => {
    const [owned, setOwned] = React.useState<boolean | "indeterminate">(false);
    return (
      <div className="grid gap-4">
        {([
          ["off", "Email me about product updates", {}],
          ["on", "Email me about security alerts", { defaultChecked: true }],
          ["mixed-uncontrolled", "Select all regions", { defaultChecked: "indeterminate" }],
        ] as const).map(([key, label, props]) => (
          <div key={key} className="flex items-center gap-3">
            <Checkbox id={\`cbm-\${key}\`} data-kx-case={key} {...props} />
            <Label htmlFor={\`cbm-\${key}\`}>{label}</Label>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <Checkbox id="cbm-owned" data-kx-case="owned" checked={owned} onCheckedChange={setOwned} />
          <Label htmlFor="cbm-owned">All files</Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="Outline" data-kx-action="checked" onClick={() => setOwned(true)}>Select all</Button>
          <Button size="sm" variant="Outline" data-kx-action="indeterminate" onClick={() => setOwned("indeterminate")}>Select some</Button>
          <Button size="sm" variant="Outline" data-kx-action="unchecked" onClick={() => setOwned(false)}>Select none</Button>
        </div>
        <KinetixDirectionProvider dir="rtl">
          <div dir="rtl" lang="ar" className="flex items-center gap-3">
            <Checkbox id="cbm-rtl" data-kx-case="rtl" />
            <Label htmlFor="cbm-rtl">أرسل لي التحديثات</Label>
          </div>
        </KinetixDirectionProvider>
      </div>
    );
  }`,
    },
  ],
  "radio-group": [
    {
      name: "States",
      imports: "Card CardContent Label",
      render: `() => (
    <Card className="w-[22rem] max-w-full">
      <CardContent className="grid gap-6 p-6">
        <RadioGroup defaultValue="weekly" aria-label="Digest frequency">
          {([["daily", "Daily"], ["weekly", "Weekly"], ["never", "Never"]] as const).map(([v, label]) => (
            <div key={v} className="flex items-center gap-3">
              <RadioGroupItem value={v} id={\`rg-\${v}\`} data-kx-case={v === "weekly" ? "checked" : v === "daily" ? "unchecked" : undefined} />
              <Label htmlFor={\`rg-\${v}\`}>{label}</Label>
            </div>
          ))}
        </RadioGroup>
        <RadioGroup aria-label="Billing plan" aria-describedby="rg-plan-error">
          {([["starter", "Starter"], ["team", "Team"]] as const).map(([v, label]) => (
            <div key={v} className="flex items-center gap-3">
              <RadioGroupItem value={v} id={\`rg-\${v}\`} aria-invalid data-kx-case={v === "starter" ? "invalid" : undefined} />
              <Label htmlFor={\`rg-\${v}\`}>{label}</Label>
            </div>
          ))}
          <p id="rg-plan-error" className="text-body-sm text-destructive">Choose a plan to continue.</p>
        </RadioGroup>
        <RadioGroup defaultValue="eu" disabled aria-label="Data region (locked)">
          {([["eu", "EU"], ["us", "US"]] as const).map(([v, label]) => (
            <div key={v} className="flex items-center gap-3">
              <RadioGroupItem value={v} id={\`rg-\${v}\`} data-kx-case={v === "us" ? "disabled" : "disabled-checked"} />
              <Label htmlFor={\`rg-\${v}\`}>{label}</Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  )`,
    },
    {
      // MX1b-1b: a plan picker and its right-to-left twin, horizontal so the arrow keys follow reading order.
      // \`check:motion\` and \`check:checkbox-radio-motion\` choose items here and measure the border and the dot.
      name: "Motion",
      imports: "KinetixDirectionProvider Label",
      render: `() => (
    <div className="grid gap-6">
      <RadioGroup defaultValue="free" aria-label="Plan" data-kx-case="plan">
        {([["free", "Free"], ["pro", "Pro"], ["team", "Team"]] as const).map(([v, label]) => (
          <div key={v} className="flex items-center gap-3">
            <RadioGroupItem value={v} id={\`rgm-\${v}\`} />
            <Label htmlFor={\`rgm-\${v}\`}>{label}</Label>
          </div>
        ))}
      </RadioGroup>
      <KinetixDirectionProvider dir="rtl">
        <div dir="rtl" lang="ar">
          <RadioGroup defaultValue="free" orientation="horizontal" aria-label="الخطة" data-kx-case="rtl" className="flex flex-wrap gap-4">
            {([["free", "مجاني"], ["pro", "احترافي"], ["team", "فريق"]] as const).map(([v, label]) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem value={v} id={\`rgm-rtl-\${v}\`} />
                <Label htmlFor={\`rgm-rtl-\${v}\`}>{label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </KinetixDirectionProvider>
    </div>
  )`,
    },
  ],
  // MX1b-1a, selection motion: every variant resting off, on and disabled, and a ToggleGroup in single, multiple
  // and right-to-left form, so `check:motion` and `check:toggle-motion` measure the selection colour (fast) and
  // the hover/press layer (instant) on a real element of each kind, and both axe passes see every state.
  toggle: [
    {
      name: "States",
      render: `() => (
    <div className="grid gap-3">
      {(["default", "outline", "pill"] as const).map((variant) => (
        <div key={variant} className="flex flex-wrap items-center gap-2">
          <Toggle variant={variant} data-kx-case={\`\${variant}-off\`}>Bold</Toggle>
          <Toggle variant={variant} defaultPressed data-kx-case={\`\${variant}-on\`}>Italic</Toggle>
          <Toggle variant={variant} disabled data-kx-case={\`\${variant}-disabled\`}>Underline</Toggle>
        </div>
      ))}
    </div>
  )`,
    },
  ],
  "toggle-group": [
    {
      name: "States",
      imports: "KinetixDirectionProvider",
      render: `() => (
    <div className="grid gap-4">
      <ToggleGroup type="single" defaultValue="start" aria-label="Alignment" data-kx-case="single">
        <ToggleGroupItem value="start">Start</ToggleGroupItem>
        <ToggleGroupItem value="center">Center</ToggleGroupItem>
        <ToggleGroupItem value="end">End</ToggleGroupItem>
      </ToggleGroup>
      <ToggleGroup type="multiple" variant="outline" defaultValue={["bold"]} aria-label="Formatting" data-kx-case="multiple">
        <ToggleGroupItem value="bold">Bold</ToggleGroupItem>
        <ToggleGroupItem value="italic">Italic</ToggleGroupItem>
        <ToggleGroupItem value="underline" disabled>Underline</ToggleGroupItem>
      </ToggleGroup>
      <KinetixDirectionProvider dir="rtl">
        <div dir="rtl" lang="ar">
          <ToggleGroup type="single" variant="pill" defaultValue="day" aria-label="الفترة" data-kx-case="rtl">
            <ToggleGroupItem value="day">يوم</ToggleGroupItem>
            <ToggleGroupItem value="week">أسبوع</ToggleGroupItem>
            <ToggleGroupItem value="month">شهر</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </KinetixDirectionProvider>
    </div>
  )`,
    },
  ],
  switch: [
    {
      name: "States",
      imports: "Card CardContent Label",
      render: `() => (
    <Card className="w-[22rem] max-w-full">
      <CardContent className="grid gap-4 p-6">
        {([
          ["off", "Push notifications", {}],
          ["on", "Weekly digest", { defaultChecked: true }],
          ["disabled", "SMS alerts (add a phone first)", { disabled: true }],
          ["disabled-on", "Security emails (required)", { disabled: true, defaultChecked: true }],
        ] as const).map(([key, label, props]) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <Label htmlFor={\`sw-\${key}\`}>{label}</Label>
            <Switch id={\`sw-\${key}\`} data-kx-case={key} {...props} />
          </div>
        ))}
      </CardContent>
    </Card>
  )`,
    },
    {
      name: "Direction",
      imports: "Label",
      // The thumb travels to the inline END of the switch's OWN direction — the closest `dir`, not whichever
      // ancestor happens to say rtl. A settings page in Arabic embeds an English-only section (a code
      // sample's options, a brand name's preferences) and the reverse; both are real. `check:selection-visual`
      // renders this with the page itself set to ltr and to rtl, so the three rows cover all four cases:
      // LTR in LTR, RTL in RTL, LTR inside an RTL page, RTL inside an LTR page.
      render: `() => (
    <div className="grid w-[22rem] max-w-full gap-4">
      {([
        ["inherit", undefined, "Follows the page"],
        ["ltr", "ltr", "Left-to-right section"],
        ["rtl", "rtl", "Right-to-left section"],
      ] as const).map(([key, dir, label]) => (
        <div key={key} dir={dir} data-kx-dir={key} className="flex items-center justify-between gap-4">
          <Label htmlFor={\`sw-dir-\${key}\`}>{label}</Label>
          <div className="flex items-center gap-3">
            <Switch id={\`sw-dir-\${key}\`} data-kx-case={\`\${key}-off\`} />
            <Switch aria-label={\`\${label}, on\`} data-kx-case={\`\${key}-on\`} defaultChecked />
          </div>
        </div>
      ))}
    </div>
  )`,
    },
    {
      // MX1b-1c, selection-control motion: switches at rest off and on, one whose owner turns it on and off from
      // outside (each \`data-kx-action\` sets one state), a required switch in a form with a reset, a disabled one,
      // and a switch in a right-to-left row. \`check:switch-motion\` drives these.
      name: "Motion",
      imports: "Button KinetixDirectionProvider Label",
      render: `() => {
    const [owned, setOwned] = React.useState(false);
    return (
      <div className="grid w-full max-w-[22rem] gap-4">
        {([
          ["off", "Push notifications", {}],
          ["on", "Weekly digest", { defaultChecked: true }],
          ["disabled", "SMS alerts (add a phone first)", { disabled: true }],
        ] as const).map(([key, label, props]) => (
          <div key={key} className="flex flex-wrap items-center justify-between gap-4">
            <Label htmlFor={\`swm-\${key}\`}>{label}</Label>
            <Switch id={\`swm-\${key}\`} data-kx-case={key} {...props} />
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Label htmlFor="swm-owned">Sync over mobile data</Label>
          <Switch id="swm-owned" data-kx-case="owned" checked={owned} onCheckedChange={setOwned} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="Outline" data-kx-action="checked" onClick={() => setOwned(true)}>Turn on</Button>
          <Button size="sm" variant="Outline" data-kx-action="unchecked" onClick={() => setOwned(false)}>Turn off</Button>
        </div>
        <form aria-label="Consent" className="flex flex-wrap items-center justify-between gap-4">
          <Label htmlFor="swm-required">Accept the terms</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Switch id="swm-required" name="terms" required data-kx-case="required" />
            <Button size="sm" variant="Outline" type="reset" data-kx-action="reset">Reset</Button>
          </div>
        </form>
        <KinetixDirectionProvider dir="rtl">
          <div dir="rtl" lang="ar" className="flex flex-wrap items-center justify-between gap-4">
            <Label htmlFor="swm-rtl">الإشعارات</Label>
            <Switch id="swm-rtl" data-kx-case="rtl" />
          </div>
        </KinetixDirectionProvider>
      </div>
    );
  }`,
    },
  ],
  "segmented-control": [
    {
      name: "States",
      imports: "Card CardContent",
      // On the page and inside a raised Card: the track is an inset well in both, and the chosen segment
      // must sit above its track in both themes — the arrangement that inverted in dark mode.
      render: `() => (
    <div className="grid w-[24rem] max-w-full gap-6">
      <SegmentedControl defaultValue="week" aria-label="Range" data-kx-case="page">
        <SegmentedControlItem value="day">Day</SegmentedControlItem>
        <SegmentedControlItem value="week">Week</SegmentedControlItem>
        <SegmentedControlItem value="month">Month</SegmentedControlItem>
        <SegmentedControlItem value="year" disabled>Year</SegmentedControlItem>
      </SegmentedControl>
      <Card>
        <CardContent className="p-4">
          <SegmentedControl defaultValue="grid" aria-label="Layout" data-kx-case="card" className="w-full">
            <SegmentedControlItem value="list">List</SegmentedControlItem>
            <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
            <SegmentedControlItem value="board">Board</SegmentedControlItem>
          </SegmentedControl>
        </CardContent>
      </Card>
    </div>
  )`,
    },
  ],
  // The text-entry state contract (TOKENS.md, "Text entry and navigation"). The demos show one empty field;
  // a real form also has a filled one, an invalid one with its error text, a read-only one and a disabled
  // one, side by side inside a raised Card — so both axe passes and `check:entry-visual` measure them where
  // forms actually live. Input and Textarea carry the same story by hand (their stories are hand-written).
  select: [
    {
      name: "EntryStates",
      imports: "Card CardContent Label SelectContent SelectItem SelectTrigger SelectValue",
      render: `() => (
    <Card className="w-[22rem] max-w-full">
      <CardContent className="grid gap-5 p-6">
        {([
          ["rest", "Country", {}, {}],
          ["filled", "Time zone", { defaultValue: "utc" }, {}],
          ["invalid", "Plan", {}, { "aria-invalid": true, "aria-describedby": "sel-invalid-error" }],
          ["disabled", "Data region (locked)", { defaultValue: "utc", disabled: true }, {}],
        ] as const).map(([key, label, root, trigger]) => (
          <div key={key} className="grid gap-2">
            <Label htmlFor={\`sel-\${key}\`}>{label}</Label>
            <Select {...root}>
              <SelectTrigger id={\`sel-\${key}\`} data-kx-case={key} {...trigger}>
                <SelectValue placeholder="Choose one" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utc">UTC</SelectItem>
                <SelectItem value="cet">Central European Time</SelectItem>
              </SelectContent>
            </Select>
            {key === "invalid" ? <p id="sel-invalid-error" className="text-body-sm text-destructive">Choose a plan to continue.</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )`,
    },
  ],
  "native-select": [
    {
      name: "EntryStates",
      imports: "Card CardContent Label",
      render: `() => (
    <Card className="w-[22rem] max-w-full">
      <CardContent className="grid gap-5 p-6">
        {([
          ["rest", "Country", { defaultValue: "" }],
          ["filled", "Time zone", { defaultValue: "utc" }],
          ["invalid", "Plan", { defaultValue: "", "aria-invalid": true, "aria-describedby": "nsel-invalid-error" }],
          ["disabled", "Data region (locked)", { defaultValue: "utc", disabled: true }],
        ] as const).map(([key, label, props]) => (
          <div key={key} className="grid gap-2">
            <Label htmlFor={\`nsel-\${key}\`}>{label}</Label>
            <NativeSelect id={\`nsel-\${key}\`} data-kx-case={key} {...props}>
              <NativeSelectOption value="" disabled>Choose one</NativeSelectOption>
              <NativeSelectOption value="utc">UTC</NativeSelectOption>
              <NativeSelectOption value="cet">Central European Time</NativeSelectOption>
            </NativeSelect>
            {key === "invalid" ? <p id="nsel-invalid-error" className="text-body-sm text-destructive">Choose a plan to continue.</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )`,
    },
  ],
  // Selected, unselected and disabled content tabs, on the page and inside a raised Card.
  // A zero-minimum grid track keeps large-text overflow inside the tab list instead of widening the fixture.
  tabs: [
    {
      name: "States",
      imports: "Card CardContent",
      render: `() => (
    <div className="grid w-[26rem] max-w-full grid-cols-[minmax(0,1fr)] gap-6">
      {(["page", "card"] as const).map((where) => {
        const tabs = (
          <Tabs defaultValue="overview">
            <TabsList data-kx-case={where} aria-label={where === "page" ? "Project" : "Workspace"}>
              <TabsTrigger value="overview" data-kx-case="selected">Overview</TabsTrigger>
              <TabsTrigger value="activity" data-kx-case="unselected">Activity</TabsTrigger>
              <TabsTrigger value="billing" data-kx-case="disabled" disabled>Billing</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="text-sm text-muted-foreground">Three deployments this week.</TabsContent>
            <TabsContent value="activity" className="text-sm text-muted-foreground">No new activity.</TabsContent>
          </Tabs>
        );
        return where === "page" ? (
          <div key={where}>{tabs}</div>
        ) : (
          <Card key={where}>
            <CardContent className="p-4">{tabs}</CardContent>
          </Card>
        );
      })}
    </div>
  )`,
    },
    {
      // The travelling indicator under the conditions a real strip meets: more tabs than fit, selection set
      // from outside, labels that change, tabs added and removed, direction and orientation switched, and the
      // whole strip hidden and shown, or unmounted. Each \`data-kx-action\` button is one of those; \`check:tabs-indicator\`
      // presses them and measures the bar against the chosen tab.
      name: "Indicator",
      imports: "Button",
      render: `() => {
    const all = ["Overview", "Activity", "Deployments", "Analytics", "Logs", "Storage", "Preferences", "Members", "Billing", "Integrations"];
    const [tabs, setTabs] = React.useState(all);
    const [value, setValue] = React.useState("Overview");
    const [dir, setDir] = React.useState<"ltr" | "rtl">("ltr");
    const [orientation, setOrientation] = React.useState<"horizontal" | "vertical">("horizontal");
    const [disabled, setDisabled] = React.useState<string | null>(null);
    const [hidden, setHidden] = React.useState(false);
    const [renamed, setRenamed] = React.useState(false);
    const [mounted, setMounted] = React.useState(true);
    const actions: [string, string, () => void][] = [
      ["select-last", "Choose last", () => setValue(tabs[tabs.length - 1])],
      ["select-second", "Choose second", () => setValue(tabs[1])],
      ["add", "Add tab", () => setTabs((t) => [...t, "Tab " + (t.length + 1)])],
      ["remove-first-inactive", "Remove first inactive", () => setTabs((t) => { const i = t.findIndex((x) => x !== value); return t.filter((_, k) => k !== i); })],
      ["remove-selected", "Remove selected", () => setTabs((t) => t.filter((x) => x !== value))],
      ["disable-selected", "Disable selected", () => setDisabled(value)],
      // The second label carries a count. Changing it rewrites a text node in place (a characterData mutation),
      // which resizes that tab and moves every tab after it without resizing the chosen one.
      ["grow-count", "Grow a count", () => setRenamed((r) => !r)],
      ["direction", "Flip direction", () => setDir((d) => (d === "ltr" ? "rtl" : "ltr"))],
      ["orientation", "Flip orientation", () => setOrientation((o) => (o === "horizontal" ? "vertical" : "horizontal"))],
      ["hidden", "Hide or show", () => setHidden((h) => !h)],
      ["unmount", "Unmount or mount", () => setMounted((m) => !m)],
    ];
    return (
      <div className="grid w-[22rem] max-w-full grid-cols-[minmax(0,1fr)] gap-4">
        <div className="flex flex-wrap gap-2">
          {actions.map(([key, label, run]) => (
            <Button key={key} size="sm" variant="outline" data-kx-action={key} onClick={run}>{label}</Button>
          ))}
        </div>
        <div hidden={hidden}>
          {mounted ? (
          <Tabs value={value} onValueChange={setValue} dir={dir} orientation={orientation} className={orientation === "vertical" ? "flex gap-4" : undefined}>
            <TabsList data-kx-case="lab" aria-label="Project sections" className={orientation === "vertical" ? "w-auto" : undefined}>
              {tabs.map((t, i) => (
                <TabsTrigger key={t} value={t} disabled={disabled === t}>{t}{i === 1 ? " " + (renamed ? 1280 : 3) : null}</TabsTrigger>
              ))}
            </TabsList>
            {tabs.map((t) => (
              <TabsContent key={t} value={t} className="text-sm text-muted-foreground">{t} panel.</TabsContent>
            ))}
          </Tabs>
          ) : null}
        </div>
      </div>
    );
  }`,
    },
  ],
  // Composite fields (TOKENS.md, "Composite fields"): one field whose parts — an add-on, a button, steppers,
  // chips, code slots — sit inside a single edge. The demos show one field at rest; a real form also has a
  // filled one, an invalid one with its error text, a read-only one and a disabled one, inside a raised Card —
  // so both axe passes and `check:composite-visual` measure them where forms live. `data-kx-case` names the
  // state; the gate finds each field's own wrapper from it.
  "input-group": [
    {
      name: "EntryStates",
      imports: "Card CardContent Label InputGroupText InputGroupInput InputGroupButton",
      render: `() => (
    <Card className="w-[22rem] max-w-full">
      <CardContent className="grid gap-5 p-6">
        {([
          ["rest", "Website", {}],
          ["filled", "Docs site", { defaultValue: "docs.kinetixui.com" }],
          ["invalid", "Status page", { defaultValue: "status page", "aria-invalid": true, "aria-describedby": "ig-invalid-error" }],
          ["readonly", "Workspace URL", { defaultValue: "acme.kinetixui.com", readOnly: true }],
          ["disabled", "Custom domain (Pro)", { defaultValue: "app.acme.com", disabled: true }],
        ] as const).map(([key, label, props]) => (
          <div key={key} className="grid gap-2">
            <Label htmlFor={\`ig-\${key}\`}>{label}</Label>
            <InputGroup data-kx-case={key}>
              <InputGroupText>https://</InputGroupText>
              <InputGroupInput id={\`ig-\${key}\`} placeholder="example.com" {...props} />
            </InputGroup>
            {key === "invalid" ? <p id="ig-invalid-error" className="text-body-sm text-destructive">Use a domain, like status.example.com.</p> : null}
          </div>
        ))}
        <div className="grid gap-2">
          <Label htmlFor="ig-button">Invite link</Label>
          <InputGroup data-kx-case="with-button">
            <InputGroupInput id="ig-button" defaultValue="kx.link/j/7Q2X9" readOnly />
            <InputGroupButton data-kx-part="button">Copy</InputGroupButton>
          </InputGroup>
        </div>
      </CardContent>
    </Card>
  )`,
    },
    {
      name: "Compositions",
      imports: "Card CardContent CardHeader CardTitle Label InputGroupAddon InputGroupText InputGroupInput NumberInput MultiSelect PasswordInput InputOTP InputOTPGroup InputOTPSlot Search",
      // The three places the composite fields actually live together: an account form, a dense filter bar
      // above a table, and a settings surface inside a raised Card. \`check:large-text\` and the Slice 4
      // composition capture render this in light, dark, 200% text, RTL and mixed direction.
      render: `() => (
    <div className="grid w-[40rem] max-w-[calc(100vw-4rem)] gap-6">
      <Card data-kx-composition="account">
        <CardHeader><CardTitle>Create your account</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cmp-site">Website</Label>
            <InputGroup>
              <InputGroupText>https://</InputGroupText>
              <InputGroupInput id="cmp-site" placeholder="example.com" />
            </InputGroup>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cmp-password">Password</Label>
            <PasswordInput id="cmp-password" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cmp-code">Verification code</Label>
            <InputOTP id="cmp-code" maxLength={6} aria-describedby="cmp-code-hint">
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
            <p id="cmp-code-hint" className="text-body-sm text-muted-foreground">We sent six digits to ada@example.com.</p>
          </div>
        </CardContent>
      </Card>
      <div data-kx-composition="filter" role="search" aria-label="Filter orders" className="flex flex-wrap items-end gap-3 rounded-md bg-surface-grouped p-3">
        <div className="grid min-w-[12rem] flex-1 gap-1.5">
          <Label htmlFor="cmp-search">Search</Label>
          <InputGroup>
            <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
            <InputGroupInput id="cmp-search" placeholder="Order, customer or SKU" />
          </InputGroup>
        </div>
        <div className="grid min-w-[12rem] flex-1 gap-1.5">
          <Label id="cmp-status-label">Status</Label>
          <MultiSelect aria-labelledby="cmp-status-label" defaultValue={["paid", "shipped"]} options={[{ value: "paid", label: "Paid" }, { value: "shipped", label: "Shipped" }, { value: "refunded", label: "Refunded" }]} />
        </div>
        <div className="grid gap-1.5">
          <Label id="cmp-min-label">Min. items</Label>
          <NumberInput aria-labelledby="cmp-min-label" defaultValue={1} min={0} className="w-32" />
        </div>
      </div>
      <Card data-kx-composition="settings">
        <CardHeader><CardTitle>Workspace limits</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label id="cmp-seats-label">Seats</Label>
            <NumberInput aria-labelledby="cmp-seats-label" defaultValue={12} min={1} max={500} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cmp-domain">Sign-in domain</Label>
            <InputGroup>
              <InputGroupText>@</InputGroupText>
              <InputGroupInput id="cmp-domain" defaultValue="acme.com" aria-invalid aria-describedby="cmp-domain-error" />
            </InputGroup>
            <p id="cmp-domain-error" className="text-body-sm text-destructive">Verify this domain before limiting sign-in to it.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )`,
    },
  ],
  "number-input": [
    {
      name: "EntryStates",
      imports: "Card CardContent Label",
      render: `() => (
    <Card className="w-[22rem] max-w-full">
      <CardContent className="grid gap-5 p-6">
        {([
          ["rest", "Seats", { defaultValue: 4, min: 1 }],
          ["invalid", "Guests", { defaultValue: 12, "aria-invalid": true, "aria-describedby": "ni-invalid-error" }],
          ["readonly", "Plan seats", { defaultValue: 25, readOnly: true }],
          ["disabled", "Admins (locked)", { defaultValue: 2, disabled: true }],
        ] as const).map(([key, label, props]) => (
          <div key={key} className="grid gap-2">
            <Label id={\`ni-\${key}-label\`}>{label}</Label>
            <NumberInput data-kx-case={key} aria-labelledby={\`ni-\${key}-label\`} {...props} />
            {key === "invalid" ? <p id="ni-invalid-error" className="text-body-sm text-destructive">This room holds 10 people at most.</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )`,
    },
  ],
  "multi-select": [
    {
      name: "EntryStates",
      imports: "Card CardContent Label",
      render: `() => (
    <Card className="w-[22rem] max-w-full">
      <CardContent className="grid gap-5 p-6">
        {([
          ["rest", "Labels", {}],
          ["filled", "Teams", { defaultValue: ["design", "web"] }],
          ["invalid", "Reviewers", { "aria-invalid": true, "aria-describedby": "ms-invalid-error" }],
        ] as const).map(([key, label, props]) => (
          <div key={key} className="grid gap-2">
            <Label id={\`ms-\${key}-label\`}>{label}</Label>
            <MultiSelect
              data-kx-case={key}
              aria-labelledby={\`ms-\${key}-label\`}
              placeholder="Choose some"
              options={[{ value: "design", label: "Design" }, { value: "web", label: "Web" }, { value: "mobile", label: "Mobile" }]}
              {...props}
            />
            {key === "invalid" ? <p id="ms-invalid-error" className="text-body-sm text-destructive">Pick at least one reviewer.</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )`,
    },
  ],
  "input-otp": [
    {
      name: "EntryStates",
      imports: "Card CardContent Label InputOTPGroup InputOTPSlot",
      render: `() => (
    <Card className="w-[22rem] max-w-full">
      <CardContent className="grid gap-5 p-6">
        {([
          ["rest", "Verification code", {}],
          ["filled", "Backup code", { defaultValue: "482913" }],
          ["invalid", "Authenticator code", { defaultValue: "000000", "aria-invalid": true, "aria-describedby": "otp-invalid-error" }],
          ["disabled", "Recovery code (used)", { defaultValue: "771204", disabled: true }],
        ] as const).map(([key, label, props]) => (
          <div key={key} className="grid gap-2">
            <Label htmlFor={\`otp-\${key}\`}>{label}</Label>
            <InputOTP id={\`otp-\${key}\`} data-kx-case={key} maxLength={6} {...props}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
            {key === "invalid" ? <p id="otp-invalid-error" className="text-body-sm text-destructive">That code has expired. Request a new one.</p> : null}
          </div>
        ))}
      </CardContent>
    </Card>
  )`,
    },
  ],
  table: [
    {
      name: "Overflowing",
      imports: "Table TableBody TableCaption TableCell TableHead TableHeader TableRow",
      // Table puts its own scroll container around the table, and that container is only a tab stop while
      // it can actually scroll. The three-row invoice demo never can, at any width this story is rendered
      // at, so `Default` is evidence about the component's resting state only — it cannot show that a
      // reader who does not use a mouse can read a table too wide for its column.
      //
      // Nine columns of ledger data inside a 22rem column is not a contrivance: /blocks renders this
      // component in a card and /create renders it in a dashboard pane, and that is where axe found the
      // missing keyboard access in the first place. The width is on a wrapper, not on the Table, because
      // a consumer constrains the space a table is given — they do not reach inside it.
      render: `() => (
    <div className="w-[22rem] max-w-full">
      <Table>
        <TableCaption>Settlement ledger, March</TableCaption>
        <TableHeader>
          <TableRow>
            {["Reference", "Counterparty", "Instrument", "Booked", "Value date", "Currency", "Notional", "Status", "Desk"].map(
              (h) => (
                <TableHead key={h} className="whitespace-nowrap">
                  {h}
                </TableHead>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            ["STL-4471", "Northwind Trading", "FX forward", "02 Mar", "04 Mar", "EUR", "1,250,000", "Settled", "Rates"],
            ["STL-4472", "Halvorsen Capital", "Interest swap", "03 Mar", "05 Mar", "USD", "4,000,000", "Pending", "Rates"],
            ["STL-4473", "Keystone Mutual", "Equity basket", "03 Mar", "06 Mar", "GBP", "860,500", "Failed", "Cash"],
          ].map((row) => (
            <TableRow key={row[0]}>
              {row.map((cell) => (
                <TableCell key={cell} className="whitespace-nowrap">
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )`,
    },
  ],
};

const src = readFileSync(DEMOS, "utf8");

/* ---- map every imported identifier to its source module -------------- */
// local name -> { from, spec }  (spec is the import clause, e.g. "Command as Cmd")
const importOf = new Map();
for (const m of src.matchAll(/^import\s+\{([\s\S]+?)\}\s+from\s+"([^"]+)";$/gm)) {
  const from = m[2];
  for (const raw of m[1].split(",").map((s) => s.trim()).filter(Boolean)) {
    const local = raw.includes(" as ") ? raw.split(" as ")[1].trim() : raw;
    importOf.set(local, { from, spec: raw });
  }
}

// An EXTRA render may use an identifier the demo registry never imports — `TableCaption` is not in any
// demo, but a scrollable table is named by its caption, so the story needs it. Register those here so the
// per-story import block resolves them like any other. `from` defaults to the package itself.
for (const list of Object.values(EXTRA)) {
  for (const entry of list) {
    for (const name of (entry.imports ?? "").split(/\s+/).filter(Boolean)) {
      if (!importOf.has(name)) importOf.set(name, { from: entry.from ?? "@kinetixui/ui", spec: name });
    }
  }
}

const constDecls = [];
for (const m of src.matchAll(/^const\s+([A-Z0-9_]+)\s*=\s*[^;]+;/gm)) {
  constDecls.push({ name: m[1], code: m[0] });
}

/* ---- string/comment-aware scanner to pull each add(...) call ---------- */
function parseAdds(text) {
  const out = [];
  let i = 0;
  while ((i = text.indexOf("add(", i)) !== -1) {
    // must be a statement start (preceded by whitespace/newline)
    if (i > 0 && /[\w.]/.test(text[i - 1])) { i += 4; continue; }
    let j = i + 4;
    const skipWs = () => { while (/\s/.test(text[j])) j++; };
    const readString = () => {
      const q = text[j++];
      let s = "";
      while (text[j] !== q) { if (text[j] === "\\") s += text[j++]; s += text[j++]; }
      j++;
      return s;
    };
    skipWs();
    if (text[j] !== '"' && text[j] !== "'") { i = j; continue; }
    const key = readString();
    skipWs();
    if (text[j] !== ",") { i = j; continue; }
    j++; skipWs();
    // read arg2: balance () [] {} ; skip strings/backticks/comments; stop at depth-0 comma
    const start = j;
    let depth = 0;
    for (; j < text.length; j++) {
      const c = text[j];
      if (c === '"' || c === "'" || c === "`") {
        const q = c; j++;
        while (j < text.length && text[j] !== q) { if (text[j] === "\\") j++; j++; }
        continue;
      }
      if (c === "/" && text[j + 1] === "/") { while (j < text.length && text[j] !== "\n") j++; continue; }
      if (c === "/" && text[j + 1] === "*") { j += 2; while (j < text.length && !(text[j] === "*" && text[j + 1] === "/")) j++; j++; continue; }
      if (c === "(" || c === "[" || c === "{") depth++;
      else if (c === ")" || c === "]" || c === "}") depth--;
      else if (c === "," && depth === 0) break;
    }
    const component = text.slice(start, j).trim();
    j++; skipWs();
    // read arg3: template literal
    let source = "";
    if (text[j] === "`") {
      j++;
      while (text[j] !== "`") { if (text[j] === "\\") source += text[j++]; source += text[j++]; }
      j++;
    }
    out.push({ key, component, source });
    i = j;
  }
  return out;
}

const entries = parseAdds(src).filter((e) => e.key.endsWith("-demo"));

const ACRONYM = { otp: "OTP" };
const title = (slug) =>
  slug.split("-").map((w) => ACRONYM[w] ?? w[0].toUpperCase() + w.slice(1)).join("");

// build the per-story import block: only the identifiers this render body uses
function importsFor(body) {
  const idents = new Set(body.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) ?? []);
  const byModule = new Map();
  for (const name of idents) {
    const hit = importOf.get(name);
    if (!hit) continue;
    if (!byModule.has(hit.from)) byModule.set(hit.from, new Set());
    byModule.get(hit.from).add(hit.spec);
  }
  return [...byModule]
    .sort()
    .map(([from, specs]) => `import { ${[...specs].sort().join(", ")} } from "${from}";`)
    .join("\n");
}

mkdirSync(OUT, { recursive: true });
let written = 0;
const generated = [];
const problems = [];
/**
 * The hand-written stories keep their own `title`, so they are the one place a group label can still drift
 * from the manifest — and they did: Button sat in "Controls & Actions" and Input in "Form Inputs" after CAT-2
 * renamed both. Checked here rather than rewritten, because the rest of these files is deliberately not
 * generated.
 */
for (const slug of HANDWRITTEN) {
  const Name = title(slug);
  const path = `${OUT}/${Name}.stories.tsx`;
  if (!existsSync(path)) continue;
  const declared = /title:\s*"([^"/]+)\//.exec(readFileSync(path, "utf8"))?.[1];
  const group = GROUP[slug];
  if (declared !== group) {
    problems.push(
      `${Name}.stories.tsx is hand-written and titled "${declared}/${Name}", but ${slug} is in "${group}" — ` +
        `change the title to match components.manifest.json.`,
    );
  }
}

for (const { key, component, source } of entries) {
  const slug = key.replace(/-demo$/, "");
  if (HANDWRITTEN.has(slug)) continue;
  const Name = title(slug);
  const group = GROUP[slug];
  if (!group) {
    problems.push(
      `${slug}: no category in component-taxonomy.json, so it has no Storybook group. Add a category to ` +
        `components.manifest.json and run \`pnpm gen:manifest\`.`,
    );
    continue;
  }
  const layout = PADDED.has(slug) ? "padded" : "centered";
  // A percentage width needs a parent with a width. `layout: "centered"` gives it one sized to its own
  // content, so the demo resolves to zero and the story renders a control that is not there — silently,
  // because every check downstream still finds the element and reports on whatever is left of it.
  const relativeWidth = /\b[wh]-\[\d+(?:\.\d+)?%\]/.exec(component);
  if (relativeWidth && layout !== "padded") {
    problems.push(
      `${slug}: its demo sizes itself with ${relativeWidth[0]}, which is a percentage of a wrapper that ` +
        `\`layout: "centered"\` sizes to its content — the story would render it at zero. Add "${slug}" to ` +
        `PADDED, or give the demo an absolute width.`,
    );
  }
  const usedConsts = constDecls.filter((c) => new RegExp(`\\b${c.name}\\b`).test(component));
  const constBlock = usedConsts.map((c) => c.code).join("\n");
  const ctrl = CONTROLS[slug];
  const extras = EXTRA[slug] ?? [];
  const importBody = [
    component,
    ctrl ? `${ctrl.comp} ${ctrl.imports ?? ""} ${ctrl.render}` : "",
    ...extras.map((e) => `${e.imports ?? ""} ${e.render}`),
  ].join(" ");

  const file = `/* AUTO-GENERATED by scripts/gen-stories.mjs — do not edit.
   Source of truth: apps/web/src/registry/demos.tsx${ctrl ? " · controls: scripts/gen-stories.mjs CONTROLS" : ""} */
import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
${importsFor(importBody)}
${constBlock ? `\n${constBlock}\n` : ""}
const Demo = ${component};

const meta = {
  title: ${JSON.stringify(`${group}/${Name}`)},${ctrl ? `\n  component: ${ctrl.comp},\n  args: ${ctrl.args},\n  argTypes: ${ctrl.argTypes},` : ""}
  parameters: {
    layout: ${JSON.stringify(layout)},
    docs: { source: { code: ${JSON.stringify(source)}, language: "tsx" } },
  },
} satisfies Meta;

export default meta;
${ctrl ? `\nexport const Playground: StoryObj<typeof meta> = { render: ${ctrl.render} };\n` : ""}
export const Default: StoryObj<typeof meta> = { render: () => <Demo /> };
${extras.map((e) => `\nexport const ${e.name}: StoryObj<typeof meta> = { render: ${e.render} };\n`).join("")}`;
  const path = `${OUT}/${Name}.stories.tsx`;
  if (CHECK) {
    if (!existsSync(path)) problems.push(`${Name}.stories.tsx is missing — ${slug} would be invisible to the accessibility suites`);
    else if (readFileSync(path, "utf8") !== file) problems.push(`${Name}.stories.tsx has drifted from what the generator writes`);
  } else {
    writeFileSync(path, file);
  }
  generated.push(`${Name}.stories.tsx`);
  written++;
}

/** slug → the story file on disk that covers it, generated or hand-written. */
const onDisk = new Map(
  readdirSync(OUT)
    .filter((f) => f.endsWith(".stories.tsx"))
    .map((f) => [slugOf(f), f]),
);

// A generated story whose component no longer exists is dead weight that the axe suites still mount.
for (const [slug, file] of onDisk) {
  if (!manifest.components[slug] && !NO_STORY[slug]) {
    problems.push(`${file}: no component "${slug}" in components.manifest.json — orphaned story`);
  }
}

// The part PR #209 exposed: a component the manifest declares but nothing has a story for.
const uncovered = Object.keys(manifest.components).filter((slug) => !onDisk.has(slug) && !NO_STORY[slug]);
if (uncovered.length) {
  problems.push(
    `${uncovered.length} component(s) have no Storybook story, so no accessibility suite covers them: ${uncovered.join(", ")}. ` +
      `Add a demo (which generates a story), or record an explicit exemption with a reason in NO_STORY.`,
  );
}

if (problems.length) {
  console.error(problems.map((p) => `  x ${p}`).join("\n"));
  console.error(`\ncheck:stories failed — ${problems.length} problem(s). Run \`pnpm gen:stories\` and commit the result.`);
  process.exit(1);
}

const covered = Object.keys(manifest.components).filter((slug) => onDisk.has(slug)).length;
const total = Object.keys(manifest.components).length;
console.log(
  `${CHECK ? "check:stories ok" : "gen:stories"} — ${written} generated, ${covered}/${total} components covered by a story` +
    `${Object.keys(NO_STORY).length ? ` (${Object.keys(NO_STORY).length} exempt)` : ""}`,
);

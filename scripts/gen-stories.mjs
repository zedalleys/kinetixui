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

const GROUP = {
  "aspect-ratio": "Foundations", separator: "Foundations", skeleton: "Foundations",
  spinner: "Foundations", label: "Foundations", image: "Foundations", "code-block": "Foundations",
  kbd: "Foundations",
  input: "Form Inputs", textarea: "Form Inputs", checkbox: "Form Inputs", "radio-group": "Form Inputs",
  select: "Form Inputs", "native-select": "Form Inputs", "multi-select": "Form Inputs", slider: "Form Inputs", switch: "Form Inputs", "input-otp": "Form Inputs",
  "input-group": "Form Inputs", "password-input": "Form Inputs", "number-input": "Form Inputs",
  field: "Form Inputs", form: "Form Inputs", "file-upload": "Form Inputs", "date-picker": "Form Inputs",
  calendar: "Form Inputs", rating: "Form Inputs", "color-picker": "Form Inputs", "markdown-editor": "Form Inputs",
  button: "Controls & Actions", "button-group": "Controls & Actions", toggle: "Controls & Actions", "toggle-group": "Controls & Actions", "segmented-control": "Controls & Actions",
  fab: "Controls & Actions", pagination: "Controls & Actions", command: "Controls & Actions",
  combobox: "Controls & Actions", "comparison-slider": "Controls & Actions",
  breadcrumb: "Navigation", tabs: "Navigation", "tab-bar": "Navigation", "navigation-menu": "Navigation",
  "page-header": "Navigation", "tree-view": "Navigation",
  "navigation-bar": "Navigation", menubar: "Navigation", sidebar: "Navigation", stepper: "Navigation",
  "table-of-contents": "Navigation",
  dialog: "Overlays", "alert-dialog": "Overlays", sheet: "Overlays", drawer: "Overlays",
  popover: "Overlays", "hover-card": "Overlays", tooltip: "Overlays", "dropdown-menu": "Overlays",
  "notification-center": "Overlays", tour: "Overlays",
  "context-menu": "Overlays", modal: "Overlays",
  alert: "Feedback", inform: "Feedback", banner: "Feedback", progress: "Feedback", "circular-progress": "Feedback",
  empty: "Feedback",
  sonner: "Feedback", badge: "Feedback", tag: "Feedback", metric: "Feedback",
  accordion: "Data Display", card: "Data Display", table: "Data Display", "data-table": "Data Display", "data-grid": "Data Display",
  carousel: "Data Display", chart: "Data Display", avatar: "Data Display", "avatar-group": "Data Display",
  collapsible: "Data Display", "scroll-area": "Data Display", resizable: "Data Display", list: "Data Display",
  quote: "Data Display", footer: "Data Display", "audio-player": "Data Display", "description-list": "Data Display",
  timeline: "Data Display", marquee: "Data Display", "message-bubble": "Data Display",
  "virtual-list": "Data Display", "json-viewer": "Data Display", "diff-viewer": "Data Display",
  "kanban-board": "Data Display",
};

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
    variant: { control: "inline-radio", options: ["default", "outline"] },
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
  // The navigation state contract: a selected tab, an unselected one and a disabled one, on the page and
  // inside a raised Card — the two places a tab list sits, and the arrangement that inverts in dark mode
  // if the selected tab is the page colour.
  tabs: [
    {
      name: "States",
      imports: "Card CardContent",
      render: `() => (
    <div className="grid w-[26rem] max-w-full gap-6">
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
for (const { key, component, source } of entries) {
  const slug = key.replace(/-demo$/, "");
  if (HANDWRITTEN.has(slug)) continue;
  const Name = title(slug);
  const group = GROUP[slug] ?? "Components";
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

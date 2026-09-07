/**
 * gen-stories.mjs — generate one Storybook story per component from the
 * canonical demo registry (apps/web/src/registry/demos.tsx).
 *
 *   node scripts/gen-stories.mjs
 *
 * Output: packages/ui/src/stories/<Pascal>.stories.tsx (one per `*-demo` entry).
 * Button / Input / Textarea keep their hand-written stories and are skipped.
 */
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEMOS = `${ROOT}/apps/web/src/registry/demos.tsx`;
const OUT = `${ROOT}/packages/ui/src/stories`;

const HANDWRITTEN = new Set(["button", "input", "textarea"]);

const GROUP = {
  "aspect-ratio": "Foundations", separator: "Foundations", skeleton: "Foundations",
  spinner: "Foundations", label: "Foundations", image: "Foundations", "code-block": "Foundations",
  input: "Form Inputs", textarea: "Form Inputs", checkbox: "Form Inputs", "radio-group": "Form Inputs",
  select: "Form Inputs", slider: "Form Inputs", switch: "Form Inputs", "input-otp": "Form Inputs",
  "input-group": "Form Inputs", "password-input": "Form Inputs", "number-input": "Form Inputs",
  field: "Form Inputs", form: "Form Inputs", "file-upload": "Form Inputs", "date-picker": "Form Inputs",
  calendar: "Form Inputs", rating: "Form Inputs",
  button: "Controls & Actions", toggle: "Controls & Actions", "toggle-group": "Controls & Actions",
  fab: "Controls & Actions", pagination: "Controls & Actions", command: "Controls & Actions",
  combobox: "Controls & Actions",
  breadcrumb: "Navigation", tabs: "Navigation", "tab-bar": "Navigation", "navigation-menu": "Navigation",
  "navigation-bar": "Navigation", menubar: "Navigation", sidebar: "Navigation", stepper: "Navigation",
  "table-of-contents": "Navigation",
  dialog: "Overlays", "alert-dialog": "Overlays", sheet: "Overlays", drawer: "Overlays",
  popover: "Overlays", "hover-card": "Overlays", tooltip: "Overlays", "dropdown-menu": "Overlays",
  "context-menu": "Overlays", modal: "Overlays",
  alert: "Feedback", inform: "Feedback", progress: "Feedback", "circular-progress": "Feedback",
  sonner: "Feedback", badge: "Feedback", tag: "Feedback", metric: "Feedback",
  accordion: "Data Display", card: "Data Display", table: "Data Display", "data-table": "Data Display",
  carousel: "Data Display", chart: "Data Display", avatar: "Data Display", "avatar-group": "Data Display",
  collapsible: "Data Display", "scroll-area": "Data Display", resizable: "Data Display", list: "Data Display",
  quote: "Data Display", footer: "Data Display", "audio-player": "Data Display",
};

const PADDED = new Set([
  "chart", "data-table", "table", "footer", "calendar", "resizable", "carousel",
  "sidebar", "stepper", "menubar", "navigation-menu",
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
    render: `(args) => <CircularProgress {...args} />`,
  },
  progress: {
    comp: "Progress",
    args: `{ value: 66 }`,
    argTypes: `{ value: { control: { type: "range", min: 0, max: 100 } } }`,
    render: `(args) => <Progress {...args} className="w-60" />`,
  },
  slider: {
    comp: "Slider",
    args: `{ disabled: false }`,
    argTypes: `{ disabled: { control: "boolean" } }`,
    render: `(args) => <Slider {...args} defaultValue={[50]} max={100} step={1} className="w-60" />`,
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
    render: `(args) => <Switch {...args} />`,
  },
  checkbox: {
    comp: "Checkbox",
    args: `{ disabled: false, defaultChecked: false }`,
    argTypes: `{ disabled: { control: "boolean" }, defaultChecked: { control: "boolean" } }`,
    render: `(args) => <Checkbox {...args} />`,
  },
  "number-input": {
    comp: "NumberInput",
    args: `{ defaultValue: 2, min: 0, max: 10, step: 1 }`,
    argTypes: `{
    min: { control: "number" }, max: { control: "number" }, step: { control: "number" },
  }`,
    render: `(args) => <NumberInput {...args} className="w-32" />`,
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
      <ToggleGroupItem value="bold"><Bold className="size-4" /></ToggleGroupItem>
      <ToggleGroupItem value="italic"><Italic className="size-4" /></ToggleGroupItem>
      <ToggleGroupItem value="underline"><Underline className="size-4" /></ToggleGroupItem>
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
      <SelectTrigger className="w-[220px]">
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
for (const { key, component, source } of entries) {
  const slug = key.replace(/-demo$/, "");
  if (HANDWRITTEN.has(slug)) continue;
  const Name = title(slug);
  const group = GROUP[slug] ?? "Components";
  const layout = PADDED.has(slug) ? "padded" : "centered";
  const usedConsts = constDecls.filter((c) => new RegExp(`\\b${c.name}\\b`).test(component));
  const constBlock = usedConsts.map((c) => c.code).join("\n");
  const ctrl = CONTROLS[slug];
  const importBody = ctrl
    ? `${component} ${ctrl.comp} ${ctrl.imports ?? ""} ${ctrl.render}`
    : component;

  const file = `/* AUTO-GENERATED by scripts/gen-stories.mjs — do not edit.
   Source of truth: apps/web/src/registry/demos.tsx${ctrl ? " · controls: scripts/gen-stories.mjs CONTROLS" : ""} */
import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
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
`;
  writeFileSync(`${OUT}/${Name}.stories.tsx`, file);
  generated.push(`${Name}.stories.tsx`);
  written++;
}

// prune stale generated files (component removed from demos)
for (const f of readdirSync(OUT)) {
  if (!f.endsWith(".stories.tsx")) continue;
  const body = readFileSync(`${OUT}/${f}`, "utf8");
  if (body.startsWith("/* AUTO-GENERATED") && !generated.includes(f)) {
    console.log("stale (left in place, remove by hand):", f);
  }
}

console.log(`generated ${written} stories → ${OUT}`);

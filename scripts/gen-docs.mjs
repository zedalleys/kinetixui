/**
 * Generate apps/web/src/app/docs/components/<slug>/page.{mdx,tsx} for every
 * component. Built components get an MDX page with a live <ComponentPreview>;
 * unbuilt ones get a <ComingSoon> shell. Existing button/input/textarea MDX
 * pages are left untouched.
 *
 *   node scripts/gen-docs.mjs
 */
import { readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = `${ROOT}/apps/web/src/app/docs/components`;

const BUILT = {
  accordion: ["Accordion, AccordionItem, AccordionTrigger, AccordionContent", "A vertically stacked set of interactive headings that each reveal a section of content."],
  alert: ["Alert, AlertTitle, AlertDescription", "Displays a callout for user attention."],
  "alert-dialog": ["AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel", "A modal dialog that interrupts the user with important content and expects a response."],
  "aspect-ratio": ["AspectRatio", "Displays content within a desired ratio."],
  avatar: ["Avatar, AvatarImage, AvatarFallback", "An image element with a fallback for representing the user."],
  badge: ["Badge", "Displays a badge or a component that looks like a badge. Design source node 54855:13995."],
  breadcrumb: ["Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator", "Displays the path to the current resource using a hierarchy of links."],
  card: ["Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter", "Displays a card with header, content, and footer."],
  checkbox: ["Checkbox", "A control that allows the user to toggle between checked and not checked. Design source node 54863:483."],
  collapsible: ["Collapsible, CollapsibleTrigger, CollapsibleContent", "An interactive component which expands / collapses a panel."],
  dialog: ["Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter", "A window overlaid on either the primary window or another dialog window."],
  "dropdown-menu": ["DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator", "Displays a menu to the user — such as a set of actions or functions — triggered by a button."],
  "hover-card": ["HoverCard, HoverCardTrigger, HoverCardContent", "For sighted users to preview content available behind a link."],
  label: ["Label", "Renders an accessible label associated with controls."],
  pagination: ["Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis", "Pagination with page navigation, next and previous links."],
  popover: ["Popover, PopoverTrigger, PopoverContent", "Displays rich content in a portal, triggered by a button."],
  progress: ["Progress", "Displays an indicator showing the completion progress of a task."],
  "radio-group": ["RadioGroup, RadioGroupItem", "A set of checkable buttons where no more than one can be checked at a time. Design source node 54863:536."],
  "scroll-area": ["ScrollArea, ScrollBar", "Augments native scroll functionality for custom, cross-browser styling."],
  select: ["Select, SelectTrigger, SelectValue, SelectContent, SelectItem", "Displays a list of options for the user to pick from — triggered by a button. Design source node 54855:13882."],
  separator: ["Separator", "Visually or semantically separates content."],
  sheet: ["Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription", "Extends the Dialog component to display content that complements the main content of the screen."],
  skeleton: ["Skeleton", "Use to show a placeholder while content is loading."],
  slider: ["Slider", "An input where the user selects a value from within a given range."],
  sonner: ["Toaster, toast", "An opinionated toast component for React."],
  switch: ["Switch", "A control that allows the user to toggle between checked and not checked. Design source node 54855:13984."],
  table: ["Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption", "A responsive table component."],
  tabs: ["Tabs, TabsList, TabsTrigger, TabsContent", "A set of layered sections of content — known as tab panels — displayed one at a time."],
  toggle: ["Toggle", "A two-state button that can be either on or off."],
  "toggle-group": ["ToggleGroup, ToggleGroupItem", "A set of two-state buttons that can be toggled on or off."],
  tooltip: ["Tooltip, TooltipProvider, TooltipTrigger, TooltipContent", "A popup that displays information related to an element on focus / hover."],
};

const SOON = {
  calendar: "54855:13882", carousel: "—", chart: "—", combobox: "—", command: "—",
  "context-menu": "—", "data-table": "—", "date-picker": "—", drawer: "—", form: "—",
  "input-otp": "—", menubar: "—", "navigation-menu": "—", resizable: "—", sidebar: "—",
};

const title = (s) => s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

for (const [slug, [exports, desc]] of Object.entries(BUILT)) {
  const dir = `${DOCS}/${slug}`;
  if (existsSync(`${dir}/page.mdx`) || existsSync(`${dir}/page.tsx`)) continue; // keep hand-written
  mkdirSync(dir, { recursive: true });
  const mdx = `export const metadata = {
  title: ${JSON.stringify(title(slug))},
  description: ${JSON.stringify(desc)},
};

# ${title(slug)}

${desc}

<ComponentPreview name="${slug}-demo" />

## Installation

\`\`\`bash
npx shadcn@latest add https://kinetixui.com/r/${slug}.json
\`\`\`

## Usage

\`\`\`tsx
import { ${exports} } from "@kinetixui/ui";
\`\`\`

Styled entirely from the KinetixUI token contract — \`bg-primary\`,
\`text-muted-foreground\`, \`border-input\`, \`ring-ring\`. Works in light and dark
with no extra config.
`;
  writeFileSync(`${dir}/page.mdx`, mdx);
  console.log("mdx  ", slug);
}

for (const [slug, node] of Object.entries(SOON)) {
  const dir = `${DOCS}/${slug}`;
  if (existsSync(`${dir}/page.mdx`) || existsSync(`${dir}/page.tsx`)) continue;
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    `${dir}/page.tsx`,
    `import { ComingSoon } from "@/components/coming-soon";

export const metadata = { title: ${JSON.stringify(title(slug))} };

export default function Page() {
  return <ComingSoon title=${JSON.stringify(title(slug))} node=${JSON.stringify(node)} />;
}
`,
  );
  console.log("shell", slug);
}

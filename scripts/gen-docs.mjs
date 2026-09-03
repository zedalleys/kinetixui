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
  badge: ["Badge", "A solid pill status marker. Reconciled 1:1 with design source node 54855:13995 (variants: default | secondary | destructive | outline | subtle)."],
  tag: ["Tag, tagVariants", "A container-tinted, dismissible chip. Reconciled 1:1 with design source node 54855:14021 (variants: default | secondary | destructive | warning | outline)."],
  modal: ["Modal", "A structured dialog — header / divider / body / divider / footer. Reconciled 1:1 with design source node 54857:1322 (type: Info | Confirmation | Warning | Destructive)."],
  breadcrumb: ["Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator", "Displays the path to the current resource using a hierarchy of links."],
  card: ["Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter", "Displays a card with header, content, and footer."],
  checkbox: ["Checkbox", "A control that allows the user to toggle between checked and not checked. Reconciled 1:1 with design source node 54863:483."],
  collapsible: ["Collapsible, CollapsibleTrigger, CollapsibleContent", "An interactive component which expands / collapses a panel."],
  dialog: ["Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter", "A window overlaid on either the primary window or another dialog window."],
  "dropdown-menu": ["DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator", "Displays a menu to the user — such as a set of actions or functions — triggered by a button."],
  "hover-card": ["HoverCard, HoverCardTrigger, HoverCardContent", "For sighted users to preview content available behind a link."],
  label: ["Label", "Renders an accessible label associated with controls."],
  field: ["Field, FieldLabel, FieldControl, FieldDescription, FieldMessage", "The label + control + description + feedback composition (label & message colour track the invalid state). Feedback intents: error | warning | success | info, each with an icon."],
  pagination: ["Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis", "Pagination with page navigation, next and previous links."],
  popover: ["Popover, PopoverTrigger, PopoverContent", "Displays rich content in a portal, triggered by a button."],
  progress: ["Progress", "Displays an indicator showing the completion progress of a task."],
  "radio-group": ["RadioGroup, RadioGroupItem", "A set of checkable buttons where no more than one can be checked at a time. Reconciled 1:1 with design source node 54863:536."],
  "scroll-area": ["ScrollArea, ScrollBar", "Augments native scroll functionality for custom, cross-browser styling."],
  select: ["Select, SelectTrigger, SelectValue, SelectContent, SelectItem", "Displays a list of options for the user to pick from — triggered by a button. Reconciled 1:1 with design source node 54855:13882."],
  separator: ["Separator", "Visually or semantically separates content."],
  sheet: ["Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription", "Extends the Dialog component to display content that complements the main content of the screen."],
  skeleton: ["Skeleton", "Use to show a placeholder while content is loading."],
  slider: ["Slider", "An input where the user selects a value from within a given range."],
  sonner: ["Toaster, toast", "An opinionated toast component for React."],
  switch: ["Switch", "A control that allows the user to toggle between checked and not checked. Reconciled 1:1 with design source node 54855:13984."],
  table: ["Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption", "A responsive table component."],
  tabs: ["Tabs, TabsList, TabsTrigger, TabsContent", "A set of layered sections of content — known as tab panels — displayed one at a time."],
  toggle: ["Toggle", "A two-state button that can be either on or off."],
  "toggle-group": ["ToggleGroup, ToggleGroupItem", "A set of two-state buttons that can be toggled on or off."],
  tooltip: ["Tooltip, TooltipProvider, TooltipTrigger, TooltipContent", "A popup that displays information related to an element on focus / hover."],
  calendar: ["Calendar", "A date field component built on react-day-picker."],
  carousel: ["Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext", "A carousel with motion and swipe, built on Embla."],
  chart: ["ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent", "Charts built on Recharts, themed with `--chart-1…5`."],
  combobox: ["Command, Popover, Button", "Autocomplete input and command palette — Popover + Command."],
  command: ["Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandDialog", "Fast, composable, unstyled command menu for React (cmdk)."],
  "context-menu": ["ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator", "Displays a menu located at the pointer, triggered by a right click."],
  "data-table": ["DataTable, Table", "Powerful table and datagrid built with TanStack Table."],
  "date-picker": ["DatePicker", "A text-field trigger + calendar popover, with label / helper text / error states. Composes Popover + Calendar."],
  drawer: ["Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter", "A drawer component for React, built on Vaul."],
  form: ["Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage", "Building forms with React Hook Form and Zod."],
  "input-group": ["InputGroup, InputGroupInput, InputGroupAddon, InputGroupText, InputGroupButton", "A bordered shell hosting an input plus fixed add-ons (icon, text, dropdown, button) on either side — the design source's Fixed Add-on pattern. Border, focus glow and invalid state apply to the whole group."],
  "input-otp": ["InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator", "Accessible one-time-password input with copy-paste."],
  "password-input": ["PasswordInput", "An InputGroup recipe — a password field with a show / hide toggle."],
  menubar: ["Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarSeparator", "A visually persistent menu common in desktop applications."],
  "navigation-menu": ["NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink", "A collection of links for navigating websites."],
  resizable: ["ResizablePanelGroup, ResizablePanel, ResizableHandle", "Accessible resizable panel groups and layouts."],
  sidebar: ["SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarInset", "A composable, themeable and customizable sidebar — uses `--sidebar-*` tokens."],
  "audio-player": ["AudioPlayer", "Native `<audio>` playback with a scrubber, time labels and transport controls. `variant=\"full\" | \"mini\"`."],
  "circular-progress": ["CircularProgress", "A ring progress indicator with an optional centre value."],
  image: ["Image", "A ratio-locked image with a muted loading placeholder and an error fallback (ratios 1:1 / 3:2 / 4:3 / 3:4 / 3:1 / 16:9)."],
  inform: ["Inform, informVariants", "A persistent, dismissible, intent-tinted inline notice with an optional action (variant: information | warning | success | error | action)."],

  rating: ["Rating", "A star rating input / display."],
  spinner: ["Spinner, spinnerVariants", "A lightweight loading indicator."],
  list: ["List, ListItem", "A composable list of rows — leading icon/avatar, title, description, trailing content."],
  stepper: ["Stepper", "A numbered multi-step progress indicator, horizontal or vertical."],
  fab: ["Fab, fabVariants", "A floating action button — circular or extended."],
  "tab-bar": ["TabBar, TabBarItem", "A mobile bottom navigation bar."],
  "navigation-bar": ["NavigationBar", "A mobile top app bar — back button, title, actions."],
  "file-upload": ["FileUpload, FileUploadItem", "A drag-and-drop zone plus file list, single or multiple."],

  "code-block": ["CodeBlock", "A code display with a copy button and, for more than one file, a tab strip."],
  metric: ["Metric", "A stat / KPI display — label, value, an optional trend indicator and an optional chart or icon slot."],
  "number-input": ["NumberInput", "A numeric field with increment / decrement controls."],
  quote: ["Quote", "A blockquote with an optional attributed author (name, title, avatar)."],
  footer: ["Footer, FooterColumn, FooterLink, FooterBottom", "A page footer shell — columns of nav links plus a bottom bar."],
  "table-of-contents": ["TableOfContents", "An anchor-link nav list with indent levels and an active-item state."],
};

const SOON = {};

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
npx @kinetixui/cli add ${slug}
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

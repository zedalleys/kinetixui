"use client";

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  AppBar,
  AppBarActions,
  AppBarBrand,
  AppBarLink,
  AppBarNav,
  Alert,
  AlertDescription,
  AlertTitle,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AspectRatio,
  Avatar,
  AvatarFallback,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  KinetixDirectionProvider,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Input,
  Label,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  RadioGroup,
  RadioGroupItem,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Slider,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  Toaster,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@kinetixui/ui";
import { Bold, Italic, Terminal, Underline } from "lucide-react";
import { Bell, Home, Mail, Plus, Search, Settings, User } from "lucide-react";
import { FabSpeedDial } from "@/examples/fab-speed-dial";

type Entry = { component: React.ComponentType; source: string };
const reg: Record<string, Entry> = {};
const add = (name: string, component: React.ComponentType, source: string) => {
  reg[name] = { component, source };
};

/* ---- design-source-native ---------------------------------------------- */
add("button-demo", () => <Button>Button</Button>, `<Button>Button</Button>`);
add(
  "button-variants",
  () => (
    <div className="flex flex-wrap items-center gap-3">
      {(["Primary", "Secondary", "Outline", "Destructive", "Ghost", "Link"] as const).map((v) => (
        <Button key={v} variant={v}>{v}</Button>
      ))}
    </div>
  ),
  `<Button variant="Primary">Primary</Button>\n<Button variant="Secondary">Secondary</Button>\n<Button variant="Outline">Outline</Button>\n<Button variant="Destructive">Destructive</Button>\n<Button variant="Ghost">Ghost</Button>\n<Button variant="Link">Link</Button>`,
);
add(
  "button-sizes",
  () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
  `<Button size="sm">Small</Button>\n<Button size="md">Medium</Button>\n<Button size="lg">Large</Button>`,
);
add(
  "input-demo",
  () => <Input placeholder="you@example.com" type="email" className="max-w-sm" />,
  `<Input type="email" placeholder="you@example.com" />`,
);
add(
  "input-states",
  () => (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <Input placeholder="Default" />
      <Input state="Error" defaultValue="Not quite right" aria-label="Username" />
      <Input state="Disabled" placeholder="Disabled" />
    </div>
  ),
  `<Input placeholder="Default" />\n<Input state="Error" defaultValue="Not quite right" aria-label="Username" />\n<Input state="Disabled" placeholder="Disabled" />`,
);
add(
  "textarea-demo",
  () => <Textarea placeholder="Type your message…" className="max-w-sm" />,
  `<Textarea placeholder="Type your message…" />`,
);

/* ---- ported ----------------------------------------------------------- */
add(
  "accordion-demo",
  () => (
    <Accordion type="single" collapsible className="w-full max-w-md">
      <AccordionItem value="a">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>Yes. It follows the WAI-ARIA design pattern.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="b">
        <AccordionTrigger>Is it themed?</AccordionTrigger>
        <AccordionContent>Yes — entirely from the KinetixUI token contract.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
  `<Accordion type="single" collapsible>\n  <AccordionItem value="a">\n    <AccordionTrigger>Is it accessible?</AccordionTrigger>\n    <AccordionContent>Yes. It follows the WAI-ARIA design pattern.</AccordionContent>\n  </AccordionItem>\n</Accordion>`,
);
add(
  "alert-demo",
  () => (
    <Alert className="max-w-md">
      <Terminal className="size-4" />
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
    </Alert>
  ),
  `<Alert>\n  <Terminal className="size-4" />\n  <AlertTitle>Heads up!</AlertTitle>\n  <AlertDescription>You can add components to your app using the CLI.</AlertDescription>\n</Alert>`,
);
add(
  "alert-dialog-demo",
  () => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="Outline">Delete account</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ),
  `<AlertDialog>\n  <AlertDialogTrigger asChild><Button variant="Outline">Delete account</Button></AlertDialogTrigger>\n  <AlertDialogContent>…</AlertDialogContent>\n</AlertDialog>`,
);
add(
  "aspect-ratio-demo",
  () => (
    <div className="w-[280px]">
      <AspectRatio ratio={16 / 9} className="rounded-md bg-muted" />
    </div>
  ),
  `<AspectRatio ratio={16 / 9} className="bg-muted rounded-md" />`,
);
add(
  "avatar-demo",
  () => (
    <Avatar>
      <AvatarFallback>KX</AvatarFallback>
    </Avatar>
  ),
  `<Avatar>\n  <AvatarImage src="/avatar.png" alt="@kinetixui" />\n  <AvatarFallback>KX</AvatarFallback>\n</Avatar>`,
);
add(
  "badge-demo",
  () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="destructive">Destructive</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="subtle">Subtle</Badge>
    </div>
  ),
  `<Badge>Default</Badge>\n<Badge variant="secondary">Secondary</Badge>\n<Badge variant="destructive">Destructive</Badge>\n<Badge variant="outline">Outline</Badge>\n<Badge variant="subtle">Subtle</Badge>`,
);
add(
  "breadcrumb-demo",
  () => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">Home</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/docs">Docs</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  ),
  `<Breadcrumb>\n  <BreadcrumbList>\n    <BreadcrumbItem><BreadcrumbLink href="/">Home</BreadcrumbLink></BreadcrumbItem>\n    <BreadcrumbSeparator />\n    <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>\n  </BreadcrumbList>\n</Breadcrumb>`,
);
add(
  "card-demo",
  () => (
    <Card className="w-[320px]">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one click.</CardDescription>
      </CardHeader>
      <CardContent>
        <Input placeholder="Project name" />
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="Outline" size="sm">Cancel</Button>
        <Button size="sm">Deploy</Button>
      </CardFooter>
    </Card>
  ),
  `<Card>\n  <CardHeader>\n    <CardTitle>Create project</CardTitle>\n    <CardDescription>Deploy your new project in one click.</CardDescription>\n  </CardHeader>\n  <CardContent>…</CardContent>\n  <CardFooter>…</CardFooter>\n</Card>`,
);
add(
  "checkbox-demo",
  () => (
    <div className="flex items-center gap-2">
      <Checkbox id="c1" defaultChecked />
      <Label htmlFor="c1">Accept terms and conditions</Label>
    </div>
  ),
  `<div className="flex items-center gap-2">\n  <Checkbox id="c1" />\n  <Label htmlFor="c1">Accept terms and conditions</Label>\n</div>`,
);
add(
  "collapsible-demo",
  () => (
    <Collapsible className="w-full max-w-md space-y-2">
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
  ),
  `<Collapsible>\n  <CollapsibleTrigger>Toggle</CollapsibleTrigger>\n  <CollapsibleContent>…</CollapsibleContent>\n</Collapsible>`,
);
add(
  "dialog-demo",
  () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="Outline">Edit profile</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription>Make changes to your profile here.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" defaultValue="KinetixUI" />
        </div>
        <DialogFooter>
          <Button>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
  `<Dialog>\n  <DialogTrigger asChild><Button variant="Outline">Edit profile</Button></DialogTrigger>\n  <DialogContent>…</DialogContent>\n</Dialog>`,
);
add(
  "dropdown-menu-demo",
  () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="Outline">Open</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-44">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Billing</DropdownMenuItem>
        <DropdownMenuItem>Team</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
  `<DropdownMenu>\n  <DropdownMenuTrigger asChild><Button variant="Outline">Open</Button></DropdownMenuTrigger>\n  <DropdownMenuContent>…</DropdownMenuContent>\n</DropdownMenu>`,
);
add(
  "hover-card-demo",
  () => (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="Link">@kinetixui</Button>
      </HoverCardTrigger>
      <HoverCardContent>One token architecture, in motion across every platform.</HoverCardContent>
    </HoverCard>
  ),
  `<HoverCard>\n  <HoverCardTrigger>@kinetixui</HoverCardTrigger>\n  <HoverCardContent>…</HoverCardContent>\n</HoverCard>`,
);
add(
  "label-demo",
  () => (
    <div className="flex items-center gap-2">
      <Checkbox id="terms" />
      <Label htmlFor="terms">Accept terms and conditions</Label>
    </div>
  ),
  `<Label htmlFor="email">Your email address</Label>`,
);
add(
  "pagination-demo",
  () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
        <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
        <PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem>
        <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
        <PaginationItem><PaginationEllipsis /></PaginationItem>
        <PaginationItem><PaginationNext href="#" /></PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
  `<Pagination>\n  <PaginationContent>\n    <PaginationItem><PaginationPrevious href="#" /></PaginationItem>\n    <PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem>\n    <PaginationItem><PaginationNext href="#" /></PaginationItem>\n  </PaginationContent>\n</Pagination>`,
);
add(
  "popover-demo",
  () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="Outline">Open popover</Button>
      </PopoverTrigger>
      <PopoverContent>
        <p className="text-sm font-medium">Dimensions</p>
        <p className="mt-1 text-sm text-muted-foreground">Set the dimensions for the layer.</p>
      </PopoverContent>
    </Popover>
  ),
  `<Popover>\n  <PopoverTrigger asChild><Button variant="Outline">Open popover</Button></PopoverTrigger>\n  <PopoverContent>…</PopoverContent>\n</Popover>`,
);
add(
  "progress-demo",
  () => {
    const [v, setV] = React.useState(13);
    React.useEffect(() => {
      const t = setTimeout(() => setV(66), 600);
      return () => clearTimeout(t);
    }, []);
    return <Progress value={v} aria-label="Upload progress" className="w-[60%]" />;
  },
  `const [value, setValue] = React.useState(13)\n// ...\n<Progress value={value} aria-label=\"Upload progress\" />`,
);
add(
  "radio-group-demo",
  () => (
    <RadioGroup defaultValue="comfortable">
      {["default", "comfortable", "compact"].map((v) => (
        <div key={v} className="flex items-center gap-2">
          <RadioGroupItem value={v} id={v} />
          <Label htmlFor={v} className="capitalize">{v}</Label>
        </div>
      ))}
    </RadioGroup>
  ),
  `<RadioGroup defaultValue="comfortable">\n  <div className="flex items-center gap-2">\n    <RadioGroupItem value="default" id="r1" />\n    <Label htmlFor="r1">Default</Label>\n  </div>\n</RadioGroup>`,
);
add(
  "scroll-area-demo",
  () => (
    <ScrollArea className="h-40 w-56 rounded-md border p-4 text-sm">
      {Array.from({ length: 20 }).map((_, i) => (
        <div key={i} className="py-1">Tag {i + 1}</div>
      ))}
    </ScrollArea>
  ),
  `<ScrollArea className="h-40 w-56 rounded-md border p-4">\n  {tags.map((t) => <div key={t}>{t}</div>)}\n</ScrollArea>`,
);
add(
  "select-demo",
  () => (
    <Select>
      <SelectTrigger className="w-[220px]" aria-label="Fruit">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="blueberry">Blueberry</SelectItem>
      </SelectContent>
    </Select>
  ),
  `<Select>\n  <SelectTrigger><SelectValue placeholder="Select a fruit" /></SelectTrigger>\n  <SelectContent>\n    <SelectItem value="apple">Apple</SelectItem>\n  </SelectContent>\n</Select>`,
);
add(
  "direction-provider-demo",
  () => {
    const [dir, setDir] = React.useState<"ltr" | "rtl">("rtl");
    return (
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <div className="flex gap-2">
          {(["ltr", "rtl"] as const).map((d) => (
            <Button key={d} size="sm" variant={dir === d ? "Primary" : "Outline"} onClick={() => setDir(d)}>
              {d.toUpperCase()}
            </Button>
          ))}
        </div>
        {/* `dir` on the element mirrors the layout; the provider is what makes Radix's own portaled
            content agree with it — without it the menu would open left-aligned in an RTL page. */}
        <KinetixDirectionProvider dir={dir}>
          <div dir={dir} className="flex w-full justify-start rounded-md border border-border p-4">
            <Select>
              <SelectTrigger className="w-[220px]" aria-label="Fruit">
                <SelectValue placeholder="Select a fruit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </KinetixDirectionProvider>
      </div>
    );
  },
  `<html dir={dir}>
  <KinetixDirectionProvider dir={dir}>
    <Select>
      <SelectTrigger><SelectValue placeholder="Select a fruit" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
      </SelectContent>
    </Select>
  </KinetixDirectionProvider>
</html>`,
);
add(
  "separator-demo",
  () => (
    <div className="text-sm">
      <div className="font-medium">KinetixUI</div>
      <div className="text-muted-foreground">One token architecture.</div>
      <Separator className="my-3" />
      <div className="flex h-5 items-center gap-3">
        <span>Docs</span>
        <Separator orientation="vertical" />
        <span>Components</span>
        <Separator orientation="vertical" />
        <span>Themes</span>
      </div>
    </div>
  ),
  `<Separator />\n<Separator orientation="vertical" />`,
);
add(
  "sheet-demo",
  () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="Outline">Open</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Edit profile</SheetTitle>
          <SheetDescription>Make changes to your profile here.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
  `<Sheet>\n  <SheetTrigger asChild><Button variant="Outline">Open</Button></SheetTrigger>\n  <SheetContent side="right">…</SheetContent>\n</Sheet>`,
);
add(
  "skeleton-demo",
  () => (
    <div className="flex items-center gap-3">
      <Skeleton className="size-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[160px]" />
      </div>
    </div>
  ),
  `<Skeleton className="size-12 rounded-full" />\n<Skeleton className="h-4 w-[200px]" />`,
);
add(
  "slider-demo",
  () => <Slider aria-label="Volume" defaultValue={[50]} max={100} step={1} className="w-[60%]" />,
  `<Slider aria-label="Volume" defaultValue={[50]} max={100} step={1} />`,
);
add(
  "sonner-demo",
  () => (
    <>
      <Toaster />
      <Button variant="Outline" onClick={() => toast("Event created", { description: "Sunday, December 03 at 9:00 AM" })}>
        Show toast
      </Button>
    </>
  ),
  `// app/layout.tsx\n<Toaster />\n\n// anywhere\ntoast("Event created", { description: "Sunday, December 03" })`,
);
add(
  "switch-demo",
  () => (
    <div className="flex items-center gap-2">
      <Switch id="airplane" />
      <Label htmlFor="airplane">Airplane mode</Label>
    </div>
  ),
  `<div className="flex items-center gap-2">\n  <Switch id="airplane" />\n  <Label htmlFor="airplane">Airplane mode</Label>\n</div>`,
);
add(
  "table-demo",
  () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[
          ["INV001", "Paid", "$250.00"],
          ["INV002", "Pending", "$150.00"],
          ["INV003", "Unpaid", "$350.00"],
        ].map((r) => (
          <TableRow key={r[0]}>
            <TableCell className="font-medium">{r[0]}</TableCell>
            <TableCell>{r[1]}</TableCell>
            <TableCell className="text-right">{r[2]}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
  `<Table>\n  <TableHeader>…</TableHeader>\n  <TableBody>\n    <TableRow><TableCell>INV001</TableCell>…</TableRow>\n  </TableBody>\n</Table>`,
);
add(
  "tabs-demo",
  () => (
    <Tabs defaultValue="account" className="w-[360px]">
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
  ),
  `<Tabs defaultValue="account">\n  <TabsList>\n    <TabsTrigger value="account">Account</TabsTrigger>\n    <TabsTrigger value="password">Password</TabsTrigger>\n  </TabsList>\n  <TabsContent value="account">…</TabsContent>\n</Tabs>`,
);
add(
  "toggle-demo",
  () => (
    <Toggle aria-label="Toggle italic">
      <Italic className="size-4" />
    </Toggle>
  ),
  `<Toggle aria-label="Toggle italic"><Italic className="size-4" /></Toggle>`,
);
add(
  "toggle-group-demo",
  () => (
    <ToggleGroup type="multiple">
      <ToggleGroupItem value="bold" aria-label="Bold"><Bold className="size-4" /></ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic"><Italic className="size-4" /></ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline"><Underline className="size-4" /></ToggleGroupItem>
    </ToggleGroup>
  ),
  `<ToggleGroup type="multiple">\n  <ToggleGroupItem value="bold"><Bold /></ToggleGroupItem>\n  <ToggleGroupItem value="italic"><Italic /></ToggleGroupItem>\n</ToggleGroup>`,
);
add(
  "tooltip-demo",
  () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="Outline">Hover</Button>
        </TooltipTrigger>
        <TooltipContent>Add to library</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
  `<TooltipProvider>\n  <Tooltip>\n    <TooltipTrigger asChild><Button variant="Outline">Hover</Button></TooltipTrigger>\n    <TooltipContent>Add to library</TooltipContent>\n  </Tooltip>\n</TooltipProvider>`,
);

/* ---- batch 2 ------------------------------------------------------------ */
import {
  Calendar,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  Command as Cmd,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  DataGrid,
  DataTable,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  Field,
  FieldControl,
  FieldDescription,
  FieldLabel,
  FieldMessage,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  Modal,
  PasswordInput,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Tag,
  AudioPlayer,
  CircularProgress,
  Image,
  Inform,
  Rating,
  Spinner,
  List,
  ListItem,
  Stepper,
  Fab,
  TabBar,
  TabBarItem,
  NavigationBar,
  FileUpload,
  DatePicker,
  AvatarGroup,
  CodeBlock,
  Metric,
  NumberInput,
  Quote,
  Footer,
  FooterColumn,
  FooterLink,
  FooterBottom,
  TableOfContents,
  Kbd,
  KbdGroup,
  JsonViewer,
  DiffViewer,
  ColorPicker,
  KanbanBoard,
  type KanbanColumn,
  MarkdownEditor,
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  ButtonGroup,
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
  DescriptionList,
  DescriptionListItem,
  Banner,
  SegmentedControl,
  SegmentedControlItem,
  Timeline,
  Marquee,
  ComparisonSlider,
  PageHeader,
  NotificationCenter,
  NotificationCenterTrigger,
  NotificationCenterContent,
  NotificationItem,
  TreeView,
  TreeItem,
  MultiSelect,
  MessageBubble,
  TypingIndicator,
  Tour,
  VirtualList,
} from "@kinetixui/ui";

add(
  "input-group-demo",
  () => (
    <div className="flex w-full max-w-sm flex-col gap-3">
      <InputGroup>
        <InputGroupText>https://</InputGroupText>
        <InputGroupInput placeholder="kinetixui.com" />
      </InputGroup>
      <InputGroup>
        <InputGroupAddon align="start">$</InputGroupAddon>
        <InputGroupInput placeholder="0.00" inputMode="decimal" />
        <InputGroupText>USD</InputGroupText>
      </InputGroup>
      <InputGroup>
        <InputGroupInput placeholder="Search components…" />
        <InputGroupButton>Search</InputGroupButton>
      </InputGroup>
    </div>
  ),
  `<InputGroup>\n  <InputGroupText>https://</InputGroupText>\n  <InputGroupInput placeholder="kinetixui.com" />\n</InputGroup>\n\n<InputGroup>\n  <InputGroupAddon align="start">$</InputGroupAddon>\n  <InputGroupInput placeholder="0.00" />\n  <InputGroupText>USD</InputGroupText>\n</InputGroup>`,
);
add(
  "password-input-demo",
  () => (
    <div className="w-full max-w-sm">
      <PasswordInput placeholder="••••••••" defaultValue="hunter2" />
    </div>
  ),
  `<PasswordInput placeholder="••••••••" />`,
);
add(
  "field-demo",
  () => {
    const [v, setV] = React.useState("");
    const invalid = v.length > 0 && !v.includes("@");
    return (
      <div className="w-full max-w-sm">
        <Field invalid={invalid}>
          <FieldLabel>Email</FieldLabel>
          <FieldControl>
            <Input value={v} onChange={(e) => setV(e.target.value)} placeholder="you@example.com" />
          </FieldControl>
          <FieldDescription>We&rsquo;ll only use it to send receipts.</FieldDescription>
          {invalid && <FieldMessage intent="error">Enter a valid email address.</FieldMessage>}
          {!invalid && v.includes("@") && <FieldMessage intent="success">Looks good.</FieldMessage>}
        </Field>
      </div>
    );
  },
  `<Field invalid={!!error}>\n  <FieldLabel>Email</FieldLabel>\n  <FieldControl><Input type="email" {...register("email")} /></FieldControl>\n  <FieldDescription>We'll only use it to send receipts.</FieldDescription>\n  {error && <FieldMessage intent="error">{error.message}</FieldMessage>}\n</Field>`,
);
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

add(
  "tag-demo",
  () => {
    const [tags, setTags] = React.useState(["design", "tokens", "figma"]);
    return (
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <Tag key={t} onRemove={() => setTags((cur) => cur.filter((x) => x !== t))}>
            {t}
          </Tag>
        ))}
        <Tag variant="secondary">secondary</Tag>
        <Tag variant="destructive">destructive</Tag>
        <Tag variant="warning">warning</Tag>
        <Tag variant="outline">outline</Tag>
      </div>
    );
  },
  `<Tag onRemove={() => remove(t)}>{t}</Tag>\n<Tag variant="secondary">secondary</Tag>\n<Tag variant="warning">warning</Tag>\n<Tag variant="outline">outline</Tag>`,
);
add(
  "modal-demo",
  () => (
    <div className="flex flex-wrap gap-3">
      {(["Info", "Confirmation", "Warning", "Destructive"] as const).map((type) => (
        <Modal
          key={type}
          type={type}
          title={`${type} dialog`}
          description="Dialog description text — this modal is the design-source composition (header · divider · body · divider · footer)."
          trigger={<Button variant="Outline">{type}</Button>}
        />
      ))}
    </div>
  ),
  `<Modal\n  type="Confirmation"\n  title="Are you sure?"\n  description="This action cannot be undone."\n  trigger={<Button variant="Outline">Delete</Button>}\n  onAction={handleDelete}\n/>`,
);

add(
  "calendar-demo",
  () => {
    // no initial value: seeding with `new Date()` would bake "today" into the
    // static build's server-rendered HTML, which then mismatches the client's
    // own "today" the moment a day passes without a rebuild.
    const [date, setDate] = React.useState<Date | undefined>();
    return <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />;
  },
  `const [date, setDate] = React.useState<Date>()\n<Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />`,
);
add(
  "carousel-demo",
  () => (
    <Carousel className="w-full max-w-xs">
      <CarouselContent>
        {Array.from({ length: 5 }).map((_, i) => (
          <CarouselItem key={i}>
            <div className="flex aspect-square items-center justify-center rounded-lg border bg-muted text-3xl font-semibold">
              {i + 1}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
  `<Carousel>\n  <CarouselContent>\n    {items.map((n) => <CarouselItem key={n}>{n}</CarouselItem>)}\n  </CarouselContent>\n  <CarouselPrevious />\n  <CarouselNext />\n</Carousel>`,
);
add(
  "chart-demo",
  () => {
    const data = [
      { month: "Jan", desktop: 186, mobile: 80 },
      { month: "Feb", desktop: 305, mobile: 200 },
      { month: "Mar", desktop: 237, mobile: 120 },
      { month: "Apr", desktop: 73, mobile: 190 },
      { month: "May", desktop: 209, mobile: 130 },
      { month: "Jun", desktop: 214, mobile: 140 },
    ];
    const config = {
      desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
      mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
    };
    return (
      <ChartContainer config={config} className="min-h-[240px] w-full">
        <BarChart accessibilityLayer data={data}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
          <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
        </BarChart>
      </ChartContainer>
    );
  },
  `const config = {\n  desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },\n  mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },\n}\n<ChartContainer config={config}>\n  <BarChart data={data}>\n    <CartesianGrid vertical={false} />\n    <XAxis dataKey="month" />\n    <ChartTooltip content={<ChartTooltipContent />} />\n    <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />\n  </BarChart>\n</ChartContainer>`,
);
add(
  "command-demo",
  () => (
    <Cmd className="max-w-[420px] rounded-lg border shadow-md">
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Suggestions">
          <CommandItem>Calendar</CommandItem>
          <CommandItem>Search Emoji</CommandItem>
          <CommandItem>Launch</CommandItem>
        </CommandGroup>
      </CommandList>
    </Cmd>
  ),
  `<Command>\n  <CommandInput placeholder="Type a command…" />\n  <CommandList>\n    <CommandEmpty>No results found.</CommandEmpty>\n    <CommandGroup heading="Suggestions">\n      <CommandItem>Calendar</CommandItem>\n    </CommandGroup>\n  </CommandList>\n</Command>`,
);
add(
  "combobox-demo",
  () => (
    <Cmd className="w-[240px] rounded-lg border">
      <CommandInput placeholder="Search framework…" />
      <CommandList>
        <CommandEmpty>No framework found.</CommandEmpty>
        <CommandGroup>
          {["Next.js", "SvelteKit", "Nuxt", "Remix", "Astro"].map((f) => (
            <CommandItem key={f}>{f}</CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Cmd>
  ),
  `// Popover + Command\n<Popover>\n  <PopoverTrigger asChild><Button variant="Outline">Select framework…</Button></PopoverTrigger>\n  <PopoverContent className="p-0">\n    <Command>…</Command>\n  </PopoverContent>\n</Popover>`,
);
add(
  "context-menu-demo",
  () => (
    <ContextMenu>
      <ContextMenuTrigger className="flex h-32 w-full max-w-64 items-center justify-center rounded-md border border-dashed text-sm">
        Right-click here
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem>Back</ContextMenuItem>
        <ContextMenuItem>Forward</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem>Reload</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  ),
  `<ContextMenu>\n  <ContextMenuTrigger>Right-click here</ContextMenuTrigger>\n  <ContextMenuContent>\n    <ContextMenuItem>Back</ContextMenuItem>\n  </ContextMenuContent>\n</ContextMenu>`,
);
add(
  "data-grid-demo",
  () => {
    const rows = React.useMemo(
      () =>
        Array.from({ length: 2000 }, (_, i) => ({
          id: i,
          name: `Item ${i + 1}`,
          category: ["Widgets", "Gadgets", "Gizmos"][i % 3],
          qty: (i * 7) % 500,
        })),
      [],
    );
    const [data, setData] = React.useState(rows);
    return (
      <DataGrid
        className="w-full"
        selectable
        height={280}
        data={data}
        getRowId={(row) => row.id}
        columns={[
          { id: "id", header: "ID", cell: (row) => row.id, value: (row) => row.id, sortable: true, width: 72, pinned: "left" },
          {
            id: "name",
            header: "Name",
            cell: (row) => row.name,
            value: (row) => row.name,
            sortable: true,
            editable: true,
            onCellEdit: (row, rowIndex, value) =>
              setData((prev) => prev.map((r, i) => (i === rowIndex ? { ...r, name: value } : r))),
          },
          { id: "category", header: "Category", cell: (row) => row.category, value: (row) => row.category, sortable: true },
          { id: "qty", header: "Qty", cell: (row) => row.qty, value: (row) => row.qty, sortable: true, width: 100 },
        ]}
      />
    );
  },
  `<DataGrid\n  selectable\n  height={280}\n  data={data}\n  getRowId={(row) => row.id}\n  columns={[\n    { id: "id", header: "ID", cell: (row) => row.id, value: (row) => row.id, sortable: true, pinned: "left" },\n    { id: "name", header: "Name", cell: (row) => row.name, value: (row) => row.name, editable: true, onCellEdit: updateName },\n    { id: "qty", header: "Qty", cell: (row) => row.qty, value: (row) => row.qty, sortable: true },\n  ]}\n/>`,
);
add(
  "data-table-demo",
  () => {
    const columns = [
      { accessorKey: "invoice", header: "Invoice" },
      { accessorKey: "status", header: "Status" },
      { accessorKey: "amount", header: "Amount" },
    ] as never;
    const data = [
      { invoice: "INV001", status: "Paid", amount: "$250.00" },
      { invoice: "INV002", status: "Pending", amount: "$150.00" },
      { invoice: "INV003", status: "Unpaid", amount: "$350.00" },
    ];
    return <DataTable columns={columns} data={data} pageSize={5} />;
  },
  `const columns: ColumnDef<Invoice>[] = [\n  { accessorKey: "invoice", header: "Invoice" },\n  { accessorKey: "amount", header: "Amount" },\n]\n<DataTable columns={columns} data={data} />`,
);
add(
  "date-picker-demo",
  () => {
    const [date, setDate] = React.useState<Date | undefined>();
    return (
      <DatePicker
        label="Appointment date"
        value={date}
        onChange={setDate}
        helperText="Choose a weekday"
        className="w-[280px]"
      />
    );
  },
  `<DatePicker\n  label="Appointment date"\n  value={date}\n  onChange={setDate}\n  helperText="Choose a weekday"\n/>`,
);
add(
  "drawer-demo",
  () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="Outline">Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Move goal</DrawerTitle>
            <DrawerDescription>Set your daily activity goal.</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <Button>Submit</Button>
            <DrawerClose asChild>
              <Button variant="Outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  ),
  `<Drawer>\n  <DrawerTrigger asChild><Button variant="Outline">Open Drawer</Button></DrawerTrigger>\n  <DrawerContent>…</DrawerContent>\n</Drawer>`,
);
add(
  "form-demo",
  () => (
    <form className="w-full max-w-sm space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid gap-2">
        <label htmlFor="fd-user" className="text-sm font-medium">Username</label>
        <Input id="fd-user" placeholder="kinetixui" />
        <p className="text-sm text-muted-foreground">This is your public display name.</p>
      </div>
      <Button type="submit">Submit</Button>
    </form>
  ),
  `const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) })\n\n<Form {...form}>\n  <form onSubmit={form.handleSubmit(onSubmit)}>\n    <FormField control={form.control} name="username" render={({ field }) => (\n      <FormItem>\n        <FormLabel>Username</FormLabel>\n        <FormControl><Input {...field} /></FormControl>\n        <FormMessage />\n      </FormItem>\n    )} />\n    <Button type="submit">Submit</Button>\n  </form>\n</Form>`,
);
add(
  "input-otp-demo",
  () => (
    <InputOTP maxLength={6} aria-label="One-time code">
      <InputOTPGroup>
        {Array.from({ length: 6 }).map((_, i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  ),
  `<InputOTP maxLength={6} aria-label=\"One-time code\">\n  <InputOTPGroup>\n    <InputOTPSlot index={0} />\n    ...\n    <InputOTPSlot index={5} />\n  </InputOTPGroup>\n</InputOTP>`,
);
add(
  "menubar-demo",
  () => (
    <Menubar>
      <MenubarMenu>
        <MenubarTrigger>File</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>New Tab</MenubarItem>
          <MenubarItem>New Window</MenubarItem>
          <MenubarSeparator />
          <MenubarItem>Share</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
      <MenubarMenu>
        <MenubarTrigger>Edit</MenubarTrigger>
        <MenubarContent>
          <MenubarItem>Undo</MenubarItem>
          <MenubarItem>Redo</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  ),
  `<Menubar>\n  <MenubarMenu>\n    <MenubarTrigger>File</MenubarTrigger>\n    <MenubarContent>\n      <MenubarItem>New Tab</MenubarItem>\n    </MenubarContent>\n  </MenubarMenu>\n</Menubar>`,
);
add(
  "navigation-menu-demo",
  () => (
    <NavigationMenu>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>
          <NavigationMenuContent>
            <div className="grid w-[320px] gap-2 p-4 text-sm">
              <NavigationMenuLink className="rounded-md p-2 hover:bg-accent">Introduction</NavigationMenuLink>
              <NavigationMenuLink className="rounded-md p-2 hover:bg-accent">Installation</NavigationMenuLink>
              <NavigationMenuLink className="rounded-md p-2 hover:bg-accent">Theming</NavigationMenuLink>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  ),
  `<NavigationMenu>\n  <NavigationMenuList>\n    <NavigationMenuItem>\n      <NavigationMenuTrigger>Getting started</NavigationMenuTrigger>\n      <NavigationMenuContent>…</NavigationMenuContent>\n    </NavigationMenuItem>\n  </NavigationMenuList>\n</NavigationMenu>`,
);
add(
  "resizable-demo",
  () => (
    <ResizablePanelGroup direction="horizontal" className="max-w-md rounded-lg border">
      <ResizablePanel defaultSize={50}>
        <div className="flex h-32 items-center justify-center p-6 text-sm">One</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <div className="flex h-32 items-center justify-center p-6 text-sm">Two</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
  `<ResizablePanelGroup direction="horizontal">\n  <ResizablePanel defaultSize={50}>One</ResizablePanel>\n  <ResizableHandle withHandle />\n  <ResizablePanel defaultSize={50}>Two</ResizablePanel>\n</ResizablePanelGroup>`,
);
add(
  "sidebar-demo",
  () => (
    <div className="w-full rounded-lg border p-4 text-sm text-muted-foreground">
      The <code className="text-foreground">Sidebar</code> is a full-page layout primitive
      (<code className="text-foreground">SidebarProvider</code> + <code className="text-foreground">SidebarInset</code>).
      See the code tab for a minimal shell; it themes from the <code className="text-foreground">--sidebar-*</code> tokens.
    </div>
  ),
  `<SidebarProvider>\n  <Sidebar>\n    <SidebarHeader>…</SidebarHeader>\n    <SidebarContent>\n      <SidebarGroup>\n        <SidebarMenu>\n          <SidebarMenuItem>\n            <SidebarMenuButton isActive>Home</SidebarMenuButton>\n          </SidebarMenuItem>\n        </SidebarMenu>\n      </SidebarGroup>\n    </SidebarContent>\n  </Sidebar>\n  <SidebarInset>\n    <SidebarTrigger />\n    {/* page content */}\n  </SidebarInset>\n</SidebarProvider>`,
);

/* ---- batch 3 — additional gap-fill components ------------------------ */
const SAMPLE_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

add(
  "audio-player-demo",
  () => (
    <div className="flex w-full max-w-[380px] flex-col gap-6">
      <AudioPlayer src={SAMPLE_AUDIO} title="SoundHelix Song 1" artist="T. Schürger" />
      <AudioPlayer variant="mini" src={SAMPLE_AUDIO} title="SoundHelix Song 1" artist="T. Schürger" />
    </div>
  ),
  `<AudioPlayer src="/audio/song.mp3" title="Song 1" artist="Artist" />\n\n<AudioPlayer variant="mini" src="/audio/song.mp3" title="Song 1" artist="Artist" />`,
);
add(
  "circular-progress-demo",
  () => {
    const [v, setV] = React.useState(25);
    React.useEffect(() => {
      const t = setInterval(() => setV((c) => (c >= 100 ? 25 : c + 5)), 400);
      return () => clearInterval(t);
    }, []);
    return (
      <div className="flex items-center gap-6">
        <CircularProgress value={v} showValue aria-label="Upload progress" />
        <CircularProgress value={v} size={64} strokeWidth={6} showValue aria-label="Upload progress" />
        <CircularProgress value={v} aria-label="Upload progress" />
      </div>
    );
  },
  `<CircularProgress value={66} showValue />\n<CircularProgress value={66} size={64} strokeWidth={6} showValue />`,
);
add(
  "image-demo",
  () => (
    <div className="grid w-full max-w-md grid-cols-3 gap-3">
      <Image ratio="1:1" src="https://picsum.photos/seed/kx1/400" alt="" />
      <Image ratio="4:3" src="https://picsum.photos/seed/kx2/400/300" alt="" />
      <Image ratio="3:4" src="https://picsum.photos/seed/kx3/300/400" alt="" />
    </div>
  ),
  `<Image ratio="1:1" src="/photo.jpg" alt="" />\n<Image ratio="4:3" src="/photo.jpg" alt="" />\n<Image ratio="16:9" src="/photo.jpg" alt="" rounded={false} />`,
);
add(
  "inform-demo",
  () => (
    <div className="flex w-full max-w-md flex-col gap-3">
      <Inform variant="information" onDismiss={() => {}}>
        A new software update is available.
      </Inform>
      <Inform variant="success">Your changes have been saved.</Inform>
      <Inform variant="warning">Your subscription expires in 3 days.</Inform>
      <Inform variant="error" action={{ label: "Retry" }}>
        We couldn&rsquo;t process your payment.
      </Inform>
    </div>
  ),
  `<Inform variant="information" onDismiss={close}>\n  A new software update is available.\n</Inform>\n\n<Inform variant="error" action={{ label: "Retry", onClick: retry }}>\n  We couldn't process your payment.\n</Inform>`,
);

/* ---- batch 4 — mobile-pattern gap-fill components --------------------- */
add(
  "rating-demo",
  () => {
    const [v, setV] = React.useState(3);
    return (
      <div className="flex flex-col gap-3">
        <Rating value={v} onChange={setV} />
        <Rating value={4} readOnly size="sm" />
      </div>
    );
  },
  `<Rating value={value} onChange={setValue} />\n<Rating value={4} readOnly size="sm" />`,
);
add(
  "spinner-demo",
  () => (
    <div className="flex items-center gap-4">
      <Spinner size="sm" />
      <Spinner />
      <Spinner size="lg" />
    </div>
  ),
  `<Spinner size="sm" />\n<Spinner />\n<Spinner size="lg" />`,
);
add(
  "list-demo",
  () => (
    <List className="w-full max-w-sm rounded-md border">
      <ListItem leading={<User className="size-5 text-muted-foreground" />} title="Profile" description="Name, photo, and personal details" trailing={<Badge variant="outline">2</Badge>} onSelect={() => {}} />
      <ListItem leading={<Bell className="size-5 text-muted-foreground" />} title="Notifications" description="Push, email and SMS preferences" trailing={<Switch aria-label="Notifications" />} />
      <ListItem leading={<Settings className="size-5 text-muted-foreground" />} title="Settings" onSelect={() => {}} />
    </List>
  ),
  `<List>\n  <ListItem\n    leading={<User />}\n    title="Profile"\n    description="Name, photo, and personal details"\n    onSelect={() => router.push("/profile")}\n  />\n  <ListItem leading={<Bell />} title="Notifications" trailing={<Switch aria-label="Notifications" />} />\n</List>`,
);
add(
  "stepper-demo",
  () => (
    <div className="flex w-full max-w-lg flex-col gap-8">
      <Stepper
        current={1}
        steps={[{ label: "Account" }, { label: "Profile" }, { label: "Review" }]}
      />
      <Stepper
        orientation="vertical"
        current={1}
        steps={[
          { label: "Order placed", description: "We've received your order." },
          { label: "Processing", description: "Your order is being prepared." },
          { label: "Shipped", description: "On its way to you." },
        ]}
      />
    </div>
  ),
  `<Stepper\n  current={1}\n  steps={[{ label: "Account" }, { label: "Profile" }, { label: "Review" }]}\n/>`,
);
add(
  "fab-demo",
  () => (
    <div className="flex items-center gap-4">
      <Fab aria-label="Add">
        <Plus />
      </Fab>
      <Fab extended>
        <Plus />
        New item
      </Fab>
      <Fab variant="Secondary" size="sm" aria-label="Add">
        <Plus />
      </Fab>
    </div>
  ),
  `<Fab aria-label="Add">\n  <Plus />\n</Fab>\n\n<Fab extended>\n  <Plus />\n  New item\n</Fab>`,
);
// The Code tab shows the whole example file; fab-speed-dial.test.tsx fails if this copy drifts from it.
add(
  "fab-speed-dial",
  FabSpeedDial,
  String.raw`"use client";

import * as React from "react";
import { Fab } from "@kinetixui/ui";
import { Camera, FileUp, FolderPlus, Image as ImageIcon, Plus } from "lucide-react";

/**
 * A speed dial: one Fab that opens a short list of related actions.
 *
 * Motion, open: the Plus turns into a close mark while each action's disc pulls out of the Fab and travels to its
 * row, the furthest leaving first. A gooey SVG filter on a decorative layer keeps each disc joined to the Fab by a
 * stretching neck until it breaks away. Once a disc lands its icon fades in, then the labels slide out from
 * behind the discs, nearest first. Closing plays it back faster. Every timing is a motion token or a fraction of
 * one; only transform and opacity animate; with reduced motion everything lands in its final state at once.
 *
 * The decorative layer is aria-hidden and ignores the pointer. The real controls are a Fab with aria-expanded and
 * a list of ordinary buttons, named by their visible labels, reachable with Tab in order from the Fab outward.
 * Escape, a click outside or choosing an action closes the list and returns focus to the Fab.
 *
 * Centred like the reference from the sm breakpoint up; on narrow screens the Fab moves to the inline start so the
 * labels get the whole width to wrap into.
 */
const ACTIONS = [
  // nearest the Fab first: this is both the reading order and the Tab order
  { label: "Upload file", icon: FileUp },
  { label: "Create folder", icon: FolderPlus },
  { label: "Photo template", icon: ImageIcon },
  { label: "Take photo or video", icon: Camera },
];

// one stagger step, derived from the motion tokens so the choreography scales with them
const step = (n: number) => "calc(var(--duration-instant) * " + 0.6 * n + ")";
const after = (token: string, n: number) => "calc(var(" + token + ") + var(--duration-instant) * " + 0.6 * n + ")";

export function FabSpeedDial() {
  const [open, setOpen] = React.useState(false);
  const [last, setLast] = React.useState<string | null>(null);
  // how far each disc sits above the Fab's centre, measured, so wrapped labels and 200% text stay aligned
  const [rise, setRise] = React.useState<number[]>(() => ACTIONS.map(() => 0));
  const rootRef = React.useRef<HTMLDivElement>(null);
  const fabRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const discRefs = React.useRef<(HTMLSpanElement | null)[]>([]);
  const listId = React.useId();
  const gooId = "kx-goo-" + listId.replace(/[^a-zA-Z0-9]/g, "");

  React.useLayoutEffect(() => {
    const measure = () => {
      const fab = fabRef.current?.getBoundingClientRect();
      if (!fab) return;
      const centre = fab.top + fab.height / 2;
      setRise(
        discRefs.current.map((disc) => {
          const r = disc?.getBoundingClientRect();
          return r ? centre - (r.top + r.height / 2) : 0;
        }),
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined" || !listRef.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(listRef.current);
    return () => observer.disconnect();
  }, []);

  const close = React.useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) fabRef.current?.focus();
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const lastIndex = ACTIONS.length - 1;

  return (
    <div
      ref={rootRef}
      className="relative isolate grid w-full grid-cols-[0_auto_1fr] items-end gap-y-3 py-2 sm:grid-cols-[1fr_auto_1fr]"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          close(true);
        }
      }}
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) close(false);
      }}
    >
      <svg aria-hidden="true" className="absolute size-0">
        <defs>
          <filter id={gooId}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix in="blur" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8" result="goo" />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <div className="relative col-start-2 row-start-2">
        {/* Decorative: the discs that travel. The buttons below sit exactly on top of where they land. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 left-1/2 z-0 w-28 -translate-x-1/2 forced-colors:hidden"
          style={{ height: "calc(" + Math.max(...rise) + "px + 5.5rem)", filter: "url(#" + gooId + ")" }}
        >
          <span className="absolute bottom-0 left-1/2 -ml-7 size-14 rounded-full bg-action" />
          {ACTIONS.map((action, i) => (
            <span
              key={action.label}
              className="absolute bottom-1.5 left-1/2 -ml-[1.375rem] size-11 rounded-full bg-action transition-transform motion-reduce:transition-none"
              style={{
                transform: open ? "translateY(" + -rise[i] + "px)" : "translateY(0)",
                transitionDuration: open ? "var(--duration-slow)" : "var(--duration-base)",
                transitionTimingFunction: open ? "var(--easing-emphasized)" : "var(--easing-exit)",
                transitionDelay: open ? step(lastIndex - i) : after("--duration-fast", i * 0.5),
              }}
            />
          ))}
        </div>
        <Fab
          ref={fabRef}
          aria-label="Create"
          aria-expanded={open}
          aria-controls={listId}
          className="relative z-10"
          onClick={() => setOpen((o) => !o)}
        >
          <Plus
            className={"transition-transform motion-reduce:transition-none " + (open ? "rotate-45" : "rotate-0")}
            style={{ transitionDuration: "var(--duration-base)", transitionTimingFunction: "var(--easing-emphasized)" }}
          />
        </Fab>
      </div>

      <ul
        id={listId}
        ref={listRef}
        aria-label="Create"
        className={
          "relative z-10 col-span-2 col-start-2 row-start-1 flex flex-col-reverse gap-3 justify-self-start ps-1.5 " +
          "transition-[visibility] motion-reduce:transition-none " +
          (open ? "visible" : "invisible")
        }
        // hidden only once the closing motion has played, so nothing vanishes mid-animation
        style={{ transitionDelay: open ? "0s" : "calc(var(--duration-fast) + var(--duration-base))" }}
      >
        {ACTIONS.map((action, i) => {
          const Icon = action.icon;
          return (
            <li key={action.label}>
              <button
                type="button"
                className="group flex items-center rounded-[1.375rem] text-start outline-none focus-visible:shadow-focus forced-colors:focus-visible:[outline:2px_solid_Highlight]"
                onClick={() => {
                  setLast(action.label);
                  close(true);
                }}
              >
                <span
                  ref={(el) => {
                    discRefs.current[i] = el;
                  }}
                  className={
                    "relative z-10 grid size-11 shrink-0 place-items-center rounded-full bg-action text-action-foreground " +
                    "transition-[opacity,transform] group-hover:bg-action/90 group-active:bg-action/85 motion-reduce:transition-none " +
                    "forced-colors:border forced-colors:border-[ButtonText] [&_svg]:size-5 " +
                    (open ? "scale-100 opacity-100" : "scale-75 opacity-0")
                  }
                  style={{
                    transitionDuration: open ? "var(--duration-fast)" : "var(--duration-instant)",
                    transitionTimingFunction: open ? "var(--easing-enter)" : "var(--easing-exit)",
                    transitionDelay: open ? after("--duration-base", (lastIndex - i) * 0.5) : step(0.5),
                  }}
                >
                  <Icon aria-hidden="true" />
                </span>
                {/* the label slides out from behind the disc; the clip is what makes it emerge rather than fade */}
                <span className="-ms-2 overflow-hidden py-1 pe-2">
                  <span
                    className={
                      "block rounded-[1.125rem] bg-card py-2 pe-4 ps-5 text-body-md font-medium text-card-foreground shadow-sm " +
                      "transition-[opacity,transform] group-hover:bg-muted motion-reduce:transition-none " +
                      "forced-colors:border forced-colors:border-[ButtonText] " +
                      (open ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 rtl:translate-x-full")
                    }
                    style={{
                      transitionDuration: open ? "var(--duration-base)" : "var(--duration-fast)",
                      transitionTimingFunction: open ? "var(--easing-enter)" : "var(--easing-exit)",
                      // starts once the nearest disc is opaque, so the label never shows through it
                      transitionDelay: open ? after("--duration-slow", 2 + i) : "0s",
                    }}
                  >
                    {action.label}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p role="status" className="col-span-3 row-start-3 min-h-6 text-center text-body-md text-muted-foreground">
        {last ? "Last action: " + last : ""}
      </p>
    </div>
  );
}`,
);
add(
  "tab-bar-demo",
  () => {
    const [active, setActive] = React.useState("home");
    const items = [
      { key: "home", icon: <Home />, label: "Home" },
      { key: "search", icon: <Search />, label: "Search" },
      { key: "mail", icon: <Mail />, label: "Mail", badge: 3 },
      { key: "profile", icon: <User />, label: "Profile" },
    ];
    return (
      <TabBar className="w-full max-w-sm rounded-md">
        {items.map((it) => (
          <TabBarItem key={it.key} icon={it.icon} label={it.label} badge={it.badge} active={active === it.key} onClick={() => setActive(it.key)} />
        ))}
      </TabBar>
    );
  },
  `<TabBar>\n  <TabBarItem icon={<Home />} label="Home" active={tab === "home"} onClick={() => setTab("home")} />\n  <TabBarItem icon={<Mail />} label="Mail" badge={3} active={tab === "mail"} onClick={() => setTab("mail")} />\n</TabBar>`,
);
add(
  "navigation-bar-demo",
  () => (
    <NavigationBar
      className="w-full max-w-md rounded-md"
      title="Appointments"
      infoText="3 upcoming"
      onBack={() => {}}
      actions={
        <Button type="button" variant="Ghost" size="icon" aria-label="Search" className="size-9 rounded-full p-0">
          <Search aria-hidden />
        </Button>
      }
    />
  ),
  `<NavigationBar\n  title="Appointments"\n  infoText="3 upcoming"\n  onBack={() => router.back()}\n  actions={<Button variant="Ghost" size="icon"><Search /></Button>}\n/>`,
);
add(
  "app-bar-demo",
  () => (
    <AppBar className="w-full max-w-2xl rounded-md border">
      <AppBarBrand>
        <span className="grid size-6 place-items-center rounded bg-primary text-body-sm font-bold text-primary-foreground">
          A
        </span>
        Acme
      </AppBarBrand>
      <AppBarNav>
        <AppBarLink href="#" active>
          Overview
        </AppBarLink>
        <AppBarLink href="#">Reports</AppBarLink>
        <AppBarLink href="#">Team</AppBarLink>
      </AppBarNav>
      <AppBarActions>
        <Button type="button" variant="Ghost" size="icon" aria-label="Notifications" className="size-9 p-0 text-muted-foreground hover:text-foreground">
          <Bell aria-hidden />
        </Button>
        <span className="grid size-8 place-items-center rounded-full bg-muted text-xs font-medium">KZ</span>
      </AppBarActions>
    </AppBar>
  ),
  `<AppBar>\n  <AppBarBrand>Acme</AppBarBrand>\n  <AppBarNav>\n    <AppBarLink href="/" active>Overview</AppBarLink>\n    <AppBarLink href="/reports">Reports</AppBarLink>\n    <AppBarLink href="/team">Team</AppBarLink>\n  </AppBarNav>\n  <AppBarActions>\n    <Button variant="Ghost" size="icon"><Bell /></Button>\n    <Avatar>…</Avatar>\n  </AppBarActions>\n</AppBar>`,
);
add(
  "file-upload-demo",
  () => {
    const [files, setFiles] = React.useState([
      { id: "1", name: "passport-scan.pdf", size: 245_000, status: "uploaded" as const },
      { id: "2", name: "photo.png", size: 1_200_000, status: "error" as const, error: "File exceeds 1 MB limit" },
    ]);
    return (
      <FileUpload
        className="w-full max-w-sm"
        multiple
        helperText="PDF, PNG up to 5 MB"
        files={files}
        onFilesSelected={(picked) =>
          setFiles((f) => [...f, ...picked.map((p, i) => ({ id: `new-${i}-${p.name}`, name: p.name, size: p.size, status: "uploaded" as const }))])
        }
        onRemove={(id) => setFiles((f) => f.filter((x) => x.id !== id))}
      />
    );
  },
  `<FileUpload\n  multiple\n  files={files}\n  onFilesSelected={(picked) => upload(picked)}\n  onRemove={(id) => removeFile(id)}\n/>`,
);
add(
  "avatar-group-demo",
  () => (
    <AvatarGroup max={3}>
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>AK</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>MO</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>RS</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>TL</AvatarFallback>
      </Avatar>
    </AvatarGroup>
  ),
  `<AvatarGroup max={3}>\n  <Avatar><AvatarFallback>JD</AvatarFallback></Avatar>\n  <Avatar><AvatarFallback>AK</AvatarFallback></Avatar>\n  <Avatar><AvatarFallback>MO</AvatarFallback></Avatar>\n</AvatarGroup>`,
);

/* ---- batch 5 — web-pattern gap-fill components -------------------------- */
add(
  "code-block-demo",
  () => (
    <CodeBlock
      className="w-full max-w-lg"
      filename="button.tsx"
      code={`export function Button({ children }) {\n  return <button className="btn">{children}</button>;\n}`}
    />
  ),
  `<CodeBlock filename="button.tsx" code={source} />`,
);
add(
  "metric-demo",
  () => (
    /* `sm-rem` rather than a hard `grid-cols-2`: two columns at every width put each card in 66px of a
       320px screen at the reader's doubled text size, which is less than one word of its own content. The
       column count follows the reader's measured width, the way the dashboard scene and the stat-cards
       block already do, so the demo also shows the layout someone should copy. */
    <div className="grid w-full max-w-lg grid-cols-1 gap-4 sm-rem:grid-cols-2">
      <Metric label="Active users" value="2,420" trend="up" change="12%" />
      <Metric label="Churn rate" value="1.2%" trend="down" change="0.3%" />
    </div>
  ),
  `<Metric label="Active users" value="2,420" trend="up" change="12%" />`,
);
add(
  "number-input-demo",
  () => {
    const [v, setV] = React.useState(2);
    return <NumberInput aria-label="Quantity" value={v} onChange={setV} min={0} max={10} className="w-32" />;
  },
  `<NumberInput aria-label=\"Quantity\" value={qty} onChange={setQty} min={0} max={10} />`,
);
add(
  "quote-demo",
  () => (
    <Quote
      className="max-w-md"
      author="Amira K."
      authorTitle="Product Designer"
      avatar={
        <Avatar>
          <AvatarFallback>AK</AvatarFallback>
        </Avatar>
      }
    >
      This is exactly the token workflow our team needed.
    </Quote>
  ),
  `<Quote author="Amira K." authorTitle="Product Designer" avatar={<Avatar>...</Avatar>}>\n  This is exactly the token workflow our team needed.\n</Quote>`,
);
add(
  "footer-demo",
  () => (
    <Footer className="w-full max-w-lg rounded-md">
      <div className="grid grid-cols-2 gap-6">
        <FooterColumn title="Product">
          <FooterLink href="#">Overview</FooterLink>
          <FooterLink href="#">Pricing</FooterLink>
        </FooterColumn>
        <FooterColumn title="Company">
          <FooterLink href="#">About</FooterLink>
          <FooterLink href="#">Careers</FooterLink>
        </FooterColumn>
      </div>
      <FooterBottom>
        <span>© 2026 Acme Inc.</span>
        <div className="flex gap-3">
          <FooterLink href="#">Privacy</FooterLink>
          <FooterLink href="#">Terms</FooterLink>
        </div>
      </FooterBottom>
    </Footer>
  ),
  `<Footer>\n  <div className="grid grid-cols-2 gap-6">\n    <FooterColumn title="Product">\n      <FooterLink href="/pricing">Pricing</FooterLink>\n    </FooterColumn>\n  </div>\n  <FooterBottom>© 2026 Acme Inc.</FooterBottom>\n</Footer>`,
);
add(
  "table-of-contents-demo",
  () => (
    <TableOfContents
      className="w-full max-w-xs"
      active="props"
      items={[
        { id: "overview", label: "Overview", level: 1 },
        { id: "installation", label: "Installation", level: 1 },
        { id: "usage", label: "Usage", level: 1 },
        { id: "props", label: "Props", level: 2 },
        { id: "examples", label: "Examples", level: 2 },
      ]}
    />
  ),
  `<TableOfContents\n  active={activeId}\n  items={[{ id: "overview", label: "Overview" }, { id: "props", label: "Props", level: 2 }]}\n/>`,
);
add(
  "kbd-demo",
  () => (
    <div className="flex items-center gap-4">
      <Kbd>⏎</Kbd>
      <KbdGroup>
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </KbdGroup>
    </div>
  ),
  `<Kbd>⏎</Kbd>\n<KbdGroup>\n  <Kbd>⌘</Kbd>\n  <Kbd>K</Kbd>\n</KbdGroup>`,
);
add(
  "json-viewer-demo",
  () => (
    <JsonViewer
      className="w-full max-w-md"
      data={{
        name: "kinetixui",
        version: "0.11.0",
        platforms: ["react", "swiftui", "compose", "flutter"],
        stable: false,
        tokens: { spacing: 8, radius: { sm: 4, md: 8 } },
        deprecated: null,
      }}
    />
  ),
  `<JsonViewer\n  data={{\n    name: "kinetixui",\n    version: "0.11.0",\n    platforms: ["react", "swiftui", "compose", "flutter"],\n    stable: false,\n  }}\n/>`,
);
add(
  "diff-viewer-demo",
  () => (
    <DiffViewer
      className="w-full max-w-md"
      mode="split"
      oldText={'{\n  "name": "kinetixui",\n  "version": "0.10.0",\n  "private": true\n}'}
      newText={'{\n  "name": "kinetixui",\n  "version": "0.11.0",\n  "stable": false\n}'}
    />
  ),
  `<DiffViewer\n  mode="split"\n  oldText={before}\n  newText={after}\n/>`,
);
add(
  "color-picker-demo",
  () => {
    const [color, setColor] = React.useState("#3b82f6");
    return (
      <ColorPicker
        value={color}
        onValueChange={setColor}
        swatches={["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"]}
      />
    );
  },
  `<ColorPicker\n  value={color}\n  onValueChange={setColor}\n  swatches={["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"]}\n/>`,
);
add(
  "kanban-board-demo",
  () => {
    const [columns, setColumns] = React.useState<KanbanColumn[]>([
      {
        id: "todo",
        title: "To Do",
        cards: [
          { id: "1", content: "Design the onboarding flow" },
          { id: "2", content: "Write API docs for /r/registry.json" },
        ],
      },
      {
        id: "in-progress",
        title: "In Progress",
        cards: [{ id: "3", content: "Port ColorPicker to Compose" }],
      },
      {
        id: "done",
        title: "Done",
        cards: [
          { id: "4", content: "Ship DiffViewer" },
          { id: "5", content: "Ship JsonViewer" },
        ],
      },
    ]);
    return <KanbanBoard columns={columns} onColumnsChange={setColumns} className="w-full" />;
  },
  `<KanbanBoard\n  columns={columns}\n  onColumnsChange={setColumns}\n/>`,
);
add(
  "markdown-editor-demo",
  () => {
    const [text, setText] = React.useState(
      "## Release notes\n\nShipped **MarkdownEditor** — a toolbar over a plain textarea, not `contenteditable`.\n\n- Bold, italic, links\n- Bulleted and numbered lists\n- An optional preview pane",
    );
    return <MarkdownEditor aria-label="Release notes" className="w-full" value={text} onValueChange={setText} rows={8} />;
  },
  `<MarkdownEditor\n  value={text}\n  onValueChange={setText}\n  rows={8}\n/>`,
);
add(
  "empty-demo",
  () => (
    <Empty className="w-full max-w-sm rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Search />
        </EmptyMedia>
        <EmptyTitle>No results found</EmptyTitle>
        <EmptyDescription>Try adjusting your search or filters.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="Outline" size="sm">
          Clear filters
        </Button>
      </EmptyContent>
    </Empty>
  ),
  `<Empty>\n  <EmptyHeader>\n    <EmptyMedia variant="icon"><Search /></EmptyMedia>\n    <EmptyTitle>No results found</EmptyTitle>\n    <EmptyDescription>Try adjusting your search or filters.</EmptyDescription>\n  </EmptyHeader>\n  <EmptyContent>\n    <Button variant="Outline" size="sm">Clear filters</Button>\n  </EmptyContent>\n</Empty>`,
);

add(
  "button-group-demo",
  () => (
    <ButtonGroup>
      <Button variant="Outline" size="icon" aria-label="Bold">
        <Bold />
      </Button>
      <Button variant="Outline" size="icon" aria-label="Italic">
        <Italic />
      </Button>
      <Button variant="Outline" size="icon" aria-label="Underline">
        <Underline />
      </Button>
    </ButtonGroup>
  ),
  `<ButtonGroup>\n  <Button variant="Outline" size="icon"><Bold /></Button>\n  <Button variant="Outline" size="icon"><Italic /></Button>\n  <Button variant="Outline" size="icon"><Underline /></Button>\n</ButtonGroup>`,
);
add(
  "native-select-demo",
  () => (
    <NativeSelect aria-label="Fruit" className="max-w-xs" defaultValue="">
      <NativeSelectOption value="" disabled>
        Select a fruit…
      </NativeSelectOption>
      <NativeSelectOptGroup label="Citrus">
        <NativeSelectOption value="orange">Orange</NativeSelectOption>
        <NativeSelectOption value="lemon">Lemon</NativeSelectOption>
      </NativeSelectOptGroup>
      <NativeSelectOptGroup label="Stone fruit">
        <NativeSelectOption value="peach">Peach</NativeSelectOption>
        <NativeSelectOption value="plum">Plum</NativeSelectOption>
      </NativeSelectOptGroup>
    </NativeSelect>
  ),
  `<NativeSelect defaultValue="">\n  <NativeSelectOption value="" disabled>Select a fruit…</NativeSelectOption>\n  <NativeSelectOptGroup label="Citrus">\n    <NativeSelectOption value="orange">Orange</NativeSelectOption>\n  </NativeSelectOptGroup>\n</NativeSelect>`,
);

add(
  "description-list-demo",
  () => (
    <DescriptionList className="w-full max-w-sm">
      <DescriptionListItem term="Category">Data Display</DescriptionListItem>
      <DescriptionListItem term="Built on">Radix Avatar</DescriptionListItem>
      <DescriptionListItem term="Platforms">React, SwiftUI, Compose, Flutter</DescriptionListItem>
      <DescriptionListItem term="CLI">npx @kinetixui/cli add avatar</DescriptionListItem>
    </DescriptionList>
  ),
  `<DescriptionList>\n  <DescriptionListItem term="Category">Data Display</DescriptionListItem>\n  <DescriptionListItem term="Built on">Radix Avatar</DescriptionListItem>\n</DescriptionList>`,
);

add(
  "banner-demo",
  () => (
    <div className="flex w-full flex-col gap-3">
      <Banner variant="information" onDismiss={() => {}} action={{ label: "Learn more" }}>
        A new version of KinetixUI is available.
      </Banner>
      <Banner variant="action" action={{ label: "Upgrade" }}>
        You&rsquo;re on the free plan — upgrade for unlimited projects.
      </Banner>
    </div>
  ),
  `<Banner variant="information" onDismiss={close} action={{ label: "Learn more" }}>\n  A new version of KinetixUI is available.\n</Banner>`,
);

add(
  "segmented-control-demo",
  () => (
    <SegmentedControl defaultValue="grid" className="w-full max-w-xs">
      <SegmentedControlItem value="list">List</SegmentedControlItem>
      <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
      <SegmentedControlItem value="board">Board</SegmentedControlItem>
    </SegmentedControl>
  ),
  `<SegmentedControl defaultValue="grid">\n  <SegmentedControlItem value="list">List</SegmentedControlItem>\n  <SegmentedControlItem value="grid">Grid</SegmentedControlItem>\n  <SegmentedControlItem value="board">Board</SegmentedControlItem>\n</SegmentedControl>`,
);

add(
  "timeline-demo",
  () => (
    <Timeline
      className="w-full max-w-sm"
      items={[
        { time: "2 hours ago", title: "Deployed to production", content: "v0.9.0 shipped." },
        { time: "Yesterday", title: "Opened PR #100", content: "feat(ui): add SegmentedControl" },
        { time: "3 days ago", title: "Project created" },
      ]}
    />
  ),
  `<Timeline\n  items={[\n    { time: "2 hours ago", title: "Deployed to production", content: "v0.9.0 shipped." },\n    { time: "Yesterday", title: "Opened PR #100" },\n  ]}\n/>`,
);

add(
  "marquee-demo",
  () => (
    <Marquee durationSeconds={18} className="w-full max-w-md">
      {["React", "SwiftUI", "Jetpack Compose", "Flutter"].map((p) => (
        <span key={p} className="flex items-center gap-2 px-4 text-body-sm text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" />
          {p}
        </span>
      ))}
    </Marquee>
  ),
  `<Marquee durationSeconds={18}>\n  {items.map((item) => (\n    <span key={item}>{item}</span>\n  ))}\n</Marquee>`,
);

add(
  "comparison-slider-demo",
  () => (
    <ComparisonSlider
      className="w-full max-w-md"
      beforeLabel="Before"
      afterLabel="After"
      before={<div className="flex size-full items-center justify-center bg-muted text-body-sm text-muted-foreground">Original</div>}
      after={<div className="flex size-full items-center justify-center bg-primary/15 text-body-sm text-primary">Redesign</div>}
    />
  ),
  `<ComparisonSlider\n  beforeLabel="Before"\n  afterLabel="After"\n  before={<img src="/before.jpg" alt="" />}\n  after={<img src="/after.jpg" alt="" />}\n/>`,
);

add(
  "page-header-demo",
  () => (
    <PageHeader
      className="w-full"
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Projects</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>KinetixUI</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      }
      title="KinetixUI"
      description="One token architecture, in motion across every platform."
      actions={
        <>
          <Button variant="Outline" size="sm">
            Settings
          </Button>
          <Button size="sm">Deploy</Button>
        </>
      }
    />
  ),
  `<PageHeader\n  breadcrumb={<Breadcrumb>...</Breadcrumb>}\n  title="KinetixUI"\n  description="One token architecture, in motion across every platform."\n  actions={<><Button variant="Outline" size="sm">Settings</Button><Button size="sm">Deploy</Button></>}\n/>`,
);

add(
  "notification-center-demo",
  () => {
    const [unread, setUnread] = React.useState(2);
    return (
      <NotificationCenter>
        <NotificationCenterTrigger unreadCount={unread} />
        <NotificationCenterContent onMarkAllRead={() => setUnread(0)}>
          <NotificationItem
            unread={unread > 0}
            title="PR #106 merged"
            description="feat(ui): add PageHeader"
            time="2m ago"
          />
          <NotificationItem
            unread={unread > 1}
            title="Deploy succeeded"
            description="v0.11.0 is live"
            time="1h ago"
          />
          <NotificationItem title="Welcome to KinetixUI" time="2d ago" />
        </NotificationCenterContent>
      </NotificationCenter>
    );
  },
  `<NotificationCenter>\n  <NotificationCenterTrigger unreadCount={2} />\n  <NotificationCenterContent onMarkAllRead={markAllRead}>\n    <NotificationItem unread title="PR #106 merged" time="2m ago" />\n    <NotificationItem title="Welcome to KinetixUI" time="2d ago" />\n  </NotificationCenterContent>\n</NotificationCenter>`,
);

add(
  "tree-view-demo",
  () => {
    const [selected, setSelected] = React.useState("button.tsx");
    return (
      <TreeView
        className="w-full max-w-xs"
        selected={selected}
        onSelectedChange={setSelected}
        defaultExpanded={["src", "src/components"]}
      >
        <TreeItem value="src" label="src">
          <TreeItem value="src/components" label="components">
            <TreeItem value="button.tsx" label="button.tsx" />
            <TreeItem value="badge.tsx" label="badge.tsx" />
          </TreeItem>
          <TreeItem value="index.ts" label="index.ts" />
        </TreeItem>
        <TreeItem value="readme" label="README.md" />
      </TreeView>
    );
  },
  `<TreeView selected={selected} onSelectedChange={setSelected} defaultExpanded={["src"]}>\n  <TreeItem value="src" label="src">\n    <TreeItem value="index.ts" label="index.ts" />\n  </TreeItem>\n  <TreeItem value="readme" label="README.md" />\n</TreeView>`,
);

add(
  "multi-select-demo",
  () => {
    const [value, setValue] = React.useState(["react", "swiftui"]);
    return (
      <MultiSelect
        aria-label="Platforms"
        className="w-full max-w-sm"
        value={value}
        onValueChange={setValue}
        placeholder="Select platforms…"
        options={[
          { value: "react", label: "React" },
          { value: "swiftui", label: "SwiftUI" },
          { value: "compose", label: "Jetpack Compose" },
          { value: "flutter", label: "Flutter" },
        ]}
      />
    );
  },
  `<MultiSelect\n  value={value}\n  onValueChange={setValue}\n  placeholder="Select platforms…"\n  options={[\n    { value: "react", label: "React" },\n    { value: "swiftui", label: "SwiftUI" },\n  ]}\n/>`,
);

add(
  "message-bubble-demo",
  () => (
    <div className="flex w-full max-w-sm flex-col gap-1.5">
      <MessageBubble variant="received" timestamp="10:42 AM">
        Hey, are we still on for tomorrow?
      </MessageBubble>
      <MessageBubble variant="sent" timestamp="10:43 AM" status="read">
        Yep! See you at 3.
      </MessageBubble>
      <MessageBubble variant="sent" grouped status="delivered">
        I&rsquo;ll bring the slides.
      </MessageBubble>
      <TypingIndicator className="mt-1" />
    </div>
  ),
  `<MessageBubble variant="received" timestamp="10:42 AM">\n  Hey, are we still on for tomorrow?\n</MessageBubble>\n<MessageBubble variant="sent" timestamp="10:43 AM" status="read">\n  Yep! See you at 3.\n</MessageBubble>\n<TypingIndicator />`,
);

add(
  "tour-demo",
  () => {
    const [open, setOpen] = React.useState(false);
    const [stepIndex, setStepIndex] = React.useState(0);
    return (
      <div className="flex w-full flex-col items-start gap-4">
        <Button
          size="sm"
          onClick={() => {
            setStepIndex(0);
            setOpen(true);
          }}
        >
          Start tour
        </Button>
        <div className="flex items-center gap-3">
          <Button data-tour-demo="save" variant="Outline" size="sm">
            Save
          </Button>
          <Button data-tour-demo="share" variant="Outline" size="sm">
            Share
          </Button>
          <Button data-tour-demo="settings" variant="Ghost" size="icon" aria-label="Settings">
            <Settings className="size-4" />
          </Button>
        </div>
        <Tour
          open={open}
          onOpenChange={setOpen}
          stepIndex={stepIndex}
          onStepIndexChange={setStepIndex}
          steps={[
            {
              target: '[data-tour-demo="save"]',
              title: "Save your work",
              content: "Changes save automatically, but you can force a save here.",
            },
            {
              target: '[data-tour-demo="share"]',
              title: "Invite others",
              content: "Share this project with your team.",
            },
            {
              target: '[data-tour-demo="settings"]',
              title: "Fine-tune settings",
              content: "Adjust preferences for this workspace.",
            },
          ]}
        />
      </div>
    );
  },
  `<Tour\n  open={open}\n  onOpenChange={setOpen}\n  stepIndex={stepIndex}\n  onStepIndexChange={setStepIndex}\n  steps={[\n    { target: '[data-tour="save"]', title: "Save your work", content: "…" },\n    { target: '[data-tour="share"]', title: "Invite others", content: "…" },\n  ]}\n/>`,
);

add(
  "virtual-list-demo",
  () => {
    const rows = React.useMemo(
      () => Array.from({ length: 10000 }, (_, i) => ({ id: i, label: `Row ${i + 1}` })),
      [],
    );
    return (
      <VirtualList
        className="w-full max-w-sm rounded-md border"
        items={rows}
        itemHeight={36}
        height={280}
        getItemKey={(row) => row.id}
        renderItem={(row) => (
          <div className="flex h-full items-center border-b px-3 text-sm">{row.label}</div>
        )}
      />
    );
  },
  `const rows = Array.from({ length: 10000 }, (_, i) => ({ id: i, label: \`Row \${i + 1}\` }));\n\n<VirtualList\n  items={rows}\n  itemHeight={36}\n  height={280}\n  getItemKey={(row) => row.id}\n  renderItem={(row) => <div>{row.label}</div>}\n/>`,
);

/* ---- transactional foundations (business capability roadmap, Phase 1) ---------------------------- */

import {
  ResultState,
  ReferenceCode,
  PriceBreakdown,
  PriceBreakdownLine,
  PriceBreakdownTotal,
  PassCard,
  PassCardHeader,
  PassCardTitle,
  PassCardDescription,
  PassCardFields,
  PassCardField,
  PassCardDivider,
  PassCardCode,
  PassCardFooter,
} from "@kinetixui/ui";

/**
 * A real QR code (encodes the text "KX-DEMO-K7Q2XP"), generated once offline and inlined as one path. PassCard
 * never encodes anything — this stands in for the image a product's own code generator would supply. Dark modules
 * on a white quiet zone in BOTH themes, because that is what a scanner needs; a code must never follow dark mode.
 */
const QR_DEMO = ({ size = 128 }: { size?: number }) => (
  <svg viewBox="-4 -4 29 29" width={size} height={size} shapeRendering="crispEdges" aria-hidden>
    <rect x="-4" y="-4" width="29" height="29" fill="white" />
    <path fill="black" d="M0 0h7v1h-7zM8 0h1v1h-1zM10 0h3v1h-3zM14 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM8 1h1v1h-1zM12 1h1v1h-1zM14 1h1v1h-1zM20 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM10 2h2v1h-2zM14 2h1v1h-1zM16 2h3v1h-3zM20 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM9 3h1v1h-1zM14 3h1v1h-1zM16 3h3v1h-3zM20 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM9 4h3v1h-3zM14 4h1v1h-1zM16 4h3v1h-3zM20 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM9 5h2v1h-2zM14 5h1v1h-1zM20 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h7v1h-7zM9 7h3v1h-3zM1 8h1v1h-1zM6 8h4v1h-4zM11 8h3v1h-3zM19 8h2v1h-2zM1 9h2v1h-2zM4 9h2v1h-2zM8 9h1v1h-1zM10 9h2v1h-2zM14 9h4v1h-4zM19 9h2v1h-2zM0 10h3v1h-3zM4 10h4v1h-4zM9 10h2v1h-2zM14 10h3v1h-3zM19 10h1v1h-1zM0 11h1v1h-1zM3 11h2v1h-2zM10 11h1v1h-1zM14 11h3v1h-3zM20 11h1v1h-1zM1 12h1v1h-1zM3 12h1v1h-1zM5 12h5v1h-5zM12 12h1v1h-1zM14 12h2v1h-2zM17 12h3v1h-3zM8 13h1v1h-1zM10 13h1v1h-1zM12 13h2v1h-2zM17 13h4v1h-4zM0 14h7v1h-7zM8 14h1v1h-1zM11 14h1v1h-1zM13 14h4v1h-4zM18 14h1v1h-1zM0 15h1v1h-1zM6 15h1v1h-1zM9 15h4v1h-4zM15 15h1v1h-1zM19 15h1v1h-1zM0 16h1v1h-1zM2 16h3v1h-3zM6 16h1v1h-1zM12 16h2v1h-2zM15 16h2v1h-2zM19 16h1v1h-1zM0 17h1v1h-1zM2 17h3v1h-3zM6 17h1v1h-1zM10 17h1v1h-1zM12 17h1v1h-1zM14 17h1v1h-1zM18 17h1v1h-1zM0 18h1v1h-1zM2 18h3v1h-3zM6 18h1v1h-1zM9 18h1v1h-1zM13 18h4v1h-4zM19 18h2v1h-2zM0 19h1v1h-1zM6 19h1v1h-1zM8 19h2v1h-2zM15 19h2v1h-2zM18 19h1v1h-1zM20 19h1v1h-1zM0 20h7v1h-7zM10 20h2v1h-2zM15 20h1v1h-1z" />
  </svg>
);

add(
  "result-state-demo",
  () => (
    <ResultState
      className="max-w-lg"
      status="success"
      title="Payment received"
      description="We've emailed a receipt to sam@example.com. Your card statement will show KINETIX*STUDIO."
      reference={<ReferenceCode label="Transaction ID" value="TX-48C2-91QZ" size="lg" />}
      primaryAction={<Button>View receipt</Button>}
      secondaryAction={<Button variant="Outline">Back to dashboard</Button>}
    >
      <PriceBreakdown aria-label="Payment summary">
        <PriceBreakdownLine label="Annual plan" description="5 seats × €96.00" value="€480.00" />
        <PriceBreakdownLine label="Discount" description="Code LAUNCH20" value="−€96.00" kind="deduction" />
        <PriceBreakdownLine label="VAT" description="20%" value="€76.80" />
        <PriceBreakdownTotal label="Paid" description="Visa ending 4242" value="€460.80" />
      </PriceBreakdown>
    </ResultState>
  ),
  `<ResultState
  status="success"
  title="Payment received"
  description="We've emailed a receipt to sam@example.com."
  reference={<ReferenceCode label="Transaction ID" value="TX-48C2-91QZ" size="lg" />}
  primaryAction={<Button>View receipt</Button>}
  secondaryAction={<Button variant="Outline">Back to dashboard</Button>}
>
  <PriceBreakdown aria-label="Payment summary">
    <PriceBreakdownLine label="Annual plan" description="5 seats × €96.00" value="€480.00" />
    <PriceBreakdownLine label="Discount" description="Code LAUNCH20" value="−€96.00" kind="deduction" />
    <PriceBreakdownLine label="VAT" description="20%" value="€76.80" />
    <PriceBreakdownTotal label="Paid" description="Visa ending 4242" value="€460.80" />
  </PriceBreakdown>
</ResultState>`,
);

add(
  "result-state-states",
  () => (
    <div className="grid w-full max-w-3xl gap-x-8 gap-y-10 sm:grid-cols-2">
      <ResultState align="start" headingLevel={3} status="success" title="Booking confirmed" description="Two nights from 14 March. We've sent the details to your email." />
      <ResultState align="start" headingLevel={3} status="error" title="Payment declined" description="Your bank declined the charge. Nothing was taken from your account." primaryAction={<Button size="sm">Try another card</Button>} />
      <ResultState align="start" headingLevel={3} status="warning" title="Application submitted with a gap" description="We received it, but the proof of address is missing. Add it within 7 days." primaryAction={<Button size="sm" variant="Outline">Add document</Button>} />
      <ResultState align="start" headingLevel={3} status="pending" title="Transfer processing" description="Transfers usually arrive within one business day. You can leave this page." />
      <ResultState align="start" headingLevel={3} status="info" title="Request received" description="A specialist will review it and reply by Thursday." />
      <ResultState align="start" headingLevel={3} status="partial" title="3 of 4 refunds issued" description="One refund needs your bank details before we can send it." primaryAction={<Button size="sm" variant="Outline">Review refunds</Button>} />
    </div>
  ),
  `<ResultState status="success" title="Booking confirmed" description="…" />
<ResultState status="error" title="Payment declined" description="…" primaryAction={<Button>Try another card</Button>} />
<ResultState status="warning" title="Application submitted with a gap" description="…" />
<ResultState status="pending" title="Transfer processing" description="…" />
<ResultState status="info" title="Request received" description="…" />
<ResultState status="partial" title="3 of 4 refunds issued" description="…" />`,
);

add(
  "reference-code-demo",
  () => (
    <div className="flex w-full max-w-md flex-col gap-6">
      <ReferenceCode label="Booking reference" value="K7Q2XP" size="lg" />
      <ReferenceCode label="Order number" value="ORD-2026-004519" />
      <ReferenceCode label="Ticket number" value="0742 1189 2201" copyable={false} />
    </div>
  ),
  `<ReferenceCode label="Booking reference" value="K7Q2XP" size="lg" />
<ReferenceCode label="Order number" value="ORD-2026-004519" onCopy={track} />
<ReferenceCode label="Ticket number" value="0742 1189 2201" copyable={false} />`,
);

add(
  "price-breakdown-demo",
  () => (
    <PriceBreakdown className="max-w-sm" aria-label="Price summary">
      <PriceBreakdownLine label="Subtotal" description="3 items" value="€120.00" />
      <PriceBreakdownLine label="Service fee" value="€4.50" />
      <PriceBreakdownLine label="Discount" description="Code SPRING10" value="−€12.00" kind="deduction" />
      <PriceBreakdownLine label="Shipping" description="Standard, 2–4 days" value="€5.95" />
      <PriceBreakdownLine label="Tax" description="VAT 20%" value="€23.69" />
      <PriceBreakdownLine label="Account credit" value="−€10.00" kind="deduction" />
      <PriceBreakdownTotal label="Total" value="€132.14" />
    </PriceBreakdown>
  ),
  `<PriceBreakdown aria-label="Price summary">
  <PriceBreakdownLine label="Subtotal" description="3 items" value="€120.00" />
  <PriceBreakdownLine label="Service fee" value="€4.50" />
  <PriceBreakdownLine label="Discount" description="Code SPRING10" value="−€12.00" kind="deduction" />
  <PriceBreakdownLine label="Shipping" description="Standard, 2–4 days" value="€5.95" />
  <PriceBreakdownLine label="Tax" description="VAT 20%" value="€23.69" />
  <PriceBreakdownLine label="Account credit" value="−€10.00" kind="deduction" />
  <PriceBreakdownTotal label="Total" value="€132.14" />
</PriceBreakdown>`,
);

add(
  "price-breakdown-states",
  () => (
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
  ),
  `<PriceBreakdown aria-label="Transfer summary">
  <PriceBreakdownLine label="You send" value="1,000.00 USD" />
  <PriceBreakdownLine label="Transfer fee" value="−4.20 USD" kind="deduction" />
  <PriceBreakdownLine label="Exchange rate" description="Guaranteed for 24 hours" value="1 USD = 0.9213 EUR" />
  <PriceBreakdownTotal label="They receive" value="917.43 EUR" />
</PriceBreakdown>

{/* while a quote is recalculated */}
<PriceBreakdown aria-label="Quote" aria-busy="true">
  <PriceBreakdownLine label="2 nights" value={<Skeleton className="h-4 w-16" />} />
  <PriceBreakdownTotal label="Total" value={<Skeleton className="h-6 w-20" />} />
</PriceBreakdown>`,
);

add(
  "pass-card-demo",
  () => (
    <PassCard className="max-w-sm">
      <PassCardHeader>
        <div className="flex min-w-0 flex-col gap-1">
          <PassCardTitle>Boarding pass</PassCardTitle>
          <PassCardDescription>Lisbon (LIS) to Amsterdam (AMS)</PassCardDescription>
        </div>
        <Tag variant="secondary">On time</Tag>
      </PassCardHeader>
      <PassCardFields>
        <PassCardField label="Passenger">Sam Rivera</PassCardField>
        <PassCardField label="Flight">KX 1824</PassCardField>
        <PassCardField label="Boards">
          <time dateTime="2026-03-14T09:40">14 Mar, 09:40</time>
        </PassCardField>
        <PassCardField label="Gate" emphasis>B12</PassCardField>
        <PassCardField label="Seat" emphasis>14C</PassCardField>
        <PassCardField label="Group" emphasis>2</PassCardField>
      </PassCardFields>
      <PassCardDivider />
      <PassCardCode label="Boarding pass QR code" value="K7Q2XP">
        <QR_DEMO />
      </PassCardCode>
      <PassCardFooter>The gate closes 20 minutes before departure.</PassCardFooter>
    </PassCard>
  ),
  `<PassCard>
  <PassCardHeader>
    <div>
      <PassCardTitle>Boarding pass</PassCardTitle>
      <PassCardDescription>Lisbon (LIS) to Amsterdam (AMS)</PassCardDescription>
    </div>
    <Tag variant="secondary">On time</Tag>
  </PassCardHeader>
  <PassCardFields>
    <PassCardField label="Passenger">Sam Rivera</PassCardField>
    <PassCardField label="Boards"><time dateTime="2026-03-14T09:40">14 Mar, 09:40</time></PassCardField>
    <PassCardField label="Gate" emphasis>B12</PassCardField>
    <PassCardField label="Seat" emphasis>14C</PassCardField>
  </PassCardFields>
  <PassCardDivider />
  {/* the code is generated by your app or the issuer — PassCard never encodes anything */}
  <PassCardCode label="Boarding pass QR code" value="K7Q2XP">
    <img src={qrCodeUrl} alt="" width={128} height={128} />
  </PassCardCode>
  <PassCardFooter>The gate closes 20 minutes before departure.</PassCardFooter>
</PassCard>`,
);

add(
  "pass-card-variants",
  () => (
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
  ),
  `{/* An event ticket, a parking permit and a voucher: the same parts, different words. */}
<PassCard>
  <PassCardHeader>
    <PassCardTitle>Parking permit</PassCardTitle>
    <Tag>Active</Tag>
  </PassCardHeader>
  <PassCardFields>
    <PassCardField label="Plate" emphasis>KX 24 RTL</PassCardField>
    <PassCardField label="Valid until"><time dateTime="2026-12-31">31 Dec 2026</time></PassCardField>
  </PassCardFields>
  <PassCardFooter>Show this permit if asked.</PassCardFooter>
</PassCard>`,
);

export const demoRegistry = reg;

/* ---- money, status and booking fields (business capability roadmap, Phase 2) ------------------------ */

import {
  AmountDisplay,
  GuestPicker,
  CountrySelect,
  PhoneInput,
  DateRangeInput,
  TimeSlotPicker,
  AddressFields,
} from "@kinetixui/ui";

/** Supplied data, as a product would: names in the reader's language, nothing bundled by the library. */
const DEMO_COUNTRIES = [
  { code: "SA", name: "Saudi Arabia", callingCode: "966" },
  { code: "AE", name: "United Arab Emirates", callingCode: "971", keywords: ["UAE"] },
  { code: "EG", name: "Egypt", callingCode: "20" },
  { code: "GB", name: "United Kingdom", callingCode: "44", keywords: ["UK", "Britain"] },
  { code: "US", name: "United States", callingCode: "1", keywords: ["USA"] },
  { code: "JP", name: "Japan", callingCode: "81" },
];

add(
  "amount-display-demo",
  () => (
    <div className="flex flex-col gap-4">
      <AmountDisplay value="1,250.00" currency="SAR" />
      <AmountDisplay value="42.50" currency="USD" size="compact" />
      <AmountDisplay value="25.00" currency="SAR" sign="negative" tone="positive" accessibleLabel="Refund of 25 Saudi riyals" />
      <AmountDisplay value="14.2%" sign="positive" tone="positive" size="compact" />
      <AmountDisplay value="3.2" currency="kWh" currencyPosition="after" size="compact" />
    </div>
  ),
  `<AmountDisplay value="1,250.00" currency="SAR" />
<AmountDisplay value="42.50" currency="USD" size="compact" />
<AmountDisplay value="25.00" currency="SAR" sign="negative" tone="positive" accessibleLabel="Refund of 25 Saudi riyals" />
<AmountDisplay value="14.2%" sign="positive" tone="positive" size="compact" />
<AmountDisplay value="3.2" currency="kWh" currencyPosition="after" size="compact" />`,
);

add(
  "timeline-status",
  () => (
    <Timeline
      className="w-full max-w-sm"
      aria-label="Order history"
      items={[
        { time: "12 Mar, 09:14", title: "Order placed", status: "complete" },
        { time: "12 Mar, 09:15", title: "Payment confirmed", status: "complete" },
        { time: "13 Mar, 16:40", title: "Out for delivery", content: "Courier: Swift Logistics", status: "current", action: <Button size="sm" variant="Outline">Track parcel</Button> },
        { title: "Delivered", status: "pending" },
      ]}
    />
  ),
  `<Timeline
  aria-label="Order history"
  items={[
    { time: "12 Mar, 09:14", title: "Order placed", status: "complete" },
    { time: "13 Mar, 16:40", title: "Out for delivery", status: "current", action: <Button size="sm">Track parcel</Button> },
    { title: "Delivered", status: "pending" },
  ]}
/>`,
);

add(
  "guest-picker-demo",
  () => {
    const [value, setValue] = React.useState<Record<string, number>>({ adults: 2, children: 0, infants: 0 });
    return (
      <GuestPicker
        className="w-full max-w-xs"
        label="Guests"
        categories={[
          { id: "adults", label: "Adults", description: "13 or older", min: 1 },
          { id: "children", label: "Children", description: "Ages 2–12" },
          { id: "infants", label: "Infants", description: "Under 2", max: 2 },
        ]}
        value={value}
        onValueChange={setValue}
        maxTotal={9}
        totalHint="You can book up to 9 guests."
        formatSummary={(v) =>
          [
            `${v.adults} ${v.adults === 1 ? "adult" : "adults"}`,
            v.children ? `${v.children} ${v.children === 1 ? "child" : "children"}` : null,
            v.infants ? `${v.infants} ${v.infants === 1 ? "infant" : "infants"}` : null,
          ]
            .filter(Boolean)
            .join(", ")
        }
      />
    );
  },
  `<GuestPicker
  label="Guests"
  categories={[
    { id: "adults", label: "Adults", description: "13 or older", min: 1 },
    { id: "children", label: "Children", description: "Ages 2–12" },
    { id: "infants", label: "Infants", description: "Under 2", max: 2 },
  ]}
  value={guests}
  onValueChange={setGuests}
  maxTotal={9}
  formatSummary={(v) => /* your plural rules */ \`\${v.adults} adults\`}
/>`,
);

add(
  "country-select-demo",
  () => {
    const [value, setValue] = React.useState<string>();
    return (
      <CountrySelect className="w-full max-w-xs" label="Country" countries={DEMO_COUNTRIES} value={value} onValueChange={setValue} showCode />
    );
  },
  `// Names in the reader's language — e.g. from Intl.DisplayNames — supplied by the product.
const countries = [{ code: "SA", name: "Saudi Arabia" }, { code: "AE", name: "United Arab Emirates", keywords: ["UAE"] }];

<CountrySelect label="Country" countries={countries} value={country} onValueChange={setCountry} showCode />`,
);

add(
  "phone-input-demo",
  () => {
    const [value, setValue] = React.useState({ country: "SA", national: "" });
    const [raw, setRaw] = React.useState("");
    return (
      <div className="flex w-full max-w-xs flex-col gap-2">
        <PhoneInput
          label="Mobile number"
          countries={DEMO_COUNTRIES}
          value={value}
          onValueChange={({ raw: next, ...rest }) => {
            setValue(rest);
            setRaw(next);
          }}
          placeholder="50 123 4567"
        />
        <p className="text-body-sm text-muted-foreground">
          Sent to your server: <code translate="no">{raw || "—"}</code>
        </p>
      </div>
    );
  },
  `<PhoneInput
  label="Mobile number"
  countries={[{ code: "SA", name: "Saudi Arabia", callingCode: "966" }]}
  value={phone}
  onValueChange={({ raw, ...value }) => { setPhone(value); setRaw(raw); }}
/>`,
);

add(
  "date-range-input-demo",
  () => {
    const [value, setValue] = React.useState<{ start?: string; end?: string }>({ start: "2026-03-14", end: "2026-03-16" });
    return (
      <DateRangeInput
        className="w-full max-w-xs"
        label="Stay"
        value={value}
        onValueChange={setValue}
        min="2026-03-01"
        isDateDisabled={(iso) => iso === "2026-03-20" || iso === "2026-03-21"}
        locale="en-GB"
      />
    );
  },
  `// Calendar dates as "YYYY-MM-DD" — never a Date, so no time zone can move a check-in.
<DateRangeInput
  label="Stay"
  value={{ start: "2026-03-14", end: "2026-03-16" }}
  onValueChange={setStay}
  min="2026-03-01"
  isDateDisabled={(iso) => soldOut.has(iso)}
/>`,
);

add(
  "time-slot-picker-demo",
  () => {
    const [value, setValue] = React.useState<string>();
    return (
      <TimeSlotPicker
        className="w-full max-w-md"
        label="Pickup time"
        timeZoneLabel="Times in Riyadh (GMT+3)"
        value={value}
        onValueChange={setValue}
        groups={[
          {
            label: "Morning",
            slots: [
              { value: "09:00", label: "09:00" },
              { value: "09:30", label: "09:30", unavailable: true },
              { value: "10:00", label: "10:00", note: "2 left" },
              { value: "10:30", label: "10:30" },
            ],
          },
          {
            label: "Afternoon",
            slots: [
              { value: "13:00", label: "13:00", unavailable: true },
              { value: "13:30", label: "13:30" },
              { value: "14:00", label: "14:00", note: "1 left" },
            ],
          },
        ]}
      />
    );
  },
  `<TimeSlotPicker
  label="Pickup time"
  timeZoneLabel="Times in Riyadh (GMT+3)"
  value={slot}
  onValueChange={setSlot}
  groups={[
    { label: "Morning", slots: [{ value: "09:00", label: "09:00" }, { value: "09:30", label: "09:30", unavailable: true }] },
    { label: "Afternoon", slots: [{ value: "14:00", label: "14:00", note: "1 left" }] },
  ]}
/>`,
);

add(
  "address-fields-demo",
  () => {
    const [value, setValue] = React.useState<Record<string, string>>({});
    return (
      <AddressFields
        className="w-full max-w-lg"
        legend="Shipping address"
        section="shipping"
        value={value}
        onValueChange={setValue}
        fields={[
          { name: "building", label: "Building number", required: true, width: "half", inputMode: "numeric" },
          { name: "street", label: "Street", required: true, width: "half" },
          { name: "district", label: "District", required: true, width: "half" },
          { name: "locality", label: "City", required: true, width: "half" },
          { name: "postalCode", label: "Postal code", required: true, width: "half", inputMode: "numeric" },
          { name: "additional", label: "Additional number", width: "half", description: "The 4 digits on your national address" },
        ]}
      />
    );
  },
  `// The field list is yours: this one follows a Saudi national address. Pass a different array per country.
<AddressFields
  legend="Shipping address"
  section="shipping"
  value={address}
  onValueChange={setAddress}
  fields={[
    { name: "building", label: "Building number", required: true, width: "half" },
    { name: "street", label: "Street", required: true, width: "half" },
    { name: "district", label: "District", required: true, width: "half" },
    { name: "locality", label: "City", required: true, width: "half" },
    { name: "postalCode", label: "Postal code", required: true, width: "half" },
    { name: "additional", label: "Additional number", width: "half" },
  ]}
/>`,
);

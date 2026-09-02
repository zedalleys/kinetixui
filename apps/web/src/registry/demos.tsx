"use client";

import * as React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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
      <Input state="Error" defaultValue="Not quite right" />
      <Input state="Disabled" placeholder="Disabled" />
    </div>
  ),
  `<Input placeholder="Default" />\n<Input state="Error" defaultValue="Not quite right" />\n<Input state="Disabled" placeholder="Disabled" />`,
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
    return <Progress value={v} className="w-[60%]" />;
  },
  `const [value, setValue] = React.useState(13)\n// ...\n<Progress value={value} />`,
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
      <SelectTrigger className="w-[220px]">
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
  () => <Slider defaultValue={[50]} max={100} step={1} className="w-[60%]" />,
  `<Slider defaultValue={[50]} max={100} step={1} />`,
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
      <ToggleGroupItem value="bold"><Bold className="size-4" /></ToggleGroupItem>
      <ToggleGroupItem value="italic"><Italic className="size-4" /></ToggleGroupItem>
      <ToggleGroupItem value="underline"><Underline className="size-4" /></ToggleGroupItem>
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
  Modal,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Tag,
} from "@kinetixui/ui";
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
    const [date, setDate] = React.useState<Date | undefined>(new Date());
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
      <ContextMenuTrigger className="flex h-32 w-64 items-center justify-center rounded-md border border-dashed text-sm">
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
    return <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />;
  },
  `<Popover>\n  <PopoverTrigger asChild>\n    <Button variant="Outline">{date ? format(date, "PPP") : "Pick a date"}</Button>\n  </PopoverTrigger>\n  <PopoverContent className="w-auto p-0">\n    <Calendar mode="single" selected={date} onSelect={setDate} />\n  </PopoverContent>\n</Popover>`,
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
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        {Array.from({ length: 6 }).map((_, i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  ),
  `<InputOTP maxLength={6}>\n  <InputOTPGroup>\n    <InputOTPSlot index={0} />\n    ...\n    <InputOTPSlot index={5} />\n  </InputOTPGroup>\n</InputOTP>`,
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

export const demoRegistry = reg;

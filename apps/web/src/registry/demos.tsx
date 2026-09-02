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
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
    </div>
  ),
  `<Badge>Default</Badge>\n<Badge variant="secondary">Secondary</Badge>\n<Badge variant="destructive">Destructive</Badge>\n<Badge variant="outline">Outline</Badge>`,
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

export const demoRegistry = reg;

"use client";

// @kinetixui/ui — public entrypoint

/* Design-source native API (variant props mirror Figma component properties) */
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Input, inputVariants, type InputProps } from "./components/input";
export { Textarea, textareaVariants, type TextareaProps } from "./components/textarea";

/* Ported onto the KinetixUI token contract (common component API conventions) */
export { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "./components/accordion";
export { Alert, AlertTitle, AlertDescription } from "./components/alert";
export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./components/alert-dialog";
export { AspectRatio } from "./components/aspect-ratio";
export { Avatar, AvatarImage, AvatarFallback, AvatarGroup, type AvatarGroupProps } from "./components/avatar";
export { Badge, badgeVariants, type BadgeProps } from "./components/badge";
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "./components/breadcrumb";
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
} from "./components/card";
export { Checkbox } from "./components/checkbox";
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./components/collapsible";
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./components/dialog";
export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from "./components/dropdown-menu";
export { HoverCard, HoverCardTrigger, HoverCardContent } from "./components/hover-card";
export { Label } from "./components/label";
export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "./components/pagination";
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor } from "./components/popover";
export { Progress } from "./components/progress";
export { RadioGroup, RadioGroupItem } from "./components/radio-group";
export { ScrollArea, ScrollBar } from "./components/scroll-area";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from "./components/select";
export { Separator } from "./components/separator";
export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./components/sheet";
export { Modal, type ModalType, type ModalProps } from "./components/modal";
export { Skeleton } from "./components/skeleton";
export { Slider } from "./components/slider";
export { Toaster, toast } from "./components/sonner";
export { Switch } from "./components/switch";
export { Tag, tagVariants, type TagProps } from "./components/tag";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "./components/table";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/tabs";
export { Toggle, toggleVariants } from "./components/toggle";
export { ToggleGroup, ToggleGroupItem } from "./components/toggle-group";
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./components/tooltip";

/* Batch 2 — compositions + charting + layout */
export { Calendar, type CalendarProps } from "./components/calendar";
export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "./components/carousel";
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
  type ChartConfig,
} from "./components/chart";
export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "./components/command";
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
} from "./components/context-menu";
export { DataTable } from "./components/data-table";
export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "./components/drawer";
export {
  Field,
  FieldLabel,
  FieldControl,
  FieldDescription,
  FieldMessage,
  messageVariants,
} from "./components/field";
export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
} from "./components/form";
export {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupText,
  InputGroupButton,
} from "./components/input-group";
export { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "./components/input-otp";
export { PasswordInput } from "./components/password-input";
export {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarPortal,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarGroup,
  MenubarSub,
  MenubarShortcut,
} from "./components/menubar";
export {
  navigationMenuTriggerStyle,
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuContent,
  NavigationMenuTrigger,
  NavigationMenuLink,
  NavigationMenuIndicator,
  NavigationMenuViewport,
} from "./components/navigation-menu";
export { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "./components/resizable";
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "./components/sidebar";

/* Batch 3 — additional gap-fill components */
export { AudioPlayer, type AudioPlayerProps } from "./components/audio-player";
export { CircularProgress, type CircularProgressProps } from "./components/circular-progress";
export { Image, type ImageProps } from "./components/image";
export { Inform, informVariants, type InformProps } from "./components/inform";

/* Batch 4 — mobile-pattern gap-fill components */
export { Rating, type RatingProps } from "./components/rating";
export { Spinner, spinnerVariants, type SpinnerProps } from "./components/spinner";
export { List, ListItem, type ListItemProps } from "./components/list";
export { Stepper, type StepperProps, type StepperStep } from "./components/stepper";
export { Fab, fabVariants, type FabProps } from "./components/fab";
export { TabBar, TabBarItem, type TabBarItemProps } from "./components/tab-bar";
export { NavigationBar, type NavigationBarProps } from "./components/navigation-bar";
export {
  AppBar,
  AppBarBrand,
  AppBarNav,
  AppBarLink,
  AppBarActions,
  useAppBar,
  type AppBarLinkProps,
} from "./components/app-bar";
export {
  FileUpload,
  FileUploadItem,
  formatBytes,
  type UploadFile,
  type FileUploadProps,
  type FileUploadItemProps,
} from "./components/file-upload";
export { DatePicker, type DatePickerProps } from "./components/date-picker";

/* Batch 5 — web-pattern gap-fill components */
export { CodeBlock, type CodeBlockProps, type CodeBlockFile } from "./components/code-block";
export { Metric, type MetricProps } from "./components/metric";
export { NumberInput, type NumberInputProps } from "./components/number-input";
export { Quote, type QuoteProps } from "./components/quote";
export { Footer, FooterColumn, FooterLink, FooterBottom, type FooterColumnProps } from "./components/footer";
export { TableOfContents, type TableOfContentsProps, type TocItem } from "./components/table-of-contents";

export { cn } from "./lib/utils";

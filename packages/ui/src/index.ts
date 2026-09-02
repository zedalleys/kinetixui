"use client";

// @kinetixui/ui — public entrypoint

/* Design-source native API (variant props mirror Figma component properties) */
export { Button, buttonVariants, type ButtonProps } from "./components/button";
export { Input, inputVariants, type InputProps } from "./components/input";
export { Textarea, textareaVariants, type TextareaProps } from "./components/textarea";

/* Ported onto the KinetixUI token contract (shadcn API conventions) */
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
export { Avatar, AvatarImage, AvatarFallback } from "./components/avatar";
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
export { Skeleton } from "./components/skeleton";
export { Slider } from "./components/slider";
export { Toaster, toast } from "./components/sonner";
export { Switch } from "./components/switch";
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

export { cn } from "./lib/utils";

/*
 * Still to port (heavier compositions / extra deps):
 *   command (cmdk) · combobox · context-menu · menubar · navigation-menu ·
 *   drawer (vaul) · calendar (react-day-picker) · date-picker · carousel (embla) ·
 *   input-otp · form (react-hook-form + zod) · resizable (react-resizable-panels) ·
 *   data-table (@tanstack/react-table) · chart (recharts) · sidebar
 */

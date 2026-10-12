/**
 * @kinetixui/angular — public API.
 *
 * This file is the package's contract, and `scripts/check-platform-source.mjs` reads it: a component may only
 * be declared as an Angular implementation in `components.manifest.json` if its symbol is exported here. That
 * is what stops the manifest, the website and the documentation from advertising an Angular component that
 * does not exist — the failure mode this package was created to end.
 *
 * Every export is a standalone directive or component: import the ones a template uses, nothing more. There is
 * no NgModule and no barrel module, so nothing is pulled in by association.
 */
export * from './lib/types';
export { KxButton } from './lib/button';
export {
  KxAlert,
  KxAlertDescription,
  KxAlertTitle,
  KxBadge,
  KxCard,
  KxCardContent,
  KxCardDescription,
  KxCardFooter,
  KxCardHeader,
  KxCardTitle,
  KxInput,
  KxLabel,
  KxProgress,
  KxSeparator,
} from './lib/primitives';
export {
  KxCheckbox,
  KxSegment,
  KxSegmentedControl,
  KxSwitch,
  KxToggle,
  KxToggleGroup,
  KxToggleGroupItem,
} from './lib/toggles';
export {
  KxAspectRatio,
  KxAvatar,
  KxAvatarFallback,
  KxAvatarGroup,
  KxAvatarImage,
  KxEmpty,
  KxEmptyContent,
  KxEmptyDescription,
  KxEmptyHeader,
  KxEmptyMedia,
  KxEmptyTitle,
  KxKbd,
  KxKbdGroup,
  KxMetric,
  KxQuote,
  KxSkeleton,
  KxSpinner,
  KxTag,
} from './lib/display';
export {
  KxField,
  KxFieldDescription,
  KxFieldLabel,
  KxFieldMessage,
  KxNativeSelect,
  KxNumberInput,
  KxPasswordInput,
  KxRadio,
  KxRadioGroup,
  KxSlider,
  KxTextarea,
} from './lib/forms';
export { KxInputGroup, KxInputGroupAddon, KxInputGroupButton, KxInputGroupInput, KxInputGroupText } from './lib/input-group';
export { KxInputOtp } from './lib/input-otp';
export { KxRating } from './lib/rating';
export { KxTab, KxTabList, KxTabPanel, KxTabs } from './lib/tabs';
export type { KxCodeBlockFile } from './lib/content';
export {
  KxBanner,
  KxButtonGroup,
  KxButtonGroupSeparator,
  KxButtonGroupText,
  KxCircularProgress,
  KxCodeBlock,
  KxDescriptionList,
  KxDescriptionListItem,
  KxFab,
  KxImage,
  KxInform,
  KxList,
  KxListItem,
  KxMarquee,
  KxMarqueeContent,
  KxPageHeader,
  KxTimeline,
  KxTimelineItem,
} from './lib/content';
export {
  KxAccordion,
  KxAccordionContent,
  KxAccordionItem,
  KxAccordionTrigger,
  KxCollapsible,
  KxCollapsibleContent,
  KxCollapsibleTrigger,
} from './lib/disclosure';
export type { KxStep, KxTocItem } from './lib/navigation';
export {
  KxAppBar,
  KxAppBarActions,
  KxAppBarBrand,
  KxAppBarLink,
  KxAppBarNav,
  KxBreadcrumb,
  KxBreadcrumbItem,
  KxBreadcrumbLink,
  KxBreadcrumbList,
  KxBreadcrumbPage,
  KxBreadcrumbSeparator,
  KxFooter,
  KxFooterBottom,
  KxFooterColumn,
  KxFooterColumns,
  KxFooterLink,
  KxNavigationBar,
  KxPagination,
  KxPaginationContent,
  KxPaginationEllipsis,
  KxPaginationItem,
  KxPaginationLink,
  KxPaginationNext,
  KxPaginationPrevious,
  KxStepper,
  KxTabBar,
  KxTabBarItem,
  KxTableOfContents,
} from './lib/navigation';
export type { KxModalType, KxSheetSide } from './lib/dialog';
export {
  KxAlertDialog,
  KxAlertDialogAction,
  KxAlertDialogCancel,
  KxAlertDialogContent,
  KxDialog,
  KxDialogClose,
  KxDialogContent,
  KxDialogDescription,
  KxDialogFooter,
  KxDialogHeader,
  KxDialogTitle,
  KxDialogTrigger,
  KxDrawer,
  KxDrawerContent,
  KxModal,
  KxSheet,
  KxSheetContent,
} from './lib/dialog';
export type { KxAlign, KxSide } from './lib/overlay';
export {
  KxHoverCard,
  KxHoverCardContent,
  KxHoverCardTrigger,
  KxPopover,
  KxPopoverAnchor,
  KxPopoverClose,
  KxPopoverContent,
  KxPopoverTrigger,
  KxTooltip,
  KxTooltipContent,
  KxTooltipTrigger,
} from './lib/floating';
export {
  KxContextMenu,
  KxContextMenuContent,
  KxContextMenuTrigger,
  KxDropdownMenu,
  KxDropdownMenuContent,
  KxDropdownMenuTrigger,
  KxMenuCheckboxItem,
  KxMenuGroup,
  KxMenuItem,
  KxMenuLabel,
  KxMenuRadioGroup,
  KxMenuRadioItem,
  KxMenuSeparator,
  KxMenuShortcut,
  KxMenuSub,
  KxMenuSubContent,
  KxMenuSubTrigger,
  KxMenubar,
  KxMenubarContent,
  KxMenubarMenu,
  KxMenubarTrigger,
} from './lib/menu';
export { KxSelect, KxSelectContent, KxSelectGroup, KxSelectItem, KxSelectLabel, KxSelectSeparator, KxSelectTrigger, KxSelectValue } from './lib/select';
export type { KxCommandFilter, KxCommandFilterItem } from './lib/command';
export {
  KxCommand,
  KxCommandDialog,
  KxCommandEmpty,
  KxCommandGroup,
  KxCommandInput,
  KxCommandItem,
  KxCommandList,
  KxCommandSeparator,
  KxCommandShortcut,
} from './lib/command';
export type { KxMultiSelectOption } from './lib/multi-select';
export { KxMultiSelect } from './lib/multi-select';
export {
  KxNavigationMenu,
  KxNavigationMenuContent,
  KxNavigationMenuIndicator,
  KxNavigationMenuItem,
  KxNavigationMenuLink,
  KxNavigationMenuList,
  KxNavigationMenuTrigger,
} from './lib/navigation-menu';
export type { KxToast, KxToastButton, KxToastOptions, KxToastType } from './lib/toast-queue';
export type { KxToasterPosition } from './lib/sonner';
export { KxToaster, KxToasterService } from './lib/sonner';
export {
  KxNotificationCenter,
  KxNotificationCenterContent,
  KxNotificationCenterTrigger,
  KxNotificationItem,
} from './lib/notification-center';
export type { KxTourStep } from './lib/tour';
export { KxTour } from './lib/tour';
export type { KxSidebarSide } from './lib/sidebar';
export {
  KxSidebar,
  KxSidebarContent,
  KxSidebarFooter,
  KxSidebarGroup,
  KxSidebarGroupContent,
  KxSidebarGroupLabel,
  KxSidebarHeader,
  KxSidebarInput,
  KxSidebarInset,
  KxSidebarMenu,
  KxSidebarMenuButton,
  KxSidebarMenuItem,
  KxSidebarMenuSkeleton,
  KxSidebarProvider,
  KxSidebarSeparator,
  KxSidebarTrigger,
} from './lib/sidebar';
export { KxScrollArea } from './lib/scroll-area';
export type { KxResizableDirection } from './lib/resizable';
export { KxResizableHandle, KxResizablePanel, KxResizablePanelGroup } from './lib/resizable';
export { KxCarousel, KxCarouselContent, KxCarouselItem, KxCarouselNext, KxCarouselPrevious } from './lib/carousel';
export { KxComparisonSlider } from './lib/comparison-slider';

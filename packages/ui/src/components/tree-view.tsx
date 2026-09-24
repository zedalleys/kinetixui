"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Checkbox } from "./checkbox";
import { cn } from "../lib/utils";

/**
 * TreeView / TreeItem — nested expand/collapse rows with keyboard roving
 * tabindex and optional checkboxes. Sidebar/file/nav trees have no
 * primitive today (`Sidebar` is flat); Radix has no tree component to
 * build on, so this is hand-rolled: `role="treeitem"` sits on each
 * item's own container (not a separate "row" element) so a nested
 * item's `closest('[role="treeitem"]')` correctly walks up to its real
 * ancestor rather than a sibling row, and visible items are queried live
 * from the DOM on every arrow-key press — collapsed subtrees simply
 * don't render, so that query is always exactly the visible, in-order
 * item list with no separate registration bookkeeping to keep in sync.
 * `checkable` checkboxes are independent per item — no automatic
 * parent-selects-all-children / indeterminate propagation. A real,
 * documented simplification, not a silent one. Gap-fill addition (not in
 * the original Figma source).
 */
interface TreeViewContextValue {
  isExpanded: (value: string) => boolean;
  toggleExpanded: (value: string) => void;
  selected?: string;
  select: (value: string) => void;
  checkable: boolean;
  isChecked: (value: string) => boolean;
  toggleChecked: (value: string) => void;
  tabbableValue: string | null;
  setTabbableValue: (value: string) => void;
  firstValueRef: React.MutableRefObject<string | null>;
}

const TreeViewContext = React.createContext<TreeViewContextValue | null>(null);

function useTreeViewContext() {
  const ctx = React.useContext(TreeViewContext);
  if (!ctx) throw new Error("TreeItem must be rendered inside a TreeView");
  return ctx;
}

const TreeLevelContext = React.createContext(0);

export interface TreeViewProps extends React.HTMLAttributes<HTMLDivElement> {
  /** show a checkbox on every item */
  checkable?: boolean;
  expanded?: string[];
  defaultExpanded?: string[];
  onExpandedChange?: (expanded: string[]) => void;
  /** the selected node's value. Controlled: pass `onSelectedChange` with it. */
  selected?: string;
  /**
   * the node selected before the caller takes over. Without this the tree could not show a selection at all
   * unless the caller stored one — `select` only called back, so an uncontrolled tree stayed permanently
   * unselected. Expansion and checking already worked both ways; selection did not.
   */
  defaultSelected?: string;
  onSelectedChange?: (value: string) => void;
  checkedValues?: string[];
  defaultCheckedValues?: string[];
  onCheckedChange?: (checkedValues: string[]) => void;
}

const TreeView = React.forwardRef<HTMLDivElement, TreeViewProps>(
  (
    {
      className,
      checkable = false,
      expanded,
      defaultExpanded = [],
      onExpandedChange,
      selected,
      defaultSelected,
      onSelectedChange,
      checkedValues,
      defaultCheckedValues = [],
      onCheckedChange,
      children,
      ...props
    },
    ref,
  ) => {
    const [internalExpanded, setInternalExpanded] = React.useState(defaultExpanded);
    const currentExpanded = expanded ?? internalExpanded;
    const [internalChecked, setInternalChecked] = React.useState(defaultCheckedValues);
    const currentChecked = checkedValues ?? internalChecked;
    const [internalSelected, setInternalSelected] = React.useState(defaultSelected);
    const currentSelected = selected ?? internalSelected;
    const [tabbableValue, setTabbableValue] = React.useState<string | null>(null);
    const firstValueRef = React.useRef<string | null>(null);

    const toggleExpanded = React.useCallback(
      (value: string) => {
        const next = currentExpanded.includes(value)
          ? currentExpanded.filter((v) => v !== value)
          : [...currentExpanded, value];
        setInternalExpanded(next);
        onExpandedChange?.(next);
      },
      [currentExpanded, onExpandedChange],
    );

    const toggleChecked = React.useCallback(
      (value: string) => {
        const next = currentChecked.includes(value)
          ? currentChecked.filter((v) => v !== value)
          : [...currentChecked, value];
        setInternalChecked(next);
        onCheckedChange?.(next);
      },
      [currentChecked, onCheckedChange],
    );

    const contextValue: TreeViewContextValue = {
      isExpanded: (value) => currentExpanded.includes(value),
      toggleExpanded,
      selected: currentSelected,
      select: (value) => {
        setInternalSelected(value);
        onSelectedChange?.(value);
      },
      checkable,
      isChecked: (value) => currentChecked.includes(value),
      toggleChecked,
      tabbableValue,
      setTabbableValue,
      firstValueRef,
    };

    return (
      <div
        ref={ref}
        role="tree"
        aria-multiselectable={checkable || undefined}
        className={cn("flex flex-col font-sans", className)}
        {...props}
      >
        <TreeViewContext.Provider value={contextValue}>
          <TreeLevelContext.Provider value={0}>{children}</TreeLevelContext.Provider>
        </TreeViewContext.Provider>
      </div>
    );
  },
);
TreeView.displayName = "TreeView";

export interface TreeItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children"> {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  children?: React.ReactNode;
}

const TreeItem = React.forwardRef<HTMLDivElement, TreeItemProps>(
  ({ className, value, label, icon, disabled, children, onClick, onKeyDown, ...props }, ref) => {
    const ctx = useTreeViewContext();
    const level = React.useContext(TreeLevelContext);
    /**
     * The row's own label, so the treeitem is named by it alone.
     *
     * Without this the accessible name is computed from the element's contents, and an EXPANDED item's
     * contents include its whole subtree — "src" announced as "src index.ts". `role="group"` on the children
     * is required by the tree pattern but does not stop name-from-content walking into it; pointing
     * `aria-labelledby` at the label span does.
     */
    const labelId = React.useId();
    const hasChildren = React.Children.count(children) > 0;
    const expanded = ctx.isExpanded(value);
    const isChecked = ctx.isChecked(value);

    if (ctx.firstValueRef.current === null) ctx.firstValueRef.current = value;
    const isTabbable = (ctx.tabbableValue ?? ctx.firstValueRef.current) === value;

    const localRef = React.useRef<HTMLDivElement>(null);
    const setRefs = (node: HTMLDivElement | null) => {
      localRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    const activate = () => {
      ctx.select(value);
      if (ctx.checkable) ctx.toggleChecked(value);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || disabled) return;
      const root = localRef.current?.closest('[role="tree"]');
      const items = root ? Array.from(root.querySelectorAll<HTMLElement>('[role="treeitem"]')) : [];
      const idx = items.indexOf(e.currentTarget);

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          items[idx + 1]?.focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          items[idx - 1]?.focus();
          break;
        case "Home":
          e.preventDefault();
          items[0]?.focus();
          break;
        case "End":
          e.preventDefault();
          items[items.length - 1]?.focus();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (hasChildren && !expanded) ctx.toggleExpanded(value);
          else if (hasChildren) items[idx + 1]?.focus();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (hasChildren && expanded) ctx.toggleExpanded(value);
          else {
            const parent = localRef.current?.parentElement?.closest<HTMLElement>('[role="treeitem"]');
            parent?.focus();
          }
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          activate();
          break;
      }
    };

    return (
      <div
        ref={setRefs}
        role="treeitem"
        aria-labelledby={labelId}
        aria-expanded={hasChildren ? expanded : undefined}
        aria-selected={ctx.selected === value}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? undefined : isTabbable ? 0 : -1}
        onFocus={() => ctx.setTabbableValue(value)}
        onKeyDown={handleKeyDown}
        onClick={(e) => {
          onClick?.(e);
          if (e.defaultPrevented || disabled) return;
          activate();
        }}
        className={cn("outline-none", disabled && "pointer-events-none opacity-disabled", className)}
        {...props}
      >
        <div
          style={{ paddingLeft: level * 20 + 8 }}
          className={cn(
            "flex items-center gap-1.5 rounded-sm py-1.5 pr-2 text-body-sm text-foreground",
            "hover:bg-accent",
            ctx.selected === value && "bg-accent",
            "focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
          )}
        >
          {hasChildren ? (
            <ChevronRight
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")}
              onClick={(e) => {
                e.stopPropagation();
                ctx.toggleExpanded(value);
              }}
            />
          ) : (
            <span className="size-4 shrink-0" />
          )}
          {ctx.checkable && (
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => ctx.toggleChecked(value)}
              onClick={(e) => e.stopPropagation()}
              tabIndex={-1}
            />
          )}
          {icon}
          <span id={labelId} className="truncate">
            {label}
          </span>
        </div>
        {hasChildren && expanded && (
          <div role="group">
            <TreeLevelContext.Provider value={level + 1}>{children}</TreeLevelContext.Provider>
          </div>
        )}
      </div>
    );
  },
);
TreeItem.displayName = "TreeItem";

export { TreeView, TreeItem };

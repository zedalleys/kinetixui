"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

/**
 * MultiSelect — a `Combobox` that keeps multiple chips; a free-entry
 * token field with `creatable`. `Combobox` (the existing Popover +
 * Command recipe) is single-value and `Tag` is display-only, so this
 * composes both into an actual shippable component rather than another
 * "recipe" doc page. The trigger is `role="combobox"` on a plain `div`,
 * not a `<button>` — `Tag`'s own remove control is a real `<button>`,
 * and a `<button>` can't nest inside a `<button>` (invalid HTML); using
 * `PopoverAnchor` + manual open-state instead of `PopoverTrigger` avoids
 * that while keeping the whole thing keyboard-operable. Gap-fill
 * addition (not in the original Figma source).
 */
export interface MultiSelectOption {
  value: string;
  label: string;
}

export interface MultiSelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: MultiSelectOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  /** allow adding free-entry tags that aren't in `options` */
  creatable?: boolean;
}

const MultiSelect = React.forwardRef<HTMLDivElement, MultiSelectProps>(
  (
    { className, options, value, defaultValue = [], onValueChange, placeholder = "Select…", creatable = false, ...props },
    ref,
  ) => {
    const [internal, setInternal] = React.useState(defaultValue);
    const current = value ?? internal;
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const anchorRef = React.useRef<HTMLDivElement | null>(null);
    const setRefs = (node: HTMLDivElement | null) => {
      anchorRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    const set = (next: string[]) => {
      setInternal(next);
      onValueChange?.(next);
    };
    const toggle = (v: string) => set(current.includes(v) ? current.filter((x) => x !== v) : [...current, v]);
    const remove = (v: string) => set(current.filter((x) => x !== v));
    const labelFor = (v: string) => options.find((o) => o.value === v)?.label ?? v;

    const trimmed = query.trim();
    const canCreate = creatable && trimmed.length > 0 && !options.some((o) => o.label.toLowerCase() === trimmed.toLowerCase());
    const visibleOptions = creatable
      ? options.filter((o) => o.label.toLowerCase().includes(trimmed.toLowerCase()))
      : options;

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div
            ref={setRefs}
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            tabIndex={0}
            onClick={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(true);
              }
            }}
            className={cn(
              "flex min-h-11 w-full flex-wrap items-center gap-1.5 border border-input bg-background px-3 py-2 font-sans",
              "outline-none focus-visible:border-primary focus-visible:shadow-focus",
              "aria-expanded:border-primary aria-expanded:shadow-focus",
              className,
            )}
            {...props}
          >
            {current.length === 0 && <span className="text-body-sm text-muted-foreground">{placeholder}</span>}
            {current.map((v) => (
              <Tag key={v} variant="secondary" onRemove={() => remove(v)} onClick={(e) => e.stopPropagation()}>
                {labelFor(v)}
              </Tag>
            ))}
          </div>
        </PopoverAnchor>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] p-0"
          // Radix focuses the search input on open, so keys reach the option list (cmdk only
          // listens from inside its own root) — and on close focus goes back to the combobox,
          // which is only an anchor here, so Radix has no trigger to return it to.
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            anchorRef.current?.focus();
          }}
        >
          <Command shouldFilter={!creatable}>
            <CommandInput placeholder="Search…" value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>
                {canCreate ? (
                  <button
                    type="button"
                    className="flex w-full items-center px-2 py-1.5 text-left text-body-sm text-foreground hover:bg-accent"
                    onClick={() => {
                      toggle(trimmed);
                      setQuery("");
                    }}
                  >
                    Create “{trimmed}”
                  </button>
                ) : (
                  "No results."
                )}
              </CommandEmpty>
              <CommandGroup>
                {visibleOptions.map((option) => (
                  <CommandItem key={option.value} value={option.label} onSelect={() => toggle(option.value)}>
                    <Check className={cn("size-4", current.includes(option.value) ? "opacity-100" : "opacity-0")} />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  },
);
MultiSelect.displayName = "MultiSelect";

export { MultiSelect };

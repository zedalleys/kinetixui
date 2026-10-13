"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

/**
 * CountrySelect — choose a country by typing part of its name or code.
 *
 * Behaviour is not new here: it is the catalogue's documented combobox recipe (a `Command` list in a
 * `Popover`, opened from a button) with a country data adapter in front of it, so search, arrow keys,
 * Enter, Escape and focus return are the same ones every other combobox has. What it adds:
 *
 *   data you supply   `countries` is `{ code, name }[]`. No country list is bundled — names must be in the
 *                     reader's language, the set a product serves is its own decision (and sometimes a
 *                     legal one), and `Intl.DisplayNames` can produce localised names from codes in one
 *                     line without this package shipping a 250-row table nobody can tree-shake
 *   searchable by     name, code and any `keywords` ("UK", "Holland"), case-insensitively
 *   identified by     the name, always; the ISO code beside it when `showCode` is set. No flag is drawn —
 *                     a flag is not a country name, renders as two letters on some platforms, and the
 *                     catalogue has no flag icon set. A flag can be passed per option as `adornment`, as
 *                     decoration beside the name, never instead of it
 *   forms             `name` renders a hidden input carrying the selected code
 *
 * The trigger's accessible name is the field label plus the current country, so it is read as
 * "Country, Saudi Arabia" rather than as an unnamed button.
 */
export interface CountryOption {
  /** Usually ISO 3166-1 alpha-2 ("SA"). The value reported to `onValueChange`. */
  code: string;
  /** The display name, in the reader's language. */
  name: string;
  /** Extra search terms. */
  keywords?: string[];
  /** Decoration shown before the name (e.g. a flag image with `alt=""`). Never the only identifier. */
  adornment?: React.ReactNode;
}

export interface CountrySelectProps {
  label: React.ReactNode;
  countries: CountryOption[];
  value?: string;
  onValueChange?: (code: string) => void;
  /** Trigger text with no selection. Default "Select a country". */
  placeholder?: string;
  /** Search field placeholder and accessible name. Default "Search countries". */
  searchPlaceholder?: string;
  /** Shown when nothing matches. Default "No country found." */
  emptyMessage?: string;
  /** Show the code beside each name. */
  showCode?: boolean;
  /** Submitted with a form as a hidden input. */
  name?: string;
  disabled?: boolean;
  /** Marks the trigger invalid; pair it with a visible message. */
  invalid?: boolean;
  /** id of a description or error message for the trigger. */
  "aria-describedby"?: string;
  className?: string;
}

const CountrySelect = React.forwardRef<HTMLButtonElement, CountrySelectProps>(
  (
    {
      label,
      countries,
      value,
      onValueChange,
      placeholder = "Select a country",
      searchPlaceholder = "Search countries",
      emptyMessage = "No country found.",
      showCode = false,
      name,
      disabled,
      invalid,
      "aria-describedby": describedBy,
      className,
    },
    ref,
  ) => {
    const id = React.useId();
    const labelId = `${id}-label`;
    const valueId = `${id}-value`;
    const [open, setOpen] = React.useState(false);
    const selected = countries.find((c) => c.code === value);

    return (
      <div className={cn("flex min-w-0 flex-col gap-1.5 font-sans", className)}>
        <span id={labelId} className="text-label-md font-medium text-foreground">
          {label}
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              ref={ref}
              type="button"
              disabled={disabled}
              aria-haspopup="listbox"
              aria-labelledby={`${labelId} ${valueId}`}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              className={cn(
                "flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-muted-foreground/80 bg-background px-3 py-2 text-start text-body-md outline-none transition-[border-color,box-shadow] duration-instant ease-standard focus-visible:border-action focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-disabled [@media(hover:hover)]:hover:border-muted-foreground",
                "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-focus-destructive",
              )}
            >
              <span id={valueId} className={cn("flex min-w-0 items-center gap-2", !selected && "text-muted-foreground")}>
                {selected?.adornment}
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {selected ? selected.name : placeholder}
                  {selected && showCode && <span className="text-muted-foreground"> ({selected.code})</span>}
                </span>
              </span>
              <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            // `min-width` beats `max-width`, so the 16rem floor is itself capped by the room Radix measured:
            // at 2x text on a phone a bare `min-w-64` is 512px and pushes the list off screen.
            className="w-[var(--radix-popover-trigger-width)] min-w-[min(16rem,var(--radix-popper-available-width))] p-0"
            aria-labelledby={labelId}
          >
            {/* cmdk names its input from `label` (via aria-labelledby, which would override an aria-label). */}
            <Command label={searchPlaceholder}>
              <CommandInput placeholder={searchPlaceholder} />
              {/* The list scrolls rather than crops: `overflow-x-auto` instead of cmdk's hidden x-axis, and
                  names wrap, so nothing in it is out of reach at 2x text. */}
              <CommandList className="overflow-x-auto">
                <CommandEmpty>{emptyMessage}</CommandEmpty>
                <CommandGroup>
                  {countries.map((c) => (
                    <CommandItem
                      key={c.code}
                      value={`${c.name} ${c.code}`}
                      keywords={c.keywords}
                      onSelect={() => {
                        onValueChange?.(c.code);
                        setOpen(false);
                      }}
                      data-checked={c.code === value || undefined}
                    >
                      <Check aria-hidden className={cn(c.code === value ? "visible" : "invisible")} />
                      {c.adornment}
                      <span className="min-w-0 [overflow-wrap:anywhere]">{c.name}</span>
                      {showCode && (
                        <span translate="no" className="ms-auto text-label-sm text-muted-foreground">
                          {c.code}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {name && <input type="hidden" name={name} value={value ?? ""} disabled={disabled} />}
      </div>
    );
  },
);
CountrySelect.displayName = "CountrySelect";

export { CountrySelect };

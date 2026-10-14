"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Kbd,
  KbdGroup,
} from "@kinetixui/ui";
import { Circle, FileText, Laptop, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { docsNav, mainNav } from "@/lib/site";

/** "⌘" on Apple platforms, "Ctrl" everywhere else. Resolves after mount to keep
 *  SSR output stable; renders the neutral "Ctrl" until then. */
function useModKey() {
  const [mod, setMod] = React.useState<"⌘" | "Ctrl">("Ctrl");
  React.useEffect(() => {
    const platform =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
      navigator.platform ||
      "";
    if (/mac|iphone|ipad|ipod/i.test(platform)) setMod("⌘");
  }, []);
  return mod;
}

export function CommandMenu() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const openRef = React.useRef(open);
  React.useEffect(() => {
    openRef.current = open;
  }, [open]);
  const mod = useModKey();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
          return;
        // Not over another open dialog, such as the mobile menu: two stacked modals fight over focus, and closing
        // this one handed focus to its trigger in the header behind the other, which that dialog hides from AT.
        if (!openRef.current && document.querySelector('[role="dialog"][data-state="open"]')) return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const run = React.useCallback((fn: () => void) => {
    setOpen(false);
    fn();
  }, []);

  // The library CommandDialog: a Radix modal that traps Tab, makes the page behind inert, closes on Esc (which the
  // footer below promises), carries the dialog's name and returns focus to the trigger on close — the trigger is
  // passed in so that it is the dialog's own, which is what focus returns to after ⌘K as well as after a click.
  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search the docs"
      commandProps={{ label: "Command menu" }}
      trigger={
        /*
          One trigger at every width. Below `sm` it collapses to a square icon button rather than being hidden: phones
          had no site search at all, and a second trigger would have meant a second instance of this component and a
          second global ⌘K listener, which toggles the dialog twice. The visible text becomes `sr-only` instead of
          being removed, so the accessible name starts with the same "Search…" at every width (the shortcut keys join
          it where they are shown, so the name always contains the visible label).
        */
        <Button
          variant="Outline"
          size="sm"
          className="kx-hit size-9 p-0 text-body-md font-normal text-muted-foreground sm:h-9 sm:w-56 sm:justify-start sm:gap-2 sm:px-3"
        >
          <Search aria-hidden />
          <span className="sr-only sm:not-sr-only sm:flex-1 sm:text-start">Search…</span>
          <KbdGroup className="pointer-events-none hidden sm:inline-flex">
            <Kbd>{mod}</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
        </Button>
      }
    >
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Links">
          {mainNav.map((item) => (
            <CommandItem key={item.href} onSelect={() => run(() => router.push(item.href))}>
              <Circle />
              {item.title}
            </CommandItem>
          ))}
        </CommandGroup>

        {docsNav.map((group) => (
          <CommandGroup key={group.title} heading={group.title}>
            {group.items.map((item) => (
              <CommandItem key={item.href} onSelect={() => run(() => router.push(item.href))}>
                <FileText />
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        <CommandGroup heading="Theme">
          <CommandItem onSelect={() => run(() => setTheme("light"))}>
            <Sun /> Light
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("dark"))}>
            <Moon /> Dark
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme("system"))}>
            <Laptop /> System
          </CommandItem>
        </CommandGroup>
      </CommandList>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-3 py-2 text-body-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <KbdGroup>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
          </KbdGroup>
          to navigate
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd>
          to select
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>Esc</Kbd>
          to close
        </span>
        <span className="ms-auto flex items-center gap-1.5">
          <KbdGroup>
            <Kbd>{mod}</Kbd>
            <Kbd>K</Kbd>
          </KbdGroup>
          or
          <Kbd>/</Kbd>
        </span>
      </div>
    </CommandDialog>
  );
}

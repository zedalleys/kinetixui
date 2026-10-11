"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { Circle, FileText, Laptop, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
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

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[11px] font-medium leading-none text-muted-foreground">
      {children}
    </kbd>
  );
}

export function CommandMenu() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
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

  // A Radix modal, as in MobileNav: it traps Tab inside, makes the page behind inert, closes on Esc (which
  // the footer below promises), names the dialog, and returns focus to the trigger on close. The hand-rolled
  // overlay it replaces did none of those.
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {/*
        One trigger at every width. Below `sm` it collapses to a square icon button rather than being hidden: phones
        had no site search at all, and a second trigger would have meant a second instance of this component and a
        second global ⌘K listener, which toggles the dialog twice. The visible text becomes `sr-only` instead of
        being removed, so the accessible name is the same "Search…" at every width.
      */}
      <Dialog.Trigger className="inline-flex size-9 items-center justify-center gap-2 rounded-md border border-input bg-muted/50 text-[13px] text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:w-56 sm:justify-start sm:px-3">
        <Search aria-hidden className="size-4 shrink-0" />
        <span className="sr-only sm:not-sr-only sm:flex-1 sm:text-left">Search…</span>
        <span className="pointer-events-none hidden items-center gap-1 sm:flex">
          <Kbd>{mod}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-x-4 top-[20vh] z-50 mx-auto max-w-lg focus:outline-none"
        >
          <Dialog.Title className="sr-only">Search the docs</Dialog.Title>
          <Command
            label="Command menu"
            className="w-full overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-4 text-muted-foreground" />
              <Command.Input
                autoFocus
                placeholder="Type a command or search…"
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </Command.Empty>

              <Command.Group heading="Links" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
                {mainNav.map((item) => (
                  <Item key={item.href} onSelect={() => run(() => router.push(item.href))}>
                    <Circle className="size-3" />
                    {item.title}
                  </Item>
                ))}
              </Command.Group>

              {docsNav.map((group) => (
                <Command.Group
                  key={group.title}
                  heading={group.title}
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {group.items.map((item) => (
                    <Item key={item.href} onSelect={() => run(() => router.push(item.href))}>
                      <FileText className="size-3" />
                      {item.title}
                    </Item>
                  ))}
                </Command.Group>
              ))}

              <Command.Group heading="Theme" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
                <Item onSelect={() => run(() => setTheme("light"))}>
                  <Sun className="size-3" /> Light
                </Item>
                <Item onSelect={() => run(() => setTheme("dark"))}>
                  <Moon className="size-3" /> Dark
                </Item>
                <Item onSelect={() => run(() => setTheme("system"))}>
                  <Laptop className="size-3" /> System
                </Item>
              </Command.Group>
            </Command.List>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd>
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
              <span className="ml-auto flex items-center gap-1.5">
                <Kbd>{mod}</Kbd>
                <Kbd>K</Kbd>
                or
                <Kbd>/</Kbd>
              </span>
            </div>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Item({ children, onSelect }: { children: React.ReactNode; onSelect: () => void }) {
  return (
    <Command.Item
      onSelect={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm",
        "aria-selected:bg-accent aria-selected:text-accent-foreground",
      )}
    >
      {children}
    </Command.Item>
  );
}

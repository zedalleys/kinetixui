"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Github, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { mainNav, siteConfig } from "@/lib/site";
import { CommandMenu } from "./command-menu";
import { ModeToggle } from "./mode-toggle";
import { MobileNav } from "./mobile-nav";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      {/* row 1 — identity + tools */}
      <div className="mx-auto flex h-12 max-w-screen-2xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-6">
            <Layers className="size-[18px]" />
          </span>
          <span className="font-display text-[15px] font-bold uppercase tracking-[0.18em]">
            Kinetix<span className="text-primary">ui</span>
          </span>
        </Link>

        <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">
          v{siteConfig.version} — beta
        </span>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:block">
            <CommandMenu />
          </div>
          <Link
            href={siteConfig.repo}
            target="_blank"
            rel="noreferrer"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="GitHub"
          >
            <Github className="size-4" />
          </Link>
          <ModeToggle />
          <MobileNav />
        </div>
      </div>

      {/* row 2 — numbered section index (desktop) */}
      <nav
        aria-label="Primary"
        className="mx-auto hidden h-10 max-w-screen-2xl items-stretch border-t border-border px-4 text-sm sm:px-6 md:flex lg:px-8"
      >
        {mainNav.map((item, i) => {
          const active =
            item.href === "/docs" ? pathname.startsWith("/docs") : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-2 px-4 font-medium transition-colors",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="font-mono text-[10px] text-muted-foreground/70 transition-colors group-hover:text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              {item.title}
              {item.soon && (
                <span className="rounded-[3px] border border-border px-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  soon
                </span>
              )}
              <span
                className={cn(
                  "absolute inset-x-4 -bottom-px h-0.5 bg-primary transition-transform duration-300",
                  active ? "scale-x-100" : "scale-x-0",
                )}
              />
            </Link>
          );
        })}
      </nav>

      {/* kinetic hairline */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
    </header>
  );
}

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
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-6">
            <Layers className="size-[18px]" />
          </span>
          <span className="font-display text-[15px] font-bold uppercase tracking-[0.18em]">
            Kinetix<span className="text-primary">ui</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          {mainNav.map((item) => {
            const active =
              item.href === "/docs" ? pathname.startsWith("/docs") : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-md px-3 py-1.5 font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.title}
                <span
                  className={cn(
                    "absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary transition-transform duration-300",
                    active ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </Link>
            );
          })}
        </nav>

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
      {/* kinetic hairline */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
    </header>
  );
}

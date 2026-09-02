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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Layers className="size-5 text-primary" />
          <span>{siteConfig.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex">
          {mainNav.map((item) => {
            const active = item.href === "/docs" ? pathname.startsWith("/docs") : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 transition-colors hover:text-foreground",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {item.title}
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
    </header>
  );
}

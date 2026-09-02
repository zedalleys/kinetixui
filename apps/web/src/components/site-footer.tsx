import Link from "next/link";
import { siteConfig } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-8">
      <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
        <p>
          Built with the <span className="text-foreground">Strata</span> design system. Tokens compiled from{" "}
          <Link href={siteConfig.figma} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
            Figma
          </Link>{" "}
          via Style Dictionary.
        </p>
        <Link href={siteConfig.repo} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-foreground">
          Source
        </Link>
      </div>
    </footer>
  );
}

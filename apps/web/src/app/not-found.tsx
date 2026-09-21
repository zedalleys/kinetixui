import type { Metadata } from "next";
import Link from "next/link";

// Next serves this with a 404 status, which is what keeps it out of the index; `noindex` is belt-and-braces
// for the case where something links to a missing page and a crawler renders it anyway.
export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const LINKS = [
  { href: "/docs", label: "Documentation" },
  { href: "/components", label: "Components" },
  { href: "/docs/installation", label: "Installation" },
  { href: "/docs/changelog", label: "Changelog" },
];

export default function NotFound() {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-24 sm:px-6 lg:px-8">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        That URL doesn&apos;t exist. If you followed a link from elsewhere on the site, it&apos;s a bug worth
        reporting.
      </p>
      <ul className="mt-8 flex flex-wrap gap-2">
        {LINKS.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

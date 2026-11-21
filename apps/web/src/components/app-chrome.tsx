"use client";

import { usePathname } from "next/navigation";

/**
 * Routes that render an application workspace rather than a marketing page.
 *
 * The Create Studio editor used to inherit the site header, the site footer and the page's own
 * scrolling document. Measured at 1440x1000 that left the design canvas 498px — 49.8% of the
 * viewport — inside an 1838px scrolling page, and at 768x1024 the canvas started entirely below
 * the fold (0px visible without scrolling). An editor is not a page: its chrome belongs to the
 * application, and its height is the viewport.
 *
 * The public `/create` landing page is deliberately NOT in this list. It stays a marketing page.
 * Only the editor itself takes the application shell, and the route keeps its own URL so existing
 * links and deep links are unaffected.
 */
export const APP_SHELL_ROUTES = ["/create/studio"] as const;

export function isAppShellRoute(pathname: string): boolean {
  return APP_SHELL_ROUTES.some((route) => pathname === route || pathname.startsWith(route + "/"));
}

export function AppChrome({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";

  // The application shell keeps `#main-content` so the skip link still lands on the editor, and
  // keeps a single `<main>` landmark, but renders neither the marketing header nor the footer.
  if (isAppShellRoute(pathname)) {
    return (
      <div className="relative flex h-dvh flex-col overflow-hidden" data-app-shell="editor">
        <main id="main-content" className="min-h-0 flex-1">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      {header}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {footer}
    </div>
  );
}

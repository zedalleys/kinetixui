"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { analytics, startAnalytics } from "@/lib/analytics";
import { trackLinkClick, trackRouteView } from "@/lib/analytics-surfaces";

/**
 * Starts analytics, reports one page view per route change, classifies that route (docs / installation /
 * component / changelog), and listens for link clicks. Renders nothing.
 *
 * The client boundary is this component alone: the root layout stays a server component and `children` are not
 * wrapped. It uses `usePathname()` only — deliberately not `useSearchParams()` — so it needs no Suspense
 * boundary, doesn't opt any page out of static rendering, and can never see a query string.
 *
 * Effects run after hydration, on the client only, so there is nothing to render on the server and nothing to
 * mismatch. React StrictMode's double effect is harmless: `startAnalytics` is idempotent, and StrictMode's
 * double effect happens in development, where analytics is off anyway.
 *
 * LINK CLICKS use one delegated listener rather than a wrapper around every link, so server-rendered pages and
 * MDX stay server components. A product CTA opts in with `ctaAttrs(...)` data attributes; outbound links to our
 * GitHub repo, our npm packages and a short list of external hosts are recognised by their destination. The
 * rules, and why an ordinary internal link produces nothing, are in `lib/analytics-surfaces.ts`.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    void startAnalytics();
  }, []);

  useEffect(() => {
    // `pathname` changes on client-side navigation and on first render, so this covers the initial page view too.
    // The semantic view event follows it, once per navigation: this effect only re-runs when the path changes.
    if (!pathname) return;
    analytics.pageview(pathname);
    trackRouteView(pathname);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // the primary button (click) or the middle button (auxclick, "open in new tab"); never a right-click
      if (event.button !== 0 && event.button !== 1) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (anchor instanceof HTMLAnchorElement) trackLinkClick(anchor, window.location.pathname, window.location.origin);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("auxclick", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("auxclick", onClick);
    };
  }, []);

  return null;
}

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { analytics, startAnalytics } from "@/lib/analytics";

/**
 * Starts analytics and reports one page view per route change. Renders nothing.
 *
 * The client boundary is this component alone: the root layout stays a server component and `children` are not
 * wrapped. It uses `usePathname()` only — deliberately not `useSearchParams()` — so it needs no Suspense
 * boundary, doesn't opt any page out of static rendering, and can never see a query string.
 *
 * Effects run after hydration, on the client only, so there is nothing to render on the server and nothing to
 * mismatch. React StrictMode's double effect is harmless: `startAnalytics` is idempotent, and StrictMode's
 * double effect happens in development, where analytics is off anyway.
 */
export function AnalyticsProvider() {
  const pathname = usePathname();

  useEffect(() => {
    void startAnalytics();
  }, []);

  useEffect(() => {
    // `pathname` changes on client-side navigation and on first render, so this covers the initial page view too
    if (pathname) analytics.pageview(pathname);
  }, [pathname]);

  return null;
}

"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { readVercelAnalyticsEnv, shouldLoadVercelAnalytics, speedInsightsBeforeSend, vercelBeforeSend } from "@/lib/analytics-vercel";

/**
 * Mounts Vercel Web Analytics and Speed Insights behind the same gate as PostHog. Renders nothing until an effect
 * has checked the hostname, so the server render and dev, test and preview builds never inject either script. The
 * React entry points (not `/next`) are used so nothing reads `useSearchParams`.
 *
 * PAGE VIEWS FOLLOW THE PATHNAME, not the history API. Passing `route` turns the script's own `pushState` tracking
 * off; otherwise a query-only change (the changelog filter pushes `?…`) would count as another view of the same
 * page once `beforeSend` has cut the query. Every route on this site is a literal path, so `route` is the pathname.
 * Rules and reasons: `lib/analytics-vercel.ts`.
 */
export function VercelAnalytics() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(shouldLoadVercelAnalytics(readVercelAnalyticsEnv(window.location.hostname)));
  }, []);

  if (!enabled) return null;
  return (
    <>
      <Analytics mode="production" route={pathname} path={pathname} beforeSend={(event) => vercelBeforeSend(event)} />
      <SpeedInsights route={pathname} beforeSend={(event) => speedInsightsBeforeSend(event)} />
    </>
  );
}

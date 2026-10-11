"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { readVercelAnalyticsEnv, shouldLoadVercelAnalytics, speedInsightsBeforeSend, vercelBeforeSend } from "@/lib/analytics-vercel";

/**
 * Mounts Vercel Web Analytics and Speed Insights behind the same gate as PostHog. Renders nothing until an effect
 * has checked the hostname, so the server render and dev, test and preview builds never inject either script. The
 * React entry points (not `/next`) are used so nothing reads `useSearchParams`; both scripts follow client-side
 * navigations themselves, and every route on this site is a literal path, so `/next`'s dynamic-route grouping adds
 * nothing.
 * Rules and reasons: `lib/analytics-vercel.ts`.
 */
export function VercelAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(shouldLoadVercelAnalytics(readVercelAnalyticsEnv(window.location.hostname)));
  }, []);

  if (!enabled) return null;
  return (
    <>
      <Analytics mode="production" beforeSend={(event) => vercelBeforeSend(event)} />
      <SpeedInsights beforeSend={(event) => speedInsightsBeforeSend(event)} />
    </>
  );
}

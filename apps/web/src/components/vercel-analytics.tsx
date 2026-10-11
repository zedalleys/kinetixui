"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { readVercelAnalyticsEnv, shouldLoadVercelAnalytics, vercelBeforeSend } from "@/lib/analytics-vercel";

/**
 * Mounts Vercel Web Analytics behind the same gate as PostHog. Renders nothing until an effect has checked the
 * hostname, so the server render and dev, test and preview builds never inject the script. The React entry point
 * (not `/next`) is used so nothing reads `useSearchParams`; the script follows client-side navigations itself.
 * Rules and reasons: `lib/analytics-vercel.ts`.
 */
export function VercelAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(shouldLoadVercelAnalytics(readVercelAnalyticsEnv(window.location.hostname)));
  }, []);

  return enabled ? <Analytics mode="production" beforeSend={(event) => vercelBeforeSend(event)} /> : null;
}

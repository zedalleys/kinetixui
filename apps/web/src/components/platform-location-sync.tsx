"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { notifyLocationChanged } from "@/lib/platform-preference";

/**
 * Tells the platform store when a client-side navigation changed the URL, so `?platform=` is re-read on the
 * page it is on and dropped on the next one. Renders nothing.
 *
 * It reads `useSearchParams()`, so the root layout mounts it inside its own `<Suspense fallback={null}>`: only
 * this empty component waits for the client, and no page is opted out of static rendering. It never reads the
 * query's contents itself and sends nothing anywhere; the store parses `platform` through `parsePlatform`.
 */
export function PlatformLocationSync() {
  const pathname = usePathname();
  const params = useSearchParams();
  useEffect(() => {
    notifyLocationChanged();
  }, [pathname, params]);
  return null;
}

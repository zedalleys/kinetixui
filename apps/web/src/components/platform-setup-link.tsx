"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ctaAttrs } from "@/lib/analytics-surfaces";
import type { AnalyticsSource } from "@/lib/analytics";
import { PLATFORM_DEFINITIONS } from "@/lib/platform-parity";
import { manifestPlatformFor, usePreferredPlatform } from "@/lib/platform-preference";
import { SETUP_HREF } from "@/lib/platform-tabs";

/**
 * "Installation" that goes to the setup of the platform the reader chose (BD-W4 F-04). A use case says "on the
 * platform you chose" and used to link React's setup whatever that choice was. The platform is the shared remembered
 * one (a code tab on any component or block, or `?platform=`); the server render and a reader with no choice get
 * React, so hydration never disagrees. The CTA target stays `installation`, which counts towards neither QE nor AI.
 */
export function PlatformSetupLink({ source, className }: { source: AnalyticsSource; className?: string }) {
  const platform = manifestPlatformFor(usePreferredPlatform()) ?? "React";
  const def = PLATFORM_DEFINITIONS[platform];
  return (
    <Link href={SETUP_HREF[platform]} data-setup-platform={platform} className={className} {...ctaAttrs(source, "installation")}>
      {platform === "React" ? "Read installation" : `${def.label} setup`}
      {def.maturity !== "stable" && <>{" "}<span className="font-normal text-muted-foreground">· {def.maturity}</span></>}
      <ArrowRight aria-hidden className="size-4 rtl:-scale-x-100" />
    </Link>
  );
}

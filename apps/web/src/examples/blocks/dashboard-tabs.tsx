"use client";

import * as React from "react";
import { AspectRatio, Metric, Tabs, TabsContent, TabsList, TabsTrigger } from "@kinetixui/ui";

// kx-block:start
const PANELS = [
  {
    value: "overview",
    label: "Overview",
    metrics: [
      { label: "Sessions", value: "48,271", trend: "up" as const, change: "+12.4%" },
      { label: "Sign-ups", value: "1,204", trend: "up" as const, change: "+3.1%" },
      { label: "Churn", value: "1.8%", trend: "down" as const, change: "−0.4%" },
    ],
    caption: "Sessions, last 30 days",
  },
  {
    value: "traffic",
    label: "Traffic",
    metrics: [
      { label: "Direct", value: "21,904", trend: "up" as const, change: "+8.0%" },
      { label: "Search", value: "18,442", trend: "up" as const, change: "+15.2%" },
      { label: "Referral", value: "7,925", trend: "neutral" as const, change: "0.0%" },
    ],
    caption: "Sources, last 30 days",
  },
];

export function DashboardTabsBlock() {
  const [tab, setTab] = React.useState("overview");

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full max-w-2xl">
      <TabsList>
        {PANELS.map((panel) => (
          <TabsTrigger key={panel.value} value={panel.value}>
            {panel.label}
          </TabsTrigger>
        ))}
      </TabsList>
      {PANELS.map((panel) => (
        <TabsContent key={panel.value} value={panel.value} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {panel.metrics.map((metric) => (
              <Metric key={metric.label} {...metric} />
            ))}
          </div>
          {/*
            The chart's box is reserved before the chart exists. Without a ratio the panel is short, then
            grows when the data lands, and everything under it jumps — including whatever the reader was
            about to click.
          */}
          <AspectRatio ratio={16 / 9}>
            <div className="flex size-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              {panel.caption}
            </div>
          </AspectRatio>
        </TabsContent>
      ))}
    </Tabs>
  );
}
// kx-block:end

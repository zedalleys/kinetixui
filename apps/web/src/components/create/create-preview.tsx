"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { PreviewMode, PreviewScene } from "@/lib/create/config";
import { DashboardScene } from "./scenes/dashboard-scene";

/** Scene id → what renders it. A second scene is a new entry here and a new file; nothing else moves. */
const SCENES: Record<PreviewScene, { label: string; render: () => React.ReactNode }> = {
  dashboard: { label: "Dashboard", render: () => <DashboardScene /> },
};

export function sceneLabel(scene: PreviewScene): string {
  return SCENES[scene].label;
}

/**
 * The theme boundary.
 *
 * Two things are applied to one element, and both are needed:
 *
 *   1. `.theme-light` / `.dark` — the site's own full token contract for the chosen appearance. This is
 *      what stops the page's theme leaking IN: without it a light preview inside a dark page inherits
 *      `--warning`, `--info`, `--chart-*` and everything else Create does not let you edit.
 *   2. the inline custom properties — the user's values, which win over the class because an inline
 *      declaration beats a class selector.
 *
 * And because both live on this element rather than on `:root`, nothing leaks OUT: the workspace chrome
 * around it — sidebar, header, output panel — keeps the site's theme and stays readable no matter what
 * the previewed theme does to contrast. That is the property that makes a builder usable at all; a
 * sidebar that recolours itself with the preview can become unreadable exactly when you need to fix it.
 */
export function CreatePreview({
  mode,
  scene,
  style,
  className,
}: {
  mode: PreviewMode;
  scene: PreviewScene;
  style: Record<string, string>;
  className?: string;
}) {
  return (
    <div
      data-create-preview-root=""
      data-mode={mode}
      className={cn(mode === "dark" ? "dark" : "theme-light", "h-full", className)}
      style={style as React.CSSProperties}
    >
      {SCENES[scene].render()}
    </div>
  );
}

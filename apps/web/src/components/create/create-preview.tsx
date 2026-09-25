"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { PreviewMode, PreviewScene } from "@/lib/create/config";
import { DashboardScene } from "./scenes/dashboard-scene";
import { FormScene } from "./scenes/form-scene";

/** Scene id → what renders it. A third scene is a new entry and a new file; nothing else moves. */
const SCENES: Record<PreviewScene, { label: string; render: () => React.ReactNode }> = {
  dashboard: { label: "Dashboard", render: () => <DashboardScene /> },
  form: { label: "Form", render: () => <FormScene /> },
};

export function sceneLabel(scene: PreviewScene): string {
  return SCENES[scene].label;
}

export const SCENE_LABELS: Record<PreviewScene, string> = {
  dashboard: SCENES.dashboard.label,
  form: SCENES.form.label,
};

/**
 * The theme boundary.
 *
 * Two things are applied to one element, and both are needed:
 *
 *   1. `.theme-light` / `.dark` — the site's own full token contract for the chosen appearance. This is
 *      what stops the page's theme leaking IN: without it a light preview inside a dark page inherits
 *      every token Create does not generate.
 *   2. the inline custom properties — the resolved theme, which wins because an inline declaration beats
 *      a class selector.
 *
 * And because both live here rather than on `:root`, nothing leaks OUT: the workspace chrome keeps the
 * site's theme and stays readable no matter what the previewed theme does to contrast. A sidebar that
 * recoloured itself with the preview would become unreadable exactly when you needed it to fix that.
 *
 * `dragging` disables transitions inside the boundary while a picker slider is moving (see globals.css) —
 * otherwise every component animates toward each intermediate colour and the preview trails the pointer.
 */
export function CreatePreview({
  mode,
  scene,
  style,
  dragging,
  className,
}: {
  mode: PreviewMode;
  scene: PreviewScene;
  style: Record<string, string>;
  dragging?: boolean;
  className?: string;
}) {
  return (
    <div
      data-create-preview-root=""
      data-mode={mode}
      data-dragging={dragging ? "true" : undefined}
      className={cn(mode === "dark" ? "dark" : "theme-light", "h-full", className)}
      style={style as React.CSSProperties}
    >
      {SCENES[scene].render()}
    </div>
  );
}

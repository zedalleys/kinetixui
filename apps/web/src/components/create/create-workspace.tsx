"use client";

import * as React from "react";
import {
  Button,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@kinetixui/ui";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import {
  DEFAULT_CREATE_CONFIG,
  createReducer,
  isDefaultConfig,
  type CreateConfig,
} from "@/lib/create/config";
import { resolveTheme } from "@/lib/create/theme-adapter";
import { CopyCssButton } from "./create-output";
import { CreatePreview, sceneLabel } from "./create-preview";
import { CreateSidebar } from "./create-sidebar";

/**
 * The workspace shell.
 *
 * All of Create's state is one reducer over one typed config (lib/create/config.ts), and every panel is a
 * pure function of it. That is deliberate: a builder whose controls each own a slice of state is the kind
 * of thing that grows a "why is the preview out of step with the output" bug the first time a second
 * control is added, and PR 2 adds a lot of controls.
 *
 * The layout is two columns on desktop and one on a phone, where the configuration moves into a sheet
 * rather than being squeezed beside the preview. The preview is the thing that has to stay visible: it is
 * what the page is for, and a builder you have to close to see your own change is not a builder.
 */
export function CreateWorkspace({ initialConfig }: { initialConfig?: CreateConfig } = {}) {
  const [config, dispatch] = React.useReducer(createReducer, initialConfig ?? DEFAULT_CREATE_CONFIG);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const theme = React.useMemo(() => resolveTheme(config), [config]);
  const isDefault = isDefaultConfig(config);

  const sidebar = <CreateSidebar config={config} theme={theme} dispatch={dispatch} />;

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── header ───────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Create</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Customize the design language. Preview it on real Kinetix components.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="Ghost"
            onClick={() => dispatch({ type: "reset" })}
            disabled={isDefault}
          >
            <RotateCcw className="size-4" aria-hidden />
            Reset
          </Button>
          <CopyCssButton css={theme.css} />
        </div>
      </header>

      {/* ── mobile: configuration lives in a sheet, the preview keeps the page ── */}
      <div className="mt-6 lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="Outline" className="w-full">
              <SlidersHorizontal className="size-4" aria-hidden />
              Customize
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85svh] overflow-y-auto">
            <SheetHeader className="text-start">
              <SheetTitle>Customize</SheetTitle>
              <SheetDescription>
                Changes apply to the preview as you type. Close this to see it full width.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">{sidebar}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ── workspace ────────────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[20rem_minmax(0,1fr)] xl:grid-cols-[24rem_minmax(0,1fr)]">
        {/* The configuration panel keeps the SITE's theme — see create-preview.tsx. It is hidden rather
            than unmounted below lg so the sheet owns a single copy of the controls, not a second one. */}
        <aside aria-label="Configuration" className="hidden min-w-0 lg:block">
          {sidebar}
        </aside>

        <section aria-labelledby="create-preview-heading" className="min-w-0">
          <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
            <div className="flex items-baseline gap-4">
              <span className="font-mono text-[11px] font-medium text-primary">[05]</span>
              {/* Named for what it is. It is a browser rendering the web components — not a SwiftUI,
                  Compose or Flutter preview, and it must never be captioned as one. */}
              <h2 id="create-preview-heading" className="eyebrow">
                Kinetix theme preview
              </h2>
            </div>
            <span className="font-mono text-[11px] lowercase tracking-wide text-muted-foreground">
              {sceneLabel(config.previewScene)} · {config.mode}
            </span>
          </div>

          {/* A framed canvas with its own scroll, so a tall scene never stretches the page and the
              workspace chrome stays where the user left it. */}
          <div className="mt-4 overflow-hidden rounded-xl border border-border shadow-sm">
            <div className="max-h-[70svh] min-h-[32rem] overflow-y-auto">
              <CreatePreview mode={config.mode} scene={config.previewScene} style={theme.style} />
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Real <code className="rounded bg-muted px-1 font-mono text-xs text-foreground">@kinetixui/ui</code>{" "}
            components, rendered with the theme above. The output is web CSS custom properties — the same
            block{" "}
            <a href="/docs/cli" className="font-medium text-primary underline underline-offset-4">
              <code className="font-mono text-xs">kinetixui theme build</code>
            </a>{" "}
            writes.
          </p>
        </section>
      </div>
    </div>
  );
}

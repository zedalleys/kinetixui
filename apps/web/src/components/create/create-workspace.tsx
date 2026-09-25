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
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_CREATE_CONFIG,
  PREVIEW_SCENES,
  configKey,
  createReducer,
  isDefaultConfig,
  type CreateConfig,
} from "@/lib/create/config";
import { resolveTheme } from "@/lib/create/theme-adapter";
import { PRESET_PARAM, decodeIntoConfig, randomizeConfig, type PresetError } from "@/lib/create/preset";
import { analytics } from "@/lib/analytics";
import { CreateActions } from "./create-actions";
import { CreatePreview, SCENE_LABELS } from "./create-preview";
import { CreateSidebar } from "./create-sidebar";

/**
 * The workspace shell.
 *
 * All of Create's state is one reducer over one typed config, and every panel is a pure function of it.
 * The resolve is memoized on a stable key rather than on the object, because a picker drag produces a new
 * config object on every pointer move and object identity would defeat the memo on the one interaction
 * that needs it most (§59, §60).
 */
/**
 * The URL is a share artifact, not live state.
 *
 * Writing the query string as the user drags a slider would put hundreds of entries in their history and
 * make Back mean nothing. So the address bar is written in exactly two places — after Share, and cleared
 * by Reset — and always with `replaceState`, which updates the link you would copy without adding a step
 * to go back through. Editing after sharing leaves the old link in the bar, which is why the workspace
 * says so rather than pretending the URL keeps up.
 */
function writeUrl(url: string) {
  window.history.replaceState(window.history.state, "", url);
}

function clearPresetFromUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PRESET_PARAM)) return;
  url.searchParams.delete(PRESET_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

/** Read `?preset=` once, on mount. Returns the decoded config, or the reason it could not be read. */
function usePresetFromUrl(): { config?: CreateConfig; error?: PresetError; loaded: boolean } {
  const [state] = React.useState(() => {
    if (typeof window === "undefined") return { loaded: false };
    const code = new URLSearchParams(window.location.search).getAll(PRESET_PARAM)[0];
    if (!code) return { loaded: false };

    const result = decodeIntoConfig(code);
    return result.ok ? { config: result.config, loaded: true } : { error: result.error, loaded: false };
  });
  return state;
}

export function CreateWorkspace({ initialConfig }: { initialConfig?: CreateConfig } = {}) {
  const fromUrl = usePresetFromUrl();
  const [config, dispatch] = React.useReducer(
    createReducer,
    initialConfig ?? fromUrl.config ?? DEFAULT_CREATE_CONFIG,
  );
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);

  // Reported once, on the load that carried a preset — not on every render, and never with the payload.
  React.useEffect(() => {
    if (fromUrl.loaded) analytics.track("preset_loaded", { source: "create_workspace" });
  }, [fromUrl.loaded]);

  const key = configKey(config);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` is a complete, stable digest of `config`
  const theme = React.useMemo(() => resolveTheme(config), [key]);
  const isDefault = isDefaultConfig(config);

  const sidebar = (
    <CreateSidebar config={config} theme={theme} dispatch={dispatch} onDragChange={setDragging} />
  );

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── header ───────────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.02em] md:text-4xl">Create</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Shape the Kinetix design language visually, then inspect the semantic tokens and web CSS
            underneath.
          </p>
        </div>

        <CreateActions
          config={config}
          css={theme.css}
          cssIsEmpty={theme.cssIsEmpty}
          isDefault={isDefault}
          onRandomize={() => dispatch({ type: "replace", config: randomizeConfig(config) })}
          onReset={() => {
            dispatch({ type: "reset" });
            // A stale ?preset= would otherwise resurrect the old design on the next reload — Reset has to
            // clear the address bar as well as the state.
            clearPresetFromUrl();
          }}
          onShared={(url) => writeUrl(url)}
        />
      </header>

      {/* ── mobile: configuration in a sheet, preview keeps the page ────── */}
      {/* A shared preset says so, quietly. A modal would interrupt the thing the link was for; a status
          line is announced by a screen reader and ignorable by everyone else. */}
      {fromUrl.loaded && (
        <p role="status" data-preset-status="loaded" className="mt-4 text-sm text-muted-foreground">
          Loaded a shared preset. Everything below is editable, and Reset returns to the Kinetix default.
        </p>
      )}
      {fromUrl.error && (
        <div role="alert" data-preset-status="error" className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <span>
            <span className="text-destructive">That preset link could not be read.</span>{" "}
            {fromUrl.error.message} Create has opened with the Kinetix default instead.
          </span>
        </div>
      )}

      <div className="mt-6 lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button size="sm" variant="Outline" className="w-full">
              <SlidersHorizontal className="size-4" aria-hidden />
              Customize
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="flex max-h-[85svh] flex-col gap-0 p-0">
            {/* The title stays put while the controls scroll — with this many sections, a header that
                scrolled away would leave no way back out without hunting for the close button. */}
            <SheetHeader className="shrink-0 border-b border-border p-6 text-start">
              <SheetTitle>Customize</SheetTitle>
              <SheetDescription>
                Changes apply to the preview as you make them. Close this to see it full width.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">{sidebar}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* ── workspace ────────────────────────────────────────────────────── */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[22rem_minmax(0,1fr)] xl:grid-cols-[26rem_minmax(0,1fr)]">
        {/* The configuration panel keeps the SITE's theme — see create-preview.tsx. Hidden rather than
            unmounted below lg so the sheet owns a single copy of the controls, not a second one. */}
        <aside aria-label="Configuration" className="hidden min-w-0 lg:block">
          {sidebar}
        </aside>

        <section aria-labelledby="create-preview-heading" className="min-w-0">
          {/* Sticky on desktop only, and only as tall as the viewport: the panel is long now, and a
              preview that scrolled away would mean judging a colour from memory. */}
          <div className="lg:sticky lg:top-20">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-[11px] font-medium text-primary">[08]</span>
                {/* Named for what it is. A browser rendering the web components — not a SwiftUI, Compose
                    or Flutter preview, and never to be captioned as one. */}
                <h2 id="create-preview-heading" className="eyebrow">
                  Kinetix theme preview
                </h2>
              </div>

              <div role="group" aria-label="Preview scene" className="flex gap-1">
                {PREVIEW_SCENES.map((scene) => (
                  <button
                    key={scene}
                    type="button"
                    aria-pressed={config.previewScene === scene}
                    onClick={() => dispatch({ type: "set-scene", scene })}
                    className={cn(
                      "rounded-md border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      config.previewScene === scene
                        ? "border-primary bg-accent font-medium text-accent-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {SCENE_LABELS[scene]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-border shadow-sm">
              <div className="max-h-[70svh] min-h-[32rem] overflow-y-auto">
                <CreatePreview
                  mode={config.mode}
                  scene={config.previewScene}
                  style={theme.style}
                  dragging={dragging}
                />
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              Real <code className="rounded bg-muted px-1 font-mono text-xs text-foreground">@kinetixui/ui</code>{" "}
              components, rendered with the configuration on the left. The output is web CSS custom
              properties — see{" "}
              <a href="/docs/theming" className="font-medium text-primary underline underline-offset-4">
                Theming
              </a>{" "}
              for what each one controls.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

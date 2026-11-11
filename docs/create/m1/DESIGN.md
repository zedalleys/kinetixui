---
name: KinetixUI Create Studio M1
description: Local component editor extending the existing Kinetic Weave identity.
colors:
  studio-indigo: "#6054f4"
  studio-action: "#5143db"
  shell-action: "hsl(245 68% 56%)"
  shell-action-foreground: "hsl(0 0% 100%)"
  shell-ring: "hsl(245 88% 64%)"
typography:
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "2rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-.03em"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: "-.025em"
  panel-title:
    fontSize: ".875rem"
    fontWeight: 600
  selection-title:
    fontSize: "1rem"
    fontWeight: 600
  empty-title:
    fontSize: "1.125rem"
    fontWeight: 600
  label:
    fontSize: ".75rem"
    fontWeight: 500
  metadata:
    fontSize: ".75rem"
    lineHeight: 1.6
  library-title:
    fontSize: ".8125rem"
    fontWeight: 550
  library-detail:
    fontSize: ".6875rem"
  control:
    fontSize: ".8125rem"
rounded:
  field: "4px"
  local-control: ".375rem"
  library-button: "8px"
  workspace: ".75rem"
spacing:
  quarter: ".25rem"
  half: ".5rem"
  three-quarter: ".75rem"
  unit: "1rem"
  section: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.shell-action}"
    textColor: "{colors.shell-action-foreground}"
    rounded: "{rounded.library-button}"
    padding: "12px 16px"
  input:
    rounded: "{rounded.field}"
    padding: "12px"
  native-select:
    rounded: "{rounded.local-control}"
    padding: ".5rem"
  workspace:
    rounded: "{rounded.workspace}"
---

# Design System: KinetixUI Create Studio M1

## Overview

**Creative North Star: "A connected network, lit."**

This local record describes `/create/studio` as built, extending Kinetic Weave with a working editor. Real library components are the editable material. The user-pinned architecture determines the shell; it is not a new brand direction. The root [DESIGN.md](../../../DESIGN.md) remains homepage-scoped and [PRODUCT.md](../../../PRODUCT.md) retains product and identity authority. These local tokens describe existing declarations and do not add generated library tokens.

**Key Characteristics:**
- Compact Inter controls, flat semantic panels and restrained indigo selection.
- Linked layers, canvas and schema-derived properties.
- Visible save state and explicit local-development limits.

Evidence checked: the root product/design files; the [surface contract](../../../.impeccable/surfaces/create-studio.md); `studio.css`, `create-studio.tsx`, `node-view.tsx`; existing UI Button/Input implementations and Tailwind preset; generated token CSS; the web font setup; and the React exporter/integration guide. No global sidecar exists at `.impeccable/design.json` in this checkout; no global design file was created or changed by this handoff.

## Colors

### Primary

Electric Indigo identifies selection and visible keyboard focus. Studio Action preserves the incumbent accessible-action identity. The actual shell Button fill comes from the separately recorded `shell-action` HSL declaration; do not assume the named hex declaration supplies its computed fill.

### Neutral

Page, card, muted canvas, text, border and field colors inherit the library's semantic `background`, `card`, `muted`, `foreground`, `muted-foreground`, `border` and `input` roles. They are intentionally not frozen into local hex copies. The artboard independently resolves the document preset through the existing Create theme resolver, then uses `.theme-light` or `.dark`; its theme toggle affects the canvas rather than replacing shell theme ownership.

**The Semantic Boundary Rule.** Keep shell identity overrides local; preview and export continue using the existing preset and semantic token contracts.

## Typography

The shell inherits the web application's self-hosted Inter through `--font-sans`, with sans-serif fallback. It introduces no display font. Frontmatter records the local CSS roles; it does not replace the library ramp. Welcome prose has a reading measure of 65ch and line-height 1.7. Empty-state and error prose use .875rem; library detail is deliberately subordinate. Zoom uses tabular numerals.

Library Button medium uses Label Medium (12/16, weight 500, tracking .5px); small uses Label Small (11/16). Input retains Body Medium (14/20, tracking .25px). Those roles come from the existing UI preset, which resolves the inherited sans family. The generated composite token file's Montserrat string is not a newly selected Studio font.

## Layout

The outer container caps at 112rem, centered with 1.5rem padding, reduced to 1rem at 48rem. Spacing follows the existing 8px foundation with 4px subdivisions, expressed in rem for the shell. Product and action rows wrap; names can break anywhere. The workspace has a 38rem minimum height and three columns: 12–15rem navigator, flexible center, 15–19rem inspector. From 75rem it also uses `max(34rem, calc(100svh - 22rem))` height with independently scrolling side panels.

At 75rem and below, the inspector becomes a toggled full-width row under a two-column workspace (12–14rem navigator). At 48rem and below, the workspace stacks; the navigator scrolls within 24rem, library entries flow into available columns, product form gets its own row, and save state/title occupy complete lines. The panel switch and reorder controls wrap, including 320px at 200% text; editor controls must remain inside their panels.

The dotted canvas is an intentionally clipped, independently navigable region. Its dot pitch is 16px. Artboards use intrinsic widths of 390, 768 or 960px; translation and scale form the camera. This is not iframe/media-query viewport emulation: viewport media-query emulation is deferred. Canvas clipping is not permission to clip surrounding controls. Logical borders, margins and padding follow RTL; camera transform origin remains top-left.

## Elevation & Depth

Shell depth comes from semantic surface changes and thin borders, with no decorative shell shadow. Existing library controls, cards and modal overlay retain their own elevation/state rules. Selected layers use an inset indigo stroke; selected canvas nodes and shell keyboard focus use a 2px indigo outline offset by 3px. These are selection/focus indicators, not elevation tokens.

## Shapes

The workspace is softly rounded and clips its internal edges. Local select/error/badge-like status containers use the local control radius; real Inputs and Buttons retain their own library radii. Layer rows are square, full-width targets. Stroke icons come from Lucide; the existing K mark remains identity, with no new illustration.

## Components

**Buttons and fields.** Use the actual library Primary, Outline, Ghost and Secondary variants. Primary hover/active retain the library's 90%/85% fills; Outline and Ghost retain accent/ring state treatments. Shell buttons wrap text and cap at their container width. Library disabled semantics remain native. Inputs retain their state-aware edge, focus shadow and invalid behavior. Native selects use a minimum 2.5rem height and semantic input edge. Labels are associated with controls; icon-only actions have accessible names.

**Layers and inspector.** The multiselect tree uses roving focus, Arrow/Home/End navigation and Space selection; Shift-click adds/removes selections. Tree selection and canvas outlines identify the same nodes. Inspector controls derive from supported adapter schemas; text/number drafts require Apply or Enter, with Escape discarding a field draft. Save/export are blocked while unapplied field drafts remain.

**Canvas and preview.** Editing intercepts leaf interaction and renders leaf controls inert. Preview restores the actual Button, Input, Badge, Card and Tabs behaviors. Canvas arrows pan by 24px, H/V change tools, zoom ranges from 10% to 400%, and Reset restores the camera. Escape exits preview/pan outside editable controls and dialogs. Layout wrappers preserve the supported component structure.

**Status and dialogs.** Save state and notices use status regions; failures use alerts and preserve recovery actions. Upgrade and export use existing library dialogs with focus return. Checkout is visibly unconfigured; no production signup, payment collection or hosted build is claimed. Explicit Save targets the local server, with a recoverable browser draft.

**Accessibility and motion.** Forced colors removes canvas dots and uses Highlight outlines for selected nodes/layers. Reduced motion makes shell scrolling immediate; existing library control transitions follow the library reduced-motion floor. There is no new ambient animation. The browser evidence covers keyboard paths, modal focus return and control containment; it is not manual assistive-technology certification.

Proof: [browser-results.json](../../../../../outputs/create-studio-m1-2026-11-11/browser-results.json) records 14 passing scenarios, no runtime errors and zero scoped axe violations in five states. QA captures alongside it cover desktop light/dark/RTL, mobile, 200% text, forced-colors/reduced-motion, upgrade and the export consumer. Desktop and enlarged inspector captures were directly inspected for this handoff. The [full finish review](../../../../../outputs/create-studio-m1-2026-11-11/finish-review.md) found control wrapping; the [scored-fix verdict](../../../../../outputs/create-studio-m1-2026-11-11/finish-verdict.md) records its resolution and a ship decision limited to that fix. The detector's seven typography advisories compare local roles against the homepage-specific root document, not a new global ramp mandate.

## Do's and Don'ts

### Do:
- Do preserve the real component APIs, semantic roles and linked selection.
- Do keep local save/billing limits visible and controls operable at narrow widths and enlarged text.
- Do keep proof captures as QA evidence; no shipping raster was created for M1. Existing logo and fonts retain their existing provenance.
- Do follow [EXPORT.md](EXPORT.md): export emits React source, theme CSS and integration instructions; the host supplies library/token styles, Tailwind integration, routing and font loading. The consumer QA image is not a pixel-parity promise.

### Don't:
- Don't promote this editor shell or its type sizes into a global brand rewrite.
- Don't treat intrinsic-width preview as viewport media-query emulation or exported source as a hosted verified build.
- Don't canonize the resolved wrapping defect, detector scope advisories or host-font differences as new design rules. The checked browser matrix is Chromium-only; no manual assistive-technology claim is made.

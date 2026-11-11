# Create Studio M1 local editor

## Run locally

From the repository root after installing the locked workspace dependencies:

```sh
pnpm --filter @kinetixui/ui build
pnpm --filter @kinetixui/iot build
KINETIX_CREATE_DEV=1 pnpm --filter @kinetixui/web exec next dev --hostname 127.0.0.1 --port 3137
```

Open http://127.0.0.1:3137/create/studio. Start local workspace, create one product, and use the component library. Explicit Save persists to the local server. A dirty document is also kept as an account/product-scoped browser draft. Reload, start the same local workspace and choose the saved product to reopen. Recover draft validates browser content before use. A stale revision fails with download/reopen recovery rather than overwriting a newer save. Production renders an informational page and rejects the adapter API even if its development flag is set.

## Working slice

- Top actions, product picker, Pages, Library/Layers, canvas and Properties use the existing KinetixUI components, NativeSelect and Checkbox.
- Supported nodes: Button, Input, Card, Badge, Tabs; registered Stack/Grid/Section layouts. Frames are named sections under a page, and products may contain multiple pages/screens.
- Select from the canvas or Layers. Shift-click multi-selects; the inspector shows compatible common fields. Property drafts need Apply/Enter; Escape discards the field draft. Invalid values cannot change the canonical document.
- Insert into the selected container or selected node's parent. Move Up/Down or choose a destination container; no precision drag is required. Parent/child legality and cycles are validated.
- Undo/redo is command-based. Deleted identities remain retired; restoration assigns fresh IDs and rebases history. Pan/zoom, selection and viewport controls are session state.
- Canvas controls support 10–400% zoom, reset, a pan tool and pointer panning. Focus the canvas and use arrows to pan, H/V to choose pan/select; Escape returns from preview/gesture. Mod+Z/Mod+Shift+Z undo/redo outside text fields. Layers has arrow/Home/End navigation and native Space activation.
- Edit mode keeps actual leaf controls inert; Preview restores real component interaction. Editor chrome and product light/dark token resolution are isolated. Existing Kinetic Weave and Electric Indigo are preserved.
- Viewport presets change the intrinsic artboard width. M1 does not emulate another browser viewport's media queries or support breakpoint overrides/freeform resizing. A separate preview viewport is next-sprint work, not claimed as delivered.
- React export gives source/theme/setup/document downloads for the supported subset. See EXPORT.md for consumer verification and its exact limits.
- Second-product creation is denied on the server and opens an upgrade explanation. Checkout is explicitly not configured, with no invented price, payment fields or paid grant.

## Verification and limits

`scripts/create-studio-browser.mjs` targets loopback only and covers the end-to-end local flow, layers/multi-select/reorder/delete/undo/redo, page/frame creation, camera, preview, export, upgrade/focus return, ownership/origin denial, reopen, failed save, two-tab conflict, and an exported consumer. It runs scoped axe checks in light/dark/RTL/mobile/200% text, checks document overflow, and captures forced-colors/reduced-motion views. 200% overflow/axe use Chromium CDP font preferences; screenshot capture uses a 32px root override because Playwright resets CDP preferences during screenshots. No manual screen-reader or native-device certification is claimed.

The native semantic tree/camera containers are documented composition exceptions in the existing dogfooding ledger; rows and controls reuse library components. The generated inventory is regenerated, not edited manually. No live billing, production signup/storage, Figma sync, AI generation, arbitrary catalogue editing, native motion or native page export.

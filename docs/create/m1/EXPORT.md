# M1 React page export

`exportReact` accepts only a validated current CreateProject and uses the same data-only style lowering as the preview. It emits deterministic React TSX, theme CSS from the existing create-theme resolver/exporter, and integration instructions. The React source imports public KinetixUI exports; library internals are never recreated. Text becomes escaped JSON expression data; component names, props, styles and imports are allowlisted. No event source, JSX, HTML or arbitrary CSS from a document is executed. Unsupported nodes/props fail before output.

Button, Input/Label, Card compounds, Badge and Tabs compounds map to their actual APIs. Stack/Grid/Section lower to semantic DOM plus token-derived spacing/layout; sections carry a name. Component wrappers match the editor's layout lowering so selection UI does not change flex-item structure. Pages export as Screen1…ScreenN for an explicit consumer router; this is not a generated full-stack application or five-platform page compiler. Existing theme exports remain independent.

Run the clean consumer fixture:

```sh
pnpm --filter @kinetixui/ui build
pnpm --filter @kinetixui/web exec vitest run src/lib/create-studio/consumer-fixture.test.ts
```

The fixture creates a fresh temporary consumer directory with no Next.js source aliases, links the actual built public UI/token/React packages, typechecks generated source, bundles a production browser entry, and generates CSS with the actual Tailwind preset/content scan. It exercises every supported adapter and two screens. This verifies a clean consumer build against the repository's built packages; it is **not** an independent npm registry reinstall or published-version certification.

Set `KINETIX_CREATE_EXPORT_FIXTURE=/private/tmp/kinetix-create-export-m1` to retain the generated fixture for `scripts/create-studio-browser.mjs`. The browser script serves only those generated static files on a temporary loopback server and operates exported Tabs. Normal fixture tests remove their temporary directory. No fixture or source output is deployed.

Consumer setup: import @kinetixui/tokens/css, /css/dark and /css/extras, configure @kinetixui/ui/tailwind.config with a content glob covering the library dist and generated source, then import generated theme.css. Route components and font loading are the consumer's integration responsibility. Download statuses say source generated; M1 does not claim a hosted per-user build service.

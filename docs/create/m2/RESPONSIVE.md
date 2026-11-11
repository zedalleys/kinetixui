# Create Studio responsive layout

CreateProject v3 stores a single page tree. A layout node can carry `responsive.tablet` and `responsive.desktop` patches. V1 and v2 retain their versioned schemas. V2 to v3 changes the version and preserves all IDs, fields and base values. Opening a saved v2 product exposes the migrated document at the existing revision. A changed save persists v3, and browser draft recovery runs the same migration.

| Layer | Starts at | Effect |
| --- | --- | --- |
| Base | 0 CSS px | Adapter defaults, then explicit base props |
| Tablet | 768 CSS px | Tablet keys override matching base keys |
| Desktop | 960 CSS px | Desktop keys override the accumulated values |

Precedence is per property. A desktop override for gap can inherit direction from tablet. Reset removes the property from that breakpoint and removes empty patches. History records each edit or reset as one command. Nodes, page routes and allocation history are shared across every width.

Stack supports direction, alignment, gap and padding. Grid supports columns, gap and padding. Frame supports padding, gap, width and fixed or fill sizing. Fixed width is bounded by its containing block, and fill uses 100%. Spacing accepts existing token names. Component text, variants and other behavioral props stay at base because there is no CSS mapping for those semantics in this slice. Supported component overrides require a future adapter that preserves a single accessible component instance in both Preview and React export.

Edit uses the selected width to resolve layout directly inside the existing canvas. Preview uses an iframe with its own CSS width and height. The iframe has a fixed shell and grants same-origin DOM access to the parent React renderer. Its sandbox omits scripts, forms, top navigation and popups. The parent copies host stylesheets, resolves the product theme and mounts the supported component tree. The iframe contains no editor chrome. The real library controls receive keyboard input inside it, and Escape returns focus to the Preview control. The product renderer uses CSS media queries and inherits browser preferences for reduced motion and forced colors.

The exporter and the iframe share the same stylesheet lowering. Only nodes with overrides get a generated layout selector. Base values and media rules use the same layout adapter and validated values. No document value can supply arbitrary CSS syntax, event handlers, HTML or imports. Generated React still imports the existing library and emits one tree per screen.

The browser suite loads the same saved tree used to build the clean consumer, compares measured layouts at 390, 767, 768, 769, 959, 960, 961 and 1200 CSS px, and verifies actual iframe dimensions. The test also verifies inherited and overridden inspector states, reset, undo/redo, save/reopen, RTL, theme and keyboard focus. The preview models browser CSS dimensions and preferences. Touch hardware, device pixel ratio and other browser-specific device behavior remain outside these presets.

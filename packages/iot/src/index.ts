/**
 * @kinetixui/iot — a connected-device module for building products that pair, monitor, control and
 * troubleshoot devices.
 *
 * **Experimental.** The API may change without a major version while this is finding its shape.
 *
 * Three entry points, because the useful half of this module has nothing to do with rendering:
 *
 * | import                      | contains                                  |
 * | --------------------------- | ----------------------------------------- |
 * | `@kinetixui/iot`            | everything                                |
 * | `@kinetixui/iot/functions`  | types + pure functions, no React          |
 * | `@kinetixui/iot/react`      | the five React primitives                 |
 *
 * What this module is not: a transport. There is no MQTT, BLE, WebSocket or HTTP client here, no
 * vendor adapter, and no code that parses or executes a device payload. It models what a device *is*
 * so that the layer which talks to one has something honest to render into.
 */
// The models come through ./functions, which re-exports them so that subpath stands alone. Adding a
// second `export * from "./types"` here would re-export the same bindings by two paths, which bundlers
// treat as ambiguous.
export * from "./functions";
export * from "./react";

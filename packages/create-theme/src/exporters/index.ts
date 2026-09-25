/**
 * What an exporter is.
 *
 * Deliberately one function and a name. An exporter takes a resolved theme and returns text; there is no
 * registry, no lifecycle, no plugin loader, because nothing here needs one and every one of those would
 * have to be designed around exporters that do not exist yet.
 *
 * Three exporters exist: `web-css`, `swiftui` and `compose`. The second was the test of this shape and
 * the third was the proof — neither needed a change to the preset schema, the engine or any existing
 * exporter, because the resolved theme already carries colours as hex, radii as numbers and elevation as
 * layers, which is what a platform needs and none of the CSS it does not. A Flutter or Android XML
 * exporter is another file in this directory with a `target` and an `export`; neither exists yet.
 *
 * An exporter is also where a platform's limits get told truthfully. `swiftui` and `compose` both write
 * colours and say in their own headers that they write nothing else, because neither native package has
 * a runtime radius or elevation token to write to. That belongs in the exporter, not in the engine: the
 * theme is complete, and what a target can carry is the target's business.
 *
 * What an exporter must NOT do is repair a theme. If a platform's colour format loses precision, that
 * becomes a term in `guaranteedContrast` and generation adapts — see `swiftUiChannels`. Compose needs no
 * such term: it writes `Color(0xffRRGGBB)`, which is the resolved value exactly.
 *
 * `options` exists so an exporter can be told *how* to write, never *what*: a CSS exporter takes a
 * selector, a Swift exporter would take a type name. If an option would change the theme rather than its
 * formatting, it belongs in the preset instead.
 */
import type { ResolvedCreateTheme } from "../resolve";

export type ThemeExporter<TOptions = void, TResult = string> = {
  /** A stable identifier — `"web-css"`. Shown to users and used in tests; not a file extension. */
  target: string;
  /** Human-readable, for a UI that offers a choice. */
  label: string;
  export(theme: ResolvedCreateTheme, options?: TOptions): TResult;
};

export { cssExporter, exportCss, cssVarOverrides, shadowCss, NOTHING_TO_OVERRIDE, type CssExportOptions } from "./css";
export {
  composeExporter,
  exportCompose,
  kotlinSymbolError,
  kotlinFieldName,
  composeColor,
  DEFAULT_COMPOSE_SYMBOL,
  COMPOSE_COLOR_FIELDS,
  COMPOSE_CHART_STOPS,
  COMPOSE_UNMAPPED_PRESET_ROLES,
  COMPOSE_NATIVE_THEME_GAPS,
  type ComposeExportOptions,
} from "./compose";
export {
  swiftuiExporter,
  exportSwiftUi,
  swiftSymbolError,
  swiftFieldName,
  swiftColor,
  DEFAULT_SWIFT_SYMBOL,
  SWIFT_COLOR_FIELDS,
  SWIFT_CHART_STOPS,
  type SwiftUiExportOptions,
} from "./swiftui";

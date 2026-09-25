/**
 * What an exporter is.
 *
 * Deliberately one function and a name. An exporter takes a resolved theme and returns text; there is no
 * registry, no lifecycle, no plugin loader, because nothing here needs one and every one of those would
 * have to be designed around exporters that do not exist yet.
 *
 * The shape is the contract PR 5 fills in. A SwiftUI, Compose, Flutter or Android XML exporter is a new
 * file in this directory with `target` and `export`, and it needs no change to the preset schema, the
 * engine or any existing exporter — the resolved theme already carries colours as hex, radii as numbers
 * and elevation as layers, which is every value those platforms need and none of the CSS they do not.
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

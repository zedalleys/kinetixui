/**
 * Style Dictionary v4 — KinetixUI cross-platform token engine (config factory).
 *
 * Multi-theme is handled the idiomatic v4 way: one build run per theme, each
 * with its own source set, so light and dark never collide on the same token
 * path. `style-dictionary/build.mjs` drives both runs.
 *
 *   pnpm build:tokens   ->   node style-dictionary/build.mjs
 *
 * Source of truth: /tokens/**  (DTCG, extracted from Figma "Personal Design
 * System", node 3877-10388). Outputs -> packages/tokens/dist/<platform>.
 *
 * Typography composites (tokens/semantic/typography.json) ARE consumed: web
 * `--text-*` shorthands (extras.css) + a `text-*` Tailwind scale, and native
 * text styles via KinetixType.swift / KinetixType.kt / app_text.dart.
 *
 * Motion + scale primitives (tokens/primitives/{motion,opacity,z-index}.json)
 * are theme-independent, like typography: web gets `--duration-*` /
 * `--easing-*` / `--opacity-*` / `--z-index-*` custom properties in
 * globals.css `:root`; native gets KinetixMotion.swift / .kt / .dart (each
 * with Duration/Easing/Opacity/ZIndex groups).
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';
import {
  androidDimen,
  cssEasing,
  dimensionToPx,
  extrasCssFormat,
  hslChannels,
  cssVarName,
  motionComposeFormat,
  motionDartFormat,
  motionSwiftFormat,
  shadowDartFormat,
  swiftUIColorFormat,
  dartColorClassFormat,
  tsNestedFormat,
  typeComposeFormat,
  typeDartFormat,
  typeSwiftFormat,
} from './hooks.mjs';

StyleDictionary.registerTransform(dimensionToPx);
StyleDictionary.registerTransform(cssVarName);
StyleDictionary.registerTransform(androidDimen);
StyleDictionary.registerTransform(hslChannels);
StyleDictionary.registerTransform(cssEasing);
StyleDictionary.registerFormat(tsNestedFormat);
StyleDictionary.registerFormat(extrasCssFormat);
StyleDictionary.registerFormat(typeSwiftFormat);
StyleDictionary.registerFormat(typeComposeFormat);
StyleDictionary.registerFormat(typeDartFormat);
StyleDictionary.registerFormat(swiftUIColorFormat);
StyleDictionary.registerFormat(dartColorClassFormat);
StyleDictionary.registerFormat(motionSwiftFormat);
StyleDictionary.registerFormat(motionComposeFormat);
StyleDictionary.registerFormat(motionDartFormat);
StyleDictionary.registerFormat(shadowDartFormat);

const isType = (t) => t.$type === 'typography';
/** duration / cubicBezier / number — the motion + scale primitive categories
 *  (tokens/primitives/{motion,opacity,z-index}.json). Theme-independent. */
const isMotionOrScale = (t) => ['duration', 'cubicBezier', 'number'].includes(t.$type);
/** motion + scale primitives, plus the spatial scale (spacing + radius) that the native ports also get as
 *  KinetixSpacing / KinetixRadius. Web has --spacing-* / --radius-* from globals.css already. */
const isNativeFoundation = (t) => isMotionOrScale(t) || (t.$type === 'dimension' && ['spacing', 'radius'].includes(t.path[0]));

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = `${ROOT}/packages/tokens/dist`;

const isColor = (t) => t.$type === 'color';
/** semantic tokens that default to another semantic token and must stay a live `var()` reference in
 *  both themes, so a theme that overrides the source token carries the alias with it. */
const ALIAS_TOKENS = new Set(['color.action', 'color.action-foreground', 'color.focus', 'color.link']);
const isSemantic = (t) => t.filePath.includes(`${'/'}semantic${'/'}`);
const isSimpleForCss = (t) => t.$type !== 'shadow' && t.$type !== 'typography';

/**
 * @param {'light'|'dark'} theme
 * @returns full Style Dictionary v4 config for one theme
 */
export function getConfig(theme) {
  const light = theme === 'light';
  return {
    log: { verbosity: 'default', warnings: 'warn' },
    source: [
      `${ROOT}/tokens/primitives/**/*.json`,
      `${ROOT}/tokens/semantic/color.${theme}.json`,
      `${ROOT}/tokens/semantic/shadow.json`,
      // dark overrides the focus-* rings (elevation scale stays as-is)
      ...(light ? [] : [`${ROOT}/tokens/semantic/shadow.dark.json`]),
      `${ROOT}/tokens/semantic/typography.json`,
    ],
    platforms: {
      /* ---------------------------------------------------------- WEB CSS */
      css: {
        transforms: [
          'attribute/cti',
          'kinetix/css-var-name',
          'kinetix/hsl-channels',
          'kinetix/dimension-px',
          'kinetix/css-easing',
        ],
        buildPath: `${DIST}/web/`,
        // Light keeps references (`--action: var(--primary)`). Dark writes resolved values everywhere
        // EXCEPT the alias tokens below: they must stay live references so overriding `--primary` /
        // `--ring` in a theme also moves `action` / `focus` / `link` (see ALIAS_TOKENS).
        options: { outputReferences: (token) => light || ALIAS_TOKENS.has(token.path.join('.')) },
        files: [
          {
            destination: light ? 'globals.css' : 'globals.dark.css',
            format: 'css/variables',
            // colour + dimension only — shadow/typography composites go to extras.css
            filter: (t) => isSimpleForCss(t) && (light || isSemantic(t)),
            options: { selector: light ? ':root' : '.dark' },
          },
        ],
      },

      /* Shadow composites — BOTH passes now. Light writes the full
         :root { --shadow-* + --text-* } set; dark writes .dark { --shadow-focus* }
         only (the focus rings are the sole theme-dependent shadows, and
         typography is theme-independent). */
      'css-extras': {
        transforms: ['attribute/cti', 'kinetix/dimension-px'],
        buildPath: `${DIST}/web/`,
        options: { outputReferences: false },
        files: [
          {
            destination: light ? 'extras.css' : 'extras.dark.css',
            format: 'kinetix/extras-css',
            filter: light
              ? (t) => t.$type === 'shadow' || t.$type === 'typography'
              : (t) => t.$type === 'shadow' && t.path.at(-1).startsWith('focus'),
            options: { selector: light ? ':root' : '.dark' },
          },
        ],
      },

      /* Semantic-only Kotlin theme object — runs on BOTH passes, mirroring
         the css / css-extras split above. Needed by the Compose KinetixTheme
         composable (packages/ui-compose), which requires real light AND dark
         values, unlike every other native platform output (iOS/Flutter stay
         light-only below — nothing else consumes a native dark pass yet). */
      'android-compose-theme': {
        transformGroup: 'compose',
        buildPath: `${DIST}/android/`,
        files: [
          {
            destination: light ? 'Theme.kt' : 'Theme.dark.kt',
            format: 'compose/object',
            filter: (t) => isColor(t) && isSemantic(t),
            options: {
              className: light ? 'KinetixTheme' : 'KinetixThemeDark',
              packageName: 'com.kinetixui.tokens',
            },
          },
        ],
      },

      /* SwiftUI-Color semantic set — also runs on BOTH passes, for the
         packages/ui-swiftui component library (UIColor is UIKit-only and
         can't `swift build` on macOS, so this is Color-valued). Additive:
         the ios-swift block below (KinetixColors.swift / Theme.swift,
         UIColor) is untouched and stays light-only. */
      'ios-swiftui-theme': {
        transforms: ['attribute/cti'],
        buildPath: `${DIST}/ios/`,
        files: [
          {
            destination: light ? 'KinetixColorsSwiftUI.swift' : 'KinetixColorsSwiftUI.dark.swift',
            format: 'kinetix/swiftui-color-enum',
            // top-level semantic colours only — path ['color', <name>].
            // The nested `color.semantic.*` group is internal plumbing (raw
            // Figma error/warning container roles the real tokens alias)
            // and would collide on leaf names like `warning`.
            filter: (t) => isColor(t) && isSemantic(t) && t.path.length === 2,
            options: { className: light ? 'KinetixColorsSwiftUI' : 'KinetixColorsSwiftUIDark' },
          },
        ],
      },

      /* Flutter-Color semantic set — also BOTH passes, for the
         packages/ui-flutter widget library's KinetixTheme. Additive: the
         app_theme.dart / app_colors.dart block below (class names
         KinetixTheme / KinetixColors, light-only) is untouched — same
         split as the SwiftUI KinetixColorsSwiftUI output. */
      'flutter-color-scheme': {
        transforms: ['attribute/cti'],
        buildPath: `${DIST}/flutter/`,
        files: [
          {
            destination: light ? 'kinetix_color_scheme.dart' : 'kinetix_color_scheme.dark.dart',
            format: 'kinetix/dart-color-class',
            // top-level semantic colours only — see the ios-swiftui-theme note
            filter: (t) => isColor(t) && isSemantic(t) && t.path.length === 2,
            options: { className: light ? 'KinetixColorScheme' : 'KinetixColorSchemeDark' },
          },
        ],
      },

      /* Flutter shadow scale — BOTH passes, mirroring the css-extras split.
         Light emits the whole set (sm/md/lg/xl elevation + the focus* rings)
         as `KinetixShadow`; dark emits ONLY the focus* rings as
         `KinetixShadowDark`, because those are the only shadows
         shadow.dark.json overrides. The elevation scale is theme-independent
         black-alpha, so it is deliberately not duplicated into the dark class.
         No other native platform consumes shadows yet — SwiftUI and Compose
         still have no shadow output (see the PR notes). */
      'flutter-shadow': {
        transforms: ['attribute/cti'],
        buildPath: `${DIST}/flutter/`,
        files: [
          {
            destination: light ? 'kinetix_shadow.dart' : 'kinetix_shadow.dark.dart',
            format: 'kinetix/shadow-dart',
            filter: light
              ? (t) => t.$type === 'shadow'
              : (t) => t.$type === 'shadow' && t.path.at(-1).startsWith('focus'),
            options: {
              className: light ? 'KinetixShadow' : 'KinetixShadowDark',
              fileName: light ? 'kinetix_shadow.dart' : 'kinetix_shadow.dark.dart',
            },
          },
        ],
      },

      /* Everything below is theme-independent — only the light run emits it. */
      ...(light
        ? {
            ts: {
              // custom format walks token.path, so only value transforms matter here
              transforms: ['attribute/cti', 'name/camel', 'color/css', 'kinetix/dimension-px'],
              buildPath: `${DIST}/web/`,
              files: [{ destination: 'tokens.ts', format: 'kinetix/ts-nested' }],
            },
            'ios-swift': {
              transformGroup: 'ios-swift',
              buildPath: `${DIST}/ios/`,
              files: [
                {
                  destination: 'KinetixColors.swift',
                  format: 'ios-swift/enum.swift',
                  filter: isColor,
                  options: { className: 'KinetixColor', accessControl: 'public', import: ['SwiftUI'] },
                },
                {
                  destination: 'Theme.swift',
                  format: 'ios-swift/class.swift',
                  filter: (t) => isColor(t) && isSemantic(t),
                  options: { className: 'KinetixTheme', accessControl: 'public', import: ['SwiftUI'] },
                },
              ],
            },
            'ios-type': {
              transforms: ['attribute/cti'],
              buildPath: `${DIST}/ios/`,
              files: [
                { destination: 'KinetixType.swift', format: 'kinetix/type-swift', filter: isType },
                { destination: 'KinetixMotion.swift', format: 'kinetix/motion-swift', filter: isNativeFoundation },
              ],
            },
            'android-compose': {
              // semantic Theme.kt / Theme.dark.kt moved to 'android-compose-theme'
              // above (runs on both passes) — this block is primitives only.
              transformGroup: 'compose',
              buildPath: `${DIST}/android/`,
              files: [
                {
                  destination: 'Color.kt',
                  format: 'compose/object',
                  filter: (t) => isColor(t) && t.filePath.includes(`${'/'}primitives${'/'}`),
                  options: { className: 'KinetixPalette', packageName: 'com.kinetixui.tokens' },
                },
              ],
            },
            'android-type': {
              transforms: ['attribute/cti'],
              buildPath: `${DIST}/android/`,
              options: { packageName: 'com.kinetixui.tokens' },
              files: [
                { destination: 'KinetixType.kt', format: 'kinetix/type-compose', filter: isType },
                { destination: 'KinetixMotion.kt', format: 'kinetix/motion-compose', filter: isNativeFoundation },
              ],
            },
            'android-xml': {
              transforms: ['attribute/cti', 'name/snake', 'color/hex8android', 'kinetix/android-dimen'],
              buildPath: `${DIST}/android/res/values/`,
              files: [
                { destination: 'colors.xml', format: 'android/colors', filter: isColor },
                { destination: 'dimens.xml', format: 'android/resources', filter: { $type: 'dimension' } },
              ],
            },
            flutter: {
              transformGroup: 'flutter',
              buildPath: `${DIST}/flutter/`,
              files: [
                {
                  destination: 'app_colors.dart',
                  format: 'flutter/class.dart',
                  filter: isColor,
                  options: { className: 'KinetixColors' },
                },
                {
                  destination: 'app_theme.dart',
                  format: 'flutter/class.dart',
                  filter: (t) => isColor(t) && isSemantic(t),
                  options: { className: 'KinetixTheme' },
                },
              ],
            },
            'flutter-type': {
              transforms: ['attribute/cti'],
              buildPath: `${DIST}/flutter/`,
              files: [
                { destination: 'app_text.dart', format: 'kinetix/type-dart', filter: isType },
                { destination: 'kinetix_motion.dart', format: 'kinetix/motion-dart', filter: isNativeFoundation },
              ],
            },
          }
        : {}),
    },
  };
}

export default getConfig('light');

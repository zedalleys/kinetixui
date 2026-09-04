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
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';
import {
  androidDimen,
  dimensionToPx,
  extrasCssFormat,
  hslChannels,
  cssVarName,
  tsNestedFormat,
  typeComposeFormat,
  typeDartFormat,
  typeSwiftFormat,
} from './hooks.mjs';

StyleDictionary.registerTransform(dimensionToPx);
StyleDictionary.registerTransform(cssVarName);
StyleDictionary.registerTransform(androidDimen);
StyleDictionary.registerTransform(hslChannels);
StyleDictionary.registerFormat(tsNestedFormat);
StyleDictionary.registerFormat(extrasCssFormat);
StyleDictionary.registerFormat(typeSwiftFormat);
StyleDictionary.registerFormat(typeComposeFormat);
StyleDictionary.registerFormat(typeDartFormat);

const isType = (t) => t.$type === 'typography';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = `${ROOT}/packages/tokens/dist`;

const isColor = (t) => t.$type === 'color';
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
        ],
        buildPath: `${DIST}/web/`,
        options: { outputReferences: light },
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

      /* Everything below is theme-independent — only the light run emits it. */
      ...(light
        ? {
            'css-extras': {
              transforms: ['attribute/cti', 'kinetix/dimension-px'],
              buildPath: `${DIST}/web/`,
              options: { outputReferences: false },
              files: [
                {
                  destination: 'extras.css',
                  format: 'kinetix/extras-css',
                  filter: (t) => t.$type === 'shadow' || t.$type === 'typography',
                },
              ],
            },
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
              files: [{ destination: 'KinetixType.swift', format: 'kinetix/type-swift', filter: isType }],
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
              files: [{ destination: 'KinetixType.kt', format: 'kinetix/type-compose', filter: isType }],
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
              files: [{ destination: 'app_text.dart', format: 'kinetix/type-dart', filter: isType }],
            },
          }
        : {}),
    },
  };
}

export default getConfig('light');

/**
 * Style Dictionary v4 — Strata cross-platform token engine (config factory).
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
 * NOTE: tokens/semantic/typography.json ($type "typography" composites) is not
 * consumed here — primitive fontSize/lineHeight/weight tokens are emitted; the
 * composite text styles get a dedicated pass so mobile formatters don't
 * stringify them to "[object Object]".
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import StyleDictionary from 'style-dictionary';
import { androidDimen, dimensionToPx, shadcnCssName, tsNestedFormat } from './hooks.mjs';

StyleDictionary.registerTransform(dimensionToPx);
StyleDictionary.registerTransform(shadcnCssName);
StyleDictionary.registerTransform(androidDimen);
StyleDictionary.registerFormat(tsNestedFormat);

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = `${ROOT}/packages/tokens/dist`;

const isColor = (t) => t.$type === 'color';
const isSemantic = (t) => t.filePath.includes(`${'/'}semantic${'/'}`);

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
    ],
    platforms: {
      /* ---------------------------------------------------------- WEB CSS */
      css: {
        transforms: [
          'attribute/cti',
          'strata/shadcn-css-name',
          'color/css',
          'strata/dimension-px',
        ],
        buildPath: `${DIST}/web/`,
        options: { outputReferences: light },
        files: [
          {
            destination: light ? 'globals.css' : 'globals.dark.css',
            format: 'css/variables',
            // light: everything (primitives + semantic).  dark: semantic only —
            // the primitive ramps are already defined once under :root.
            filter: light ? undefined : (t) => isSemantic(t),
            options: { selector: light ? ':root' : '.dark' },
          },
        ],
      },

      /* Everything below is theme-independent — only the light run emits it. */
      ...(light
        ? {
            ts: {
              // custom format walks token.path, so only value transforms matter here
              transforms: ['attribute/cti', 'name/camel', 'color/css', 'strata/dimension-px'],
              buildPath: `${DIST}/web/`,
              files: [{ destination: 'tokens.ts', format: 'strata/ts-nested' }],
            },
            'ios-swift': {
              transformGroup: 'ios-swift',
              buildPath: `${DIST}/ios/`,
              files: [
                {
                  destination: 'StrataColors.swift',
                  format: 'ios-swift/enum.swift',
                  filter: isColor,
                  options: { className: 'StrataColor', accessControl: 'public', import: ['SwiftUI'] },
                },
                {
                  destination: 'Theme.swift',
                  format: 'ios-swift/class.swift',
                  filter: (t) => isColor(t) && isSemantic(t),
                  options: { className: 'StrataTheme', accessControl: 'public', import: ['SwiftUI'] },
                },
              ],
            },
            'android-compose': {
              transformGroup: 'compose',
              buildPath: `${DIST}/android/`,
              files: [
                {
                  destination: 'Color.kt',
                  format: 'compose/object',
                  filter: (t) => isColor(t) && t.filePath.includes(`${'/'}primitives${'/'}`),
                  options: { className: 'StrataPalette', packageName: 'design.strata.tokens' },
                },
                {
                  destination: 'Theme.kt',
                  format: 'compose/object',
                  filter: (t) => isColor(t) && isSemantic(t),
                  options: { className: 'StrataTheme', packageName: 'design.strata.tokens' },
                },
              ],
            },
            'android-xml': {
              transforms: ['attribute/cti', 'name/snake', 'color/hex8android', 'strata/android-dimen'],
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
                  options: { className: 'AppColors' },
                },
                {
                  destination: 'app_theme.dart',
                  format: 'flutter/class.dart',
                  filter: (t) => isColor(t) && isSemantic(t),
                  options: { className: 'AppTheme' },
                },
              ],
            },
          }
        : {}),
    },
  };
}

export default getConfig('light');

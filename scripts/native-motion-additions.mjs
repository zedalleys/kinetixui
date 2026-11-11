/** Opt-in utilities share the native preference guard with catalogue motion families.
 * The catalogue ledger and its role and consumer checks stay in native-motion-spec.mjs. */
import { PLATFORMS as BASE, DIRECTION_TERMS as TERMS } from './native-motion-spec.mjs';
export { KNOWN_GAPS, testNames } from './native-motion-spec.mjs';

export const NUMERIC_UTILITY = {
  kind: 'opt-in-utility',
  value: 'arbitrary-number',
  accessibility: 'exact-target-text',
  reducedMotion: 'snap-to-target',
  native: {
    SwiftUI: { helper: 'KinetixNumberMotion.swift', members: ['AnimatedNumber.swift'], test: 'packages/ui-swiftui/Tests/KinetixUITests/NumberMotionTests.swift', strict: true },
    Compose: { helper: 'KinetixNumberMotion.kt', members: ['AnimatedNumber.kt'], test: 'packages/ui-compose/ui/src/test/kotlin/com/kinetixui/ui/AnimatedNumberTest.kt', strict: true },
    Flutter: { helper: 'kinetix_number_motion.dart', members: ['animated_number.dart'], test: 'packages/ui-flutter/test/animated_number_test.dart', strict: true },
  },
};

export const PLATFORMS = Object.fromEntries(Object.entries(BASE).map(([name, p]) => {
  const numeric = NUMERIC_UTILITY.native[name];
  if (!numeric || Object.hasOwn(p.families, 'numeric') || Object.hasOwn(numeric, 'contractRole')) {
    throw new Error(`${name}: numeric motion must be an additive utility with its own evidence and no catalogue role.`);
  }
  return [name, { ...p, families: { ...p.families, numeric } }];
}));
export const DIRECTION_TERMS = { ...TERMS, numeric: { forward: /\bincreas/i, reverse: /\bdecreas/i } };

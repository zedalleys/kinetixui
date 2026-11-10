/** Additive motion families, composed over the existing ledger so #552 retains ownership of that file.
 * This module changes no existing identity, gap or pairing. Numeric continuity is an opt-in utility,
 * separate from the catalogue roles in tokens/contracts/motion.json. */
import { PLATFORMS as BASE, DIRECTION_TERMS as TERMS } from './native-motion-spec.mjs';
export { KNOWN_GAPS, testNames } from './native-motion-spec.mjs';
const numeric = {
  SwiftUI: { helper: 'KinetixNumberMotion.swift', members: ['AnimatedNumber.swift'], test: 'packages/ui-swiftui/Tests/KinetixUITests/NumberMotionTests.swift', strict: true },
  Compose: { helper: 'KinetixNumberMotion.kt', members: ['AnimatedNumber.kt'], test: 'packages/ui-compose/ui/src/test/kotlin/com/kinetixui/ui/AnimatedNumberTest.kt', strict: true },
  Flutter: { helper: 'kinetix_number_motion.dart', members: ['animated_number.dart'], test: 'packages/ui-flutter/test/animated_number_test.dart', strict: true },
};
export const PLATFORMS = Object.fromEntries(Object.entries(BASE).map(([name, p]) => [name, { ...p, families: { ...p.families, numeric: numeric[name] } }]));
export const DIRECTION_TERMS = { ...TERMS, numeric: { forward: /\bincreas/i, reverse: /\bdecreas/i } };

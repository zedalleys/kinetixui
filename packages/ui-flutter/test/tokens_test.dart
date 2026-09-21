// Foundations — the spatial scale reaches Flutter as KinetixSpacing / KinetixRadius, generated from the same
// tokens as web, SwiftUI and Compose. KinetixUI's grid is 8-unit with a 4-unit half-step: every value is a
// multiple of 4.

import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

void main() {
  const spacing = <String, double>{
    'space0': KinetixSpacing.space0,
    'space1': KinetixSpacing.space1,
    'space2': KinetixSpacing.space2,
    'space3': KinetixSpacing.space3,
    'space4': KinetixSpacing.space4,
    'space5': KinetixSpacing.space5,
    'space6': KinetixSpacing.space6,
    'space7': KinetixSpacing.space7,
    'space8': KinetixSpacing.space8,
    'space10': KinetixSpacing.space10,
    'space12': KinetixSpacing.space12,
    'space16': KinetixSpacing.space16,
    'space20': KinetixSpacing.space20,
    'space24': KinetixSpacing.space24,
    'space32': KinetixSpacing.space32,
  };

  test('every spacing step is a multiple of four', () {
    spacing.forEach((name, value) {
      expect(value % 4, 0, reason: '$name = $value is off the 4-unit grid');
    });
  });

  test('spaceN is N x 4, so a token name always tells you its value', () {
    spacing.forEach((name, value) {
      expect(value, int.parse(name.substring('space'.length)) * 4.0, reason: name);
    });
  });

  test('radii are on the grid, except none and full', () {
    const radii = <String, double>{
      'sm': KinetixRadius.sm,
      'md': KinetixRadius.md,
      'lg': KinetixRadius.lg,
      'xl': KinetixRadius.xl,
      'xxl': KinetixRadius.xxl,
    };
    radii.forEach((name, value) {
      expect(value % 4, 0, reason: 'radius $name = $value is off the grid');
    });
    expect(KinetixRadius.none, 0);
    expect(KinetixRadius.full, greaterThan(KinetixRadius.xxl));
  });

  test('radius role aliases point at their steps', () {
    expect(KinetixRadius.field, KinetixRadius.sm);
    expect(KinetixRadius.control, KinetixRadius.md);
    expect(KinetixRadius.container, KinetixRadius.lg);
    expect(KinetixRadius.surface, KinetixRadius.xl);
  });
}

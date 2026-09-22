/// The KinetixUI **foundation tokens** for Flutter — every design-token family,
/// usable on their own, with no `Kinetix*` widget in sight.
///
/// Everything here is generated from the DTCG source in `tokens/**` by
/// `pnpm build:tokens` and vendored in by `pnpm vendor:flutter`, so these are
/// the same values the React, SwiftUI and Jetpack Compose ports resolve to.
///
/// | Family | API | Example |
/// |---|---|---|
/// | Colours | `KinetixColors.light` / `.dark` | `KinetixColors.light.action` |
/// | Typography | `KinetixType` | `KinetixType.bodyMd` |
/// | Spacing | `KinetixSpacing` | `KinetixSpacing.space4` (16) |
/// | Radius | `KinetixRadius` | `KinetixRadius.container` (12) |
/// | Shadows | `KinetixShadow` / `KinetixShadows` | `KinetixShadow.md` |
/// | Motion | `KinetixDuration`, `KinetixEasing` | `KinetixDuration.fast` |
/// | Opacity | `KinetixOpacity` | `KinetixOpacity.disabled` |
/// | Z-index | `KinetixZIndex` | `KinetixZIndex.overlay` |
///
/// ```dart
/// import 'package:kinetix_ui/kinetix_ui.dart';
///
/// Container(
///   padding: const EdgeInsets.all(KinetixSpacing.space4),
///   decoration: BoxDecoration(
///     color: KinetixColors.light.card,
///     borderRadius: BorderRadius.circular(KinetixRadius.container),
///     boxShadow: KinetixShadow.md,
///   ),
///   child: Text('No Kinetix widget required', style: KinetixType.bodyMd),
/// );
/// ```
///
/// This barrel exists for discoverability — `package:kinetix_ui/kinetix_ui.dart`
/// already exports all of it, so importing this file directly is optional.
library;

export 'kinetix_motion.dart'; // KinetixDuration / KinetixEasing / KinetixOpacity / KinetixZIndex / KinetixSpacing / KinetixRadius
export 'kinetix_shadows.dart'; // KinetixShadow / KinetixShadowDark / KinetixShadows
export 'kinetix_type.dart'; // KinetixType (the generated AppText scale)
export 'theme.dart' show KinetixColors; // the semantic palette, without the KinetixTheme widget

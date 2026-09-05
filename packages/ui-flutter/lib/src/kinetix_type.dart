import 'app_text.dart';

export 'app_text.dart' show AppText;

/// The KinetixUI type scale — `KinetixType.bodyMd`, `KinetixType.headlineSm`,
/// … as `TextStyle`s. An alias of the generated `AppText` class (see
/// `lib/src/app_text.dart`, produced by `pnpm build:tokens` from
/// `tokens/semantic/typography.json`; re-vendored by `pnpm vendor:flutter`).
typedef KinetixType = AppText;

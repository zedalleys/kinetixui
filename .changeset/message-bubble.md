---
"@kinetixui/ui": minor
---

Add `MessageBubble`/`TypingIndicator` — a sent/received chat bubble with grouping, timestamp, and a status tick, plus an animated typing indicator. Last pick from the `COMPONENT-ADDITIONS.md` Tier 2 backlog — just the bubble primitive, not the broader "AI-chat kit" (Attachment/Bubble/Message Scroller/Questionnaire), which stays a separate roadmap decision. `grouped` reduces the outer top corner's radius as a lightweight consecutive-run cue — the caller already knows which messages are consecutive, so it stays a single boolean rather than the component inferring group position itself.

Ships on all four platforms per the four-platform rule: `KinetixMessageBubble`/`KinetixTypingIndicator` on Jetpack Compose, SwiftUI, and Flutter too. Compose and Flutter reproduce the web's precise single-corner rounding for `grouped`; SwiftUI falls back to a uniform radius reduction instead, since `UnevenRoundedRectangle`'s exact OS-version floor couldn't be verified against this package's iOS 16.0 floor without a local toolchain — a documented, deliberate simplification.

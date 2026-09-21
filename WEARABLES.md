# KinetixUI — wearables: design and architecture spec

**Status:** decided in principle, **nothing built.** Approved by the owner on 2026-09-21 as a separate design track
that derives from Core (`CORE-AUDIT.md` §6.5). This document decides the architecture and the order of work so the
build can start without re-litigating it. Anything I could not verify from the repository is marked **[verify]** —
platform guideline figures in particular must be checked against the current Wear OS and watchOS guidelines before
they become tokens.

## 1. Principle

Wearables are **not small phones.** A watch is glanced at, not used: interactions are seconds long, targets are large,
labels are short, the screen is often round, and every animation costs battery. So the wearable libraries share KinetixUI's
*identity and foundations* — colour roles, the 4-unit spatial scale, type roles, motion tokens, accessibility contract — and
nothing else by default. Components, navigation and layout are each platform's own idiom (Wear OS is not watchOS either).

## 2. What is reused, and what is new

| | Reused from Core | New for wearables |
|---|---|---|
| Colour | semantic roles (`action`, `destructive`, …), light **and** dark sets | dark-first mapping (OLED, near-black surfaces); light is secondary |
| Space | the 4-unit scale (`KinetixSpacing`) — a *subset* | tighter density steps; edge insets for round screens |
| Shape | radius steps and roles (`KinetixRadius`) | edge-hugging / circular radius rules |
| Type | the role names (`label`, `body`, `title`) | a smaller, fewer-role scale that respects the system text size **[verify]** |
| Motion | duration / easing tokens (`KinetixMotion`) | reduced set; battery-aware defaults |
| Accessibility | the contract (name, role, state, target size, contrast, text scaling, reduce motion) | rotary / Digital Crown and voice-first considerations |
| Components | — | built natively per platform; none are ports of the phone components |

## 3. Architecture (recommended)

Two new packages, each depending **only on generated token outputs**, not on the phone component libraries:

```
packages/ui-wear      Jetpack Compose for Wear OS   (androidx.wear.compose — its own Material, scaffold, navigation)
packages/ui-watchos   SwiftUI for watchOS           (a separate Swift target, not a phone-package platform)
```

Both consume the existing generated files (`KinetixColors*`, `KinetixSpacing` / `KinetixRadius` / `KinetixMotion`, type
styles), vendored the same way the three current native ports vendor them — so the single-source guarantee (one token
change reaches every platform) extends to wearables with no new token compiler.

**Considered and rejected:** adding `.watchOS` to `packages/ui-swiftui`, and Wear OS components inside `ui-compose`. The
phone components use iOS/macOS-only and Material 3 (non-Wear) APIs; conditional compilation would sprawl through 90+ files
and a phone change could break a watch build. Separate packages keep blast radius small and let each follow its platform.

## 4. Proposed wearable semantic tokens

Derived from Core where possible. **Values in italics are proposals to verify**, not decisions.

| Token | Derivation | Note |
|---|---|---|
| `wearable.spacing.*` | subset of `KinetixSpacing`: 4, 8, 12, 16 | larger steps rarely fit a watch face |
| `wearable.inset.*` | *new* — safe-area insets for circular screens | *platform-defined; do not hardcode* |
| `wearable.touch-target.minimum` | ≥ Core `interaction.target.minimum` (44) | *the platform guidelines may require more — verify and take the larger* **[verify]** |
| `wearable.radius.*` | Core roles, plus *full-width edge shapes* | round faces clip corners |
| `wearable.typography.*` | Core role names; *fewer roles, larger minimum size* | respect system text size **[verify]** |
| `wearable.motion.*` | Core durations, *shorter and fewer* | battery + glanceability |
| `wearable.density` | *compact / default* | list rows, chips |
| colour | Core `dark` set, with *pure-black background option* | OLED convention **[verify]** |

## 5. Platform conventions each library must follow

- **Wear OS** — Compose for Wear OS components (`ScalingLazyColumn`-style lists, chips, edge buttons), rotary-input
  scrolling, swipe-to-dismiss navigation, ambient (low-power) mode. **[verify current API names]**
- **watchOS** — `NavigationStack`, the Digital Crown, complications via WidgetKit, always-on (reduced-luminance) display.
  **[verify current API names]**
- Neither is a subset of the other, and neither follows the phone patterns. A shared component *name* (`KinetixButton`) is
  fine; a shared *implementation* is not the goal.

## 6. Component plan

**Wave 1 — the minimum useful set (both platforms):** Button, IconButton, Chip / Card, Toggle (chip or switch), Progress
(linear + circular), List, and the screen scaffold. **Wave 2:** health-style metrics and gauges, workout controls, dialogs,
notification surfaces. Tiles (Wear OS) and complications (watchOS) are platform surfaces rather than UI components — start
with token/formatting helpers, not widgets. Sidebar, ContextMenu, Tooltip and DataGrid are **not applicable** and are not built.

## 7. Gates before building (from the maturity ladder, `CORE-AUDIT.md` §8)

1. The native test harness pattern exists — **done** for Flutter, Compose and SwiftUI (#177, #178, #179).
2. **SwiftUI view-level testing is decided** — ViewInspector or an XCUITest host app. Still **open**; watchOS needs the same
   answer, and its tests need a watchOS simulator on a macOS runner (slower).
3. Wear Compose UI tests run on Robolectric like the phone Compose tests — to confirm with a spike.
4. New packages start at **Experimental** and earn Beta / Stable against the same ladder. Nothing ships "Stable" untested.

## 8. Phases

| # | Phase | Output |
|---|---|---|
| 0 | Decisions (section 9) | this document, amended |
| 1 | Wearable tokens | `wearable.*` derived from Core, generated to both platforms, documented on `/docs/foundations`; `check:*` guardrails |
| 2 | Wear OS spike | `ui-wear` scaffold + Button and Chip with the Robolectric harness; CI job |
| 3 | watchOS spike | `ui-watchos` scaffold + Button and Chip; CI job on a macOS runner with a watchOS simulator |
| 4 | Wave 1 | remaining Wave 1 components with interaction + accessibility tests |
| 5 | Docs and support matrix | `/docs/platforms` rows, a Wearables page, changelog platform tags |

## 9. Decisions needed from the owner

1. **Minimum OS versions** to support (Wear OS and watchOS) — this sets which APIs may be used.
2. **Hardware/emulator access** for manual checks on a round display and with a screen reader (TalkBack / VoiceOver on the
   watch) — automated tests do not replace them.
3. **Publishing:** separate packages from day one, or repository-checkout only like the current native ports?
4. **SwiftUI view-testing approach** (see section 7) — blocks watchOS and the phone SwiftUI port equally.
5. **Design source:** are there wearable designs (Figma or otherwise), or do the wearable components start from the
   platforms' own guidelines and Core tokens?

Nothing in this document adds a dependency, changes an existing package, or publishes anything.

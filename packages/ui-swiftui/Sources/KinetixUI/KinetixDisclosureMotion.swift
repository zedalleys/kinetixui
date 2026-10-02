//
// KinetixDisclosureMotion.swift — the disclosure family's motion, and what Reduce Motion does to it.
//
// ── Why this is a function and not a modifier ─────────────────────────────
//
// `swift test` here is dependency-free XCTest against a package with no view-inspection library and
// no XCUITest host (see Package.swift). Nothing in CI can render a SwiftUI view, so a decision baked
// into a `body` is a decision nothing can check. Pulling the decision out into a pure function makes
// the contract testable with the harness that actually exists: the view reads
// `@Environment(\.accessibilityReduceMotion)` and asks this what to do with it.
//
// That is a deliberate trade, and it is the honest one. A test asserting "Accordion animates" by
// reading its source would prove nothing; a test asserting that this function returns no animation
// when Reduce Motion is on proves the rule every disclosure view routes through.
//
// ── What Reduce Motion means here ─────────────────────────────────────────
//
// Not "no state change". The content still appears and disappears, the chevron still ends up
// rotated, and the caller's `isExpanded` still drives everything — only the interpolation between
// the two states is removed. SwiftUI expresses exactly that as a nil `Animation`: the value change
// is applied, with no transition to watch.
//
// ── Why the durations come from the tokens ────────────────────────────────
//
// `Accordion` previously animated at a literal `.easeInOut(duration: 0.2)` while
// `KinetixMotion.swift` sat beside it carrying the same 200ms as `KinetixDuration.fast`. The value
// was right and the provenance was not — retuning the token would have moved web, Compose and
// Flutter and left SwiftUI behind. Disclosure also uses the directional pair those easings exist
// for: opening decelerates (`enter`), closing accelerates (`exit`).
//

import SwiftUI

/// The direction a disclosure is moving. Opening and closing are different curves, not one
/// animation played backwards, which is why they are separate cases rather than a `Bool`.
public enum KinetixDisclosureDirection: Sendable {
    case expanding
    case collapsing
}

public enum KinetixDisclosureMotion {
    /// Seconds, from the canonical duration token. `Duration` is not what SwiftUI's animation
    /// builders take, so the conversion happens once, here, rather than at every call site.
    public static var durationSeconds: Double {
        let c = KinetixDuration.fast.components
        return Double(c.seconds) + Double(c.attoseconds) / 1e18
    }

    /// The animation for a disclosure change, or `nil` when the reader has asked for less motion.
    ///
    /// `nil` is SwiftUI's own way of saying "apply the new value without interpolating", so the
    /// disclosure still opens and closes — it simply arrives rather than travels.
    public static func animation(_ direction: KinetixDisclosureDirection, reduceMotion: Bool) -> Animation? {
        guard !reduceMotion else { return nil }
        let e = direction == .expanding ? KinetixEasing.enter : KinetixEasing.exit
        return .timingCurve(e.0, e.1, e.2, e.3, duration: durationSeconds)
    }

    /// The transition for content that mounts and unmounts with the disclosure.
    ///
    /// Under Reduce Motion the movement is dropped and the content simply appears — `.identity`
    /// rather than `.opacity`, because a fade is still motion and the state change is already
    /// carried by the content being there or not.
    public static func transition(reduceMotion: Bool) -> AnyTransition {
        reduceMotion ? .identity : .opacity.combined(with: .move(edge: .top))
    }

    /// The chevron's angle. Unchanged by Reduce Motion: the rotation is *state*, not decoration —
    /// it is how a sighted reader sees that the section is open — so it still lands at 180°, it just
    /// gets there without turning.
    public static func chevronDegrees(isExpanded: Bool) -> Double {
        isExpanded ? 180 : 0
    }
}

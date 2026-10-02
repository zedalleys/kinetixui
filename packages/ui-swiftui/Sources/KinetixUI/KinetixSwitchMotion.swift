//
// KinetixSwitchMotion.swift — the selection-control family's motion on SwiftUI.
//
// ── This is a motion SPEC, not a second reduced-motion system ──────────────
//
// The preference itself is read exactly where and how the disclosure family reads it:
// `@Environment(\.accessibilityReduceMotion)`, in the view, because SwiftUI only surfaces an
// environment value to a `View`. There is no second detection path, no component-local heuristic and
// no new preference key. What is separate is the *timing*, and it has to be: a disclosure runs for
// `fast` on a directional pair, a switch thumb runs for `instant` on `standard`, and collapsing those
// two into one function would mean one of them lying about its own duration.
//
// ── What the reduced form is, and why it is not "nothing" ──────────────────
//
// A switch's thumb POSITION is its state, in the same way the disclosure chevron's angle is. So
// suppression removes the travel and keeps the destination: the thumb is on the correct side either
// way, and `thumbAlignment` is deliberately independent of the setting so that cannot drift. What
// goes is the interpolation between the two sides.
//
// `.leading` / `.trailing` rather than `.left` / `.right` on purpose: those two are resolved against
// the layout direction, so the thumb travels toward the reader's trailing edge in both LTR and RTL.
// The React port had to fix exactly this bug with an `rtl:` variant, because `translate-x` is
// physical; SwiftUI's named alignments already mirror, so there is nothing to override here.
//

import SwiftUI

public enum KinetixSwitchMotion {
    /// `KinetixDuration.instant` in seconds. `Duration` is not an `Animation` duration, so it is
    /// converted once here rather than at each call site.
    ///
    /// `instant` (100ms) and not `fast`: the React port — which all three native switches say they
    /// mirror — carries `duration-instant ease-standard` on the thumb. The natives had drifted to a
    /// literal 150ms (SwiftUI, Flutter) or to the framework's default spring (Compose). The token was
    /// already right; it simply was not being read.
    public static var durationSeconds: Double {
        let c = KinetixDuration.instant.components
        return Double(c.seconds) + Double(c.attoseconds) / 1e18
    }

    /// The thumb's travel, or `nil` — SwiftUI's own "apply the new value without interpolating" —
    /// when the reader has asked for no animation.
    ///
    /// One curve, not a directional pair: a switch is symmetric. Turning on and turning off are the
    /// same gesture reversed, with no enter/exit asymmetry to express, so `standard` is correct for
    /// both and the disclosure family's `.expanding` / `.collapsing` distinction does not apply.
    public static func animation(reduceMotion: Bool) -> Animation? {
        guard !reduceMotion else { return nil }
        let e = KinetixEasing.standard
        return .timingCurve(e.0, e.1, e.2, e.3, duration: durationSeconds)
    }

    /// Which side the thumb rests on. State, not decoration: identical whether or not motion is
    /// reduced, so an off switch never reads as on.
    public static func thumbAlignment(isOn: Bool) -> Alignment {
        isOn ? .trailing : .leading
    }
}

//
// KinetixSelectionMotion.swift — the selection-STATE family's motion on SwiftUI.
//
// ── Why this is not KinetixSwitchMotion ───────────────────────────────────
//
// Two roles, two durations, and the owner decision of 2026-10-17 is that they are not to be
// normalised: `selection-control` (Switch) runs for `instant` because a thumb is a physical control
// that should land with the finger, and `selection-state` (Toggle, ToggleGroup, Checkbox,
// RadioGroup) runs for `fast` because nothing moves — a colour settles. One helper returning both
// would have to lie about one of them, which is the same reason the disclosure and switch families
// are separate files.
//
// ── What it is not ────────────────────────────────────────────────────────
//
// Not a second reduced-motion system. The preference is read where SwiftUI surfaces it, in the view,
// through `@Environment(\.accessibilityReduceMotion)` — the same single path the disclosure and
// switch families use. Nothing here detects anything; this file only answers "how long, and on what
// curve".
//
// ── What the reduced form is ──────────────────────────────────────────────
//
// `nil` — SwiftUI's own "apply the new value without interpolating". For this family that is exactly
// right and loses nothing: the selected state is carried by the colour's VALUE, not by the path it
// took to get there, and the accessibility value is set from the same state regardless. A reader with
// Reduce Motion on sees the checked box; it simply does not watch the fill arrive.
//

import SwiftUI

public enum KinetixSelectionMotion {
    /// `KinetixDuration.fast` in seconds. `Duration` is not an `Animation` duration, so the
    /// conversion happens once here rather than at each call site — the same shape
    /// `KinetixSwitchMotion.durationSeconds` has.
    public static var durationSeconds: Double {
        let c = KinetixDuration.fast.components
        return Double(c.seconds) + Double(c.attoseconds) / 1e18
    }

    /// The colour's settle, or `nil` when the reader has asked for no animation.
    ///
    /// One curve, not a directional pair: selecting and unselecting are the same change reversed,
    /// with no enter/exit asymmetry to express, so `standard` is correct for both. The disclosure
    /// family's `.expanding` / `.collapsing` distinction does not apply here.
    public static func animation(reduceMotion: Bool) -> Animation? {
        guard !reduceMotion else { return nil }
        let e = KinetixEasing.standard
        return .timingCurve(e.0, e.1, e.2, e.3, duration: durationSeconds)
    }
}

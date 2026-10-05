//
// KinetixLoopMotion.swift — the continuous-loop family's motion on SwiftUI:
// Spinner, Skeleton, Marquee and the typing indicator.
//
// ── This is a motion SPEC, not a second reduced-motion system ──────────────
//
// The preference is read exactly where and how the other families read it:
// `@Environment(\.accessibilityReduceMotion)`, in the view, because SwiftUI only surfaces an
// environment value to a `View`. What differs is the reduced FORM. Disclosure and selection shorten a
// transition to nothing and keep its destination. A loop has no destination: shortening one period
// just makes it spin faster. So with Reduce Motion on, a loop does not start at all, and each member
// renders a static state that still says what the motion said:
//
//   Spinner   the arc at rest, plus its "Loading" label (the label carries the state to VoiceOver).
//   Skeleton  the placeholder at full opacity; the block's presence is the information.
//   Marquee   one copy of the content in a horizontal ScrollView the reader moves by hand. Stopping
//             the ticker in place would leave whatever sat past the edge unreachable.
//   Typing    three dots at rest at the muted opacity, plus its "Typing" label.
//
// The loop periods are not transition durations, so they are not the duration tokens: those say how
// long a change takes, these say how often a decoration repeats. Each mirrors the web keyframe its
// component ports and is named once here so the view and its test read the same value.
//

import SwiftUI

public enum KinetixLoopMotion {
    /// One full turn of the spinner.
    public static let spinnerPeriodSeconds: Double = 0.8

    /// One half-cycle of the skeleton pulse (1 → 0.5 opacity), autoreversed: Tailwind's 2s `animate-pulse`.
    public static let skeletonHalfCycleSeconds: Double = 1

    /// One half-cycle of a typing dot's bounce (autoreversed), and the delay between neighbours.
    public static let typingHalfCycleSeconds: Double = 0.6
    public static let typingStaggerSeconds: Double = 0.15

    /// The opacity typing dots rest at when they do not move: the muted opacity token.
    public static let restingDotOpacity: Double = KinetixOpacity.muted

    /// The looping animation, or `nil` — no loop at all — when the reader has asked for reduced motion.
    /// `nil` rather than a zero-length animation: a repeating animation with no duration would still
    /// schedule frames, and the point is that nothing runs.
    public static func loop(
        _ base: Animation,
        reduceMotion: Bool,
        autoreverses: Bool,
        delay: Double = 0
    ) -> Animation? {
        guard !reduceMotion else { return nil }
        let looped = base.repeatForever(autoreverses: autoreverses)
        return delay > 0 ? looped.delay(delay) : looped
    }

    /// Whether continuous motion runs.
    public static func runs(reduceMotion: Bool) -> Bool { !reduceMotion }
}

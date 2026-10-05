package com.kinetixui.ui

import com.kinetixui.tokens.KinetixOpacity

/**
 * The continuous-loop family's motion on Compose: Spinner, Skeleton, Marquee and the typing indicator.
 *
 * ## This is a motion spec, not a second reduced-motion system
 *
 * The preference is read by [KinetixDisclosureMotion.rememberReduceMotion], unchanged and shared. What
 * differs from the disclosure and selection families is the reduced FORM. Those families shorten a
 * transition to nothing and keep its destination. A loop has no destination: shortening one period
 * just makes it spin faster. So with animations off a loop is not composed at all (no
 * `rememberInfiniteTransition` runs), and each member renders a static state that still says what the
 * motion said:
 *
 * - Spinner: the arc at rest, plus its "Loading" content description, which carries the state to
 *   TalkBack in both modes.
 * - Skeleton: the placeholder at full opacity. The block's presence is the information.
 * - Marquee: one copy of the content in a row the reader scrolls by hand. Stopping the ticker in
 *   place would clip whatever sat past the edge.
 * - Typing indicator: three dots at rest at the muted opacity, plus its "Typing" description.
 *
 * ## The loop periods
 *
 * These are not transition durations, so they are not the duration tokens: `KinetixDuration` says how
 * long a change takes, these say how often a decoration repeats. Each mirrors the web keyframe its
 * component ports, and is named once here so the component and its test read the same value.
 */
object KinetixLoopMotion {

    /** Whether continuous motion runs. False when the reader has animations off. */
    fun runs(reduceMotion: Boolean): Boolean = !reduceMotion

    /** One full turn of the spinner. */
    const val spinnerPeriodMillis = 800

    /** One half-cycle of the skeleton pulse (1 → 0.5 alpha), run in reverse: Tailwind's 2s `animate-pulse`. */
    const val skeletonHalfCycleMillis = 1000

    /** One full typing-dot cycle, and the delay between neighbouring dots. */
    const val typingPeriodMillis = 1200
    const val typingStaggerMillis = 150

    /** The alpha typing dots rest at when they do not move: the muted opacity token. */
    const val restingDotOpacity = KinetixOpacity.muted
}

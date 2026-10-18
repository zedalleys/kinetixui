package com.kinetixui.ui

import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.tween
import com.kinetixui.tokens.KinetixDuration
import com.kinetixui.tokens.KinetixEasing

/**
 * The selection-STATE family's motion on Compose.
 *
 * ## Why this is not [KinetixSwitchMotion]
 *
 * Two roles, two durations, and by owner decision (2026-10-17) they are not to be normalised:
 * `selection-control` (Switch) runs for `instant` because a thumb is a physical control that should
 * land with the finger, and `selection-state` (Toggle, ToggleGroup, Checkbox, RadioGroup) runs for
 * `fast` because nothing moves — a colour settles. One helper returning both would have to lie about
 * one of them, which is also why the disclosure and switch families are separate files.
 *
 * ## This is a spec, not a second reduced-motion system
 *
 * The preference is read by [KinetixDisclosureMotion.rememberReduceMotion], unchanged and shared —
 * one `ContentObserver` on `Settings.Global.ANIMATOR_DURATION_SCALE`, one place in the package that
 * knows how Android expresses "remove animations". Nothing here detects anything.
 *
 * ## What the reduced form is
 *
 * `tween(0)`. The animation still runs and still completes, so anything awaiting it resolves; the
 * colour simply arrives rather than settling. Safe for the same reason it is safe for the switch
 * thumb: these controllers belong to the composition, not to a layout pass.
 */
object KinetixSelectionMotion {

    /** Milliseconds a selection colour settles over: the canonical token, or none when reduced. */
    fun durationMillis(reduceMotion: Boolean): Int = if (reduceMotion) 0 else KinetixDuration.fast

    /**
     * The spec. One curve, not a pair: selecting and unselecting are the same change reversed, with
     * no enter/exit asymmetry to express.
     */
    fun <T> spec(reduceMotion: Boolean): FiniteAnimationSpec<T> =
        tween(durationMillis = durationMillis(reduceMotion), easing = KinetixEasing.standard)
}

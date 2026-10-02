package com.kinetixui.ui

import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.tween
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.kinetixui.tokens.KinetixDuration
import com.kinetixui.tokens.KinetixEasing

/**
 * The selection-control family's motion on Compose.
 *
 * ## This is a motion spec, not a second reduced-motion system
 *
 * The preference is read by [KinetixDisclosureMotion.rememberReduceMotion], unchanged and shared —
 * one `ContentObserver` on `Settings.Global.ANIMATOR_DURATION_SCALE`, one place that knows how
 * Android expresses "remove animations". Nothing here detects anything. What is separate is the
 * *timing*, and it has to be: a disclosure runs for `fast` on a directional easing pair, a switch
 * thumb runs for `instant` on `standard`, and one function returning both would have to lie about one
 * of them.
 *
 * (The shared reader currently lives on a disclosure-named object, which reads oddly from here. That
 * is a naming problem worth a separate, tiny extraction — not a reason to duplicate the reader, which
 * is the one thing that must stay single.)
 *
 * ## What the reduced form is
 *
 * `tween(0)`. The animation machinery still runs and still completes, so anything awaiting it still
 * resolves; the thumb simply arrives rather than travels. `animateDpAsState` with a zero-duration
 * tween is the same mechanism the disclosure chevron already uses, and it is safe here for the reason
 * it is safe there: the controller belongs to the composition, not to a layout pass. (Flutter's
 * `AnimatedSize` is the opposite case and is documented in its own file — that hazard is specific to
 * a RenderObject that restarts its controller inside `performLayout`, not a general rule about zero.)
 *
 * ## Why the duration changed
 *
 * `animateDpAsState` was on Compose's default spring while `KinetixMotion.kt` sat in the same source
 * set carrying `instant = 100`. The React port these three switches all say they mirror uses
 * `duration-instant ease-standard`; the natives had drifted. The token was already right.
 */
object KinetixSwitchMotion {

    /** Milliseconds the thumb travels: the canonical token, or none when motion is reduced. */
    fun durationMillis(reduceMotion: Boolean): Int = if (reduceMotion) 0 else KinetixDuration.instant

    /**
     * The thumb's spec. One curve, not a pair: a switch is symmetric — on and off are the same
     * gesture reversed, with no enter/exit asymmetry to express.
     */
    fun <T> spec(reduceMotion: Boolean): FiniteAnimationSpec<T> =
        tween(durationMillis = durationMillis(reduceMotion), easing = KinetixEasing.standard)

    /**
     * How far along the track the thumb sits. State, not decoration: unchanged by the setting, so an
     * unchecked switch can never render as checked.
     *
     * Consumed through `Modifier.offset`, which resolves against the layout direction, so this travel
     * mirrors under RTL without a second value.
     */
    fun thumbOffset(checked: Boolean): Dp = if (checked) 24.dp else 0.dp
}

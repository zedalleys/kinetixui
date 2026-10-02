package com.kinetixui.ui

import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalInspectionMode
import com.kinetixui.tokens.KinetixDuration
import com.kinetixui.tokens.KinetixEasing

/**
 * The disclosure family's motion on Compose, and what the system animation setting does to it.
 *
 * ## Where the preference comes from
 *
 * Compose has no `LocalReduceMotion`. Android's actual signal is
 * [Settings.Global.ANIMATOR_DURATION_SCALE] — the value behind Settings → Accessibility → "Remove
 * animations" and the developer-options animator scale. When a reader turns animations off the
 * platform sets it to `0f`, and that is what is read here. No preference is invented, and nothing is
 * added to the public API for a caller to set by hand: the setting belongs to the reader, not to the
 * app embedding these components.
 *
 * It is read once per composition scope rather than per frame, and then OBSERVED. An earlier version
 * cached the first read in a plain `remember`, on the assumption that changing the setting recreates
 * the activity. It does not: `ANIMATOR_DURATION_SCALE` is a global setting, not a configuration
 * change, so a reader who turns animations off while the screen is open would have kept getting the
 * old answer until the composition was destroyed — precisely the reader this slice is for. A
 * `ContentObserver` on the setting's own URI now updates snapshot state, and is unregistered when the
 * composition leaves, so nothing outlives it.
 *
 * ## What suppression means
 *
 * Not "no state change". `AnimatedVisibility` still mounts and unmounts the content, and the
 * chevron still ends at 180° — the interpolation between the two states is what goes. A `tween` of
 * zero duration is Compose's own way to express that: the animation machinery runs, the values jump
 * in one frame, and anything waiting on completion still completes. Replacing the spec with `null`
 * or skipping `AnimatedVisibility` would change which composables exist, which is a larger and more
 * fragile difference than the one the reader asked for.
 *
 * ## Why the durations come from the tokens
 *
 * `AnimatedVisibility` and `animateFloatAsState` were on Compose's own defaults — a 300ms fade and a
 * spring — while `KinetixMotion.kt` sat in the same source set carrying `fast = 200`. Disclosure now
 * uses the directional easing pair those tokens exist for: opening decelerates (`enter`), closing
 * accelerates (`exit`).
 */
object KinetixDisclosureMotion {

    /** Below this the platform is telling us the reader wants no animation at all. */
    private const val ANIMATIONS_OFF = 0f

    /**
     * True when the system animation scale is off.
     *
     * In a preview or an inspection context there is no meaningful setting to read, so this reports
     * `false` and previews animate as a designer expects.
     */
    @Composable
    fun rememberReduceMotion(): Boolean {
        if (LocalInspectionMode.current) return false
        val resolver = LocalContext.current.contentResolver
        var reduceMotion by remember(resolver) { mutableStateOf(animationsOff(resolver)) }

        DisposableEffect(resolver) {
            val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
                override fun onChange(selfChange: Boolean) {
                    reduceMotion = animationsOff(resolver)
                }
            }
            resolver.registerContentObserver(
                Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE),
                false,
                observer,
            )
            // Re-read on attach: the setting can change between the first read above and the moment
            // the observer is listening, and that gap would otherwise be invisible.
            reduceMotion = animationsOff(resolver)
            onDispose { resolver.unregisterContentObserver(observer) }
        }

        return reduceMotion
    }

    /** One read of the platform's animation scale. */
    private fun animationsOff(resolver: android.content.ContentResolver): Boolean =
        Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == ANIMATIONS_OFF

    /** Milliseconds a disclosure runs for: the canonical token, or none when motion is reduced. */
    fun durationMillis(reduceMotion: Boolean): Int = if (reduceMotion) 0 else KinetixDuration.fast

    /** The spec for a value that moves on expand — decelerating, per the `enter` token. */
    fun <T> enterSpec(reduceMotion: Boolean): FiniteAnimationSpec<T> =
        tween(durationMillis = durationMillis(reduceMotion), easing = KinetixEasing.enter)

    /** The spec for a value that moves on collapse — accelerating, per the `exit` token. */
    fun <T> exitSpec(reduceMotion: Boolean): FiniteAnimationSpec<T> =
        tween(durationMillis = durationMillis(reduceMotion), easing = KinetixEasing.exit)

    /** Content arriving: it still arrives under reduced motion, just without travelling. */
    fun enterTransition(reduceMotion: Boolean): EnterTransition =
        fadeIn(enterSpec(reduceMotion)) + expandVertically(enterSpec(reduceMotion))

    /** Content leaving. Separate from [enterTransition] because closing is its own curve. */
    fun exitTransition(reduceMotion: Boolean): ExitTransition =
        fadeOut(exitSpec(reduceMotion)) + shrinkVertically(exitSpec(reduceMotion))

    /**
     * The chevron's angle. Unchanged by the setting: the rotation is state, not decoration — it is
     * how a sighted reader sees the section is open — so it still lands at 180°, without turning.
     */
    fun chevronDegrees(expanded: Boolean): Float = if (expanded) 180f else 0f
}

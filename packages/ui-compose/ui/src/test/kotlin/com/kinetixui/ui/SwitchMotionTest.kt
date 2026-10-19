package com.kinetixui.ui

import android.provider.Settings
import androidx.compose.animation.core.TweenSpec
import androidx.compose.material3.Text
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.isToggleable
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.performClick
import com.kinetixui.tokens.KinetixDuration
import com.kinetixui.tokens.KinetixEasing
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * `KinetixSwitch`'s motion contract on Compose.
 *
 * ## What each half proves, and why neither substitutes for the other
 *
 * - **The spec tests** prove the *suppression*: the thumb's travel takes the canonical `instant`
 *   token, and collapses to zero — in both directions — when the reader has animations off.
 * - **The rendered tests** prove the suppression *did not break the control*: composed for real
 *   through Robolectric, the switch still reports on and off, still responds to a click, and still
 *   refuses one when disabled.
 *
 * - **The painted tests** prove that the TRACK is animated and not only the thumb. They hold the
 *   test clock still, advance it half a duration into the gesture, and read the colour the switch
 *   actually painted. Nothing else in this file can tell the two apart: `animateColorAsState` does
 *   not expose which spec it was handed, so an edit that sent the target colour straight to
 *   `.background(…)` would leave every spec assertion passing and `check:native-motion` green, since
 *   `Switch.kt` still names the helper for the thumb. Reading the pixel is what closes that.
 *
 * ## What is deliberately NOT claimed
 *
 * Not runtime. A painted pixel is still a pixel Robolectric rasterised on a JVM host: there is no
 * emulator or device job in this repository, nothing here is on a screen, and nothing here is what a
 * person or TalkBack would perceive. The marker below claims `interaction` and `reducedMotion`, not
 * `accessibility` — the on/off assertions are state, not an audit of what assistive technology
 * receives.
 *
 * ## The preference is the platform's, and it is the shared one
 *
 * `Settings.Global.ANIMATOR_DURATION_SCALE` is written through Robolectric's own application context,
 * so the control reads the real signal through the same `rememberReduceMotion` the disclosure family
 * uses. There is no test-only hook in the public API.
 *
 * Both directions throughout: OFF → ON and ON → OFF are asserted separately.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
// Robolectric's LEGACY graphics mode draws nothing, so `captureToImage` would hand back a blank
// bitmap and the painted tests below would compare two identical nothings and pass. NATIVE rasterises
// through the real Skia pipeline, which is the only mode in which reading a painted colour means
// anything.
@GraphicsMode(GraphicsMode.Mode.NATIVE)
// kx-verify: interaction, reducedMotion
class SwitchMotionTest {
    @get:Rule
    val rule = createComposeRule()

    private fun setAnimatorScale(scale: Float) {
        Settings.Global.putFloat(
            RuntimeEnvironment.getApplication().contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            scale,
        )
    }

    /**
     * Hosts a switch that owns its value.
     *
     * The state is declared OUTSIDE `setContent` deliberately: `mutableStateOf` inside a composable
     * without `remember` is rebuilt on every recomposition, so the click's new value would be thrown
     * away and the test would pass for the wrong reason. Returns the state so a test can read where
     * the control actually ended up. `KinetixTheme` is required — `KinetixSwitch` resolves its colours
     * from it, as every other Compose test in this module does.
     */
    private fun composeSwitch(initial: Boolean = false, enabled: Boolean = true): MutableState<Boolean> {
        val checked = mutableStateOf(initial)
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                KinetixSwitch(
                    checked = checked.value,
                    onCheckedChange = { checked.value = it },
                    enabled = enabled,
                )
            }
        }
        return checked
    }

    // ── the spec: where the timing comes from, and what suppresses it ────────

    @Test
    fun theTravelUsesTheCanonicalInstantToken() {
        // Was Compose's default spring. `instant` is what the React port these all mirror uses.
        assertEquals(KinetixDuration.instant, KinetixSwitchMotion.durationMillis(false))
    }

    @Test
    fun offToOnAndOnToOffAreBothSuppressed() {
        // One spec covers both directions because a switch is symmetric — but the assertion still
        // names both, because "symmetric" is a claim about the design, not evidence about the code.
        val spec = KinetixSwitchMotion.spec<Float>(true) as TweenSpec<Float>
        assertEquals(0, spec.durationMillis)
        assertEquals(0, KinetixSwitchMotion.durationMillis(true))
    }

    @Test
    fun theTravelUsesTheStandardCurveRatherThanADirectionalPair() {
        val spec = KinetixSwitchMotion.spec<Float>(false) as TweenSpec<Float>
        assertEquals(KinetixEasing.standard, spec.easing)
        assertEquals(KinetixDuration.instant, spec.durationMillis)
        // Not the disclosure family's enter/exit pair: a switch has no asymmetry to express.
        assertNotEquals(KinetixEasing.enter, spec.easing)
    }

    @Test
    fun theThumbDestinationIsStateNotMotion() {
        // Unchanged by the setting: it still reaches the far end with animations off, in one frame.
        // Compared on the Float rather than the Dp: the repo's existing float assertions use this
        // three-argument form, and it sidesteps any question about how a value class boxes here.
        assertEquals(0f, KinetixSwitchMotion.thumbOffset(false).value, 0f)
        assertEquals(24f, KinetixSwitchMotion.thumbOffset(true).value, 0f)
    }

    // ── rendered: the control still works ───────────────────────────────────
    //
    // Asserted through `isToggleable()` and the control's own reported value, which is the idiom the
    // rest of this module already compiles. `assertIsOn()` would read the semantics ToggleableState
    // directly and would be a slightly stronger claim, but no test in this repository uses it and
    // nothing here can compile Kotlin locally; the previous slice lost a CI round to exactly that
    // kind of assumption about a test API. What these prove is that the state change completes and
    // recomposition lands with animations off — which is the property at issue.

    @Test
    fun offToOnAndBackWithAnimationsOn() {
        setAnimatorScale(1f)
        val checked = composeSwitch()

        rule.onNode(isToggleable()).performClick()
        rule.waitForIdle()
        assertEquals(true, checked.value)

        rule.onNode(isToggleable()).performClick()
        rule.waitForIdle()
        assertEquals(false, checked.value)
    }

    @Test
    fun offToOnAndBackWithAnimationsOff() {
        setAnimatorScale(0f)
        val checked = composeSwitch()

        // Suppression is not removal: the state must still change, both ways.
        rule.onNode(isToggleable()).performClick()
        rule.waitForIdle()
        assertEquals(true, checked.value)

        rule.onNode(isToggleable()).performClick()
        rule.waitForIdle()
        assertEquals(false, checked.value)
    }

    @Test
    fun onToOffIsStillReachableWithAnimationsOff() {
        // Starting from on, so the reverse direction is exercised from its own initial state rather
        // than only as the second half of a round trip.
        setAnimatorScale(0f)
        val checked = composeSwitch(initial = true)

        rule.onNode(isToggleable()).performClick()
        rule.waitForIdle()
        assertEquals(false, checked.value)
    }

    @Test
    fun aDisabledSwitchIgnoresAClickWithAnimationsOff() {
        setAnimatorScale(0f)
        val checked = composeSwitch(enabled = false)

        rule.onNode(isToggleable()).performClick()
        rule.waitForIdle()
        assertEquals(false, checked.value)
    }

    @Test
    fun theLabelBesideItStillComposesWithAnimationsOff() {
        // A switch is almost never alone; this pins that the control and its label coexist rather
        // than one of them being replaced by the suppressed path.
        setAnimatorScale(0f)
        val checked = mutableStateOf(false)
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                androidx.compose.foundation.layout.Row {
                    KinetixSwitch(checked = checked.value, onCheckedChange = { checked.value = it })
                    Text("Airplane mode")
                }
            }
        }
        rule.onNode(isToggleable()).performClick()
        rule.waitForIdle()
        assertEquals(true, checked.value)
    }

    // ── painted: the track travels too, not only the thumb ──────────────────

    /**
     * Hosts a switch and hands back both its value and the colours it resolved.
     *
     * The scheme is captured out of the composition rather than rebuilt from the token objects, so
     * the endpoints these tests compare against are the ones the control itself was given.
     */
    private fun composeSwitchWithColours(initial: Boolean = false): Pair<MutableState<Boolean>, () -> KinetixColors> {
        val checked = mutableStateOf(initial)
        var captured: KinetixColors? = null
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                captured = KinetixColorScheme.current
                KinetixSwitch(
                    checked = checked.value,
                    onCheckedChange = { checked.value = it },
                )
            }
        }
        return checked to { requireNotNull(captured) { "KinetixTheme did not provide a colour scheme" } }
    }

    /**
     * The colour the track is painted at this instant.
     *
     * Taken as the most common fully opaque pixel in the switch rather than from a fixed coordinate,
     * because the thumb is moving: any coordinate that is track at one point in the gesture is thumb
     * at another. The track is the larger opaque area by a wide margin — a 48×24 rounded rectangle
     * against a 20dp circle, so roughly 840 pixels against 310 at this density — so the mode is the
     * track whatever the thumb is doing, and the antialiased blend along the thumb's edge cannot
     * outvote it because each of those pixels is its own distinct value. Translucent pixels are
     * skipped: outside the rounded ends there is nothing painted at all.
     */
    private fun paintedTrackColour(): Int {
        val pixels = rule.onNode(isToggleable()).captureToImage().toPixelMap()
        val counts = HashMap<Int, Int>()
        for (y in 0 until pixels.height) {
            for (x in 0 until pixels.width) {
                val pixel = pixels[x, y]
                if (pixel.alpha < 1f) continue
                val argb = pixel.toArgb()
                counts[argb] = (counts[argb] ?: 0) + 1
            }
        }
        return requireNotNull(counts.maxByOrNull { it.value }) {
            "the switch painted no opaque pixel, so the capture read nothing"
        }.key
    }

    @Test
    fun offToOnPaintsAnInterpolatedTrackColourHalfwayThrough() {
        setAnimatorScale(1f)
        rule.mainClock.autoAdvance = false
        val (checked, colours) = composeSwitchWithColours()
        val off = colours().tertiary.toArgb()
        val on = colours().action.toArgb()
        // Without this the rest of the test would pass on a switch that painted nothing at all.
        assertNotEquals("the two ends of the track must differ", off, on)
        assertEquals("an unchecked switch should paint the unchecked track colour", off, paintedTrackColour())

        rule.onNode(isToggleable()).performClick()
        // One frame to commit the click's new value and start the animation, then half the duration.
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(KinetixDuration.instant / 2L)
        assertEquals("the click should have taken effect", true, checked.value)

        val halfway = paintedTrackColour()
        // This is the assertion that fails if the track stops animating while the thumb still does:
        // an unanimated track is already at its destination one frame after the click.
        assertNotEquals("the track jumped straight to the checked colour", on, halfway)
        assertNotEquals("the track has not started moving", off, halfway)

        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals("the track should settle on the checked colour", on, paintedTrackColour())
    }

    @Test
    fun onToOffPaintsAnInterpolatedTrackColourHalfwayThrough() {
        // The reverse gesture from its own initial state, not as the second half of a round trip.
        setAnimatorScale(1f)
        rule.mainClock.autoAdvance = false
        val (checked, colours) = composeSwitchWithColours(initial = true)
        val off = colours().tertiary.toArgb()
        val on = colours().action.toArgb()
        assertEquals("a checked switch should paint the checked track colour", on, paintedTrackColour())

        rule.onNode(isToggleable()).performClick()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(KinetixDuration.instant / 2L)
        assertEquals("the click should have taken effect", false, checked.value)

        val halfway = paintedTrackColour()
        assertNotEquals("the track jumped straight to the unchecked colour", off, halfway)
        assertNotEquals("the track has not started moving", on, halfway)

        rule.mainClock.autoAdvance = true
        rule.waitForIdle()
        assertEquals("the track should settle on the unchecked colour", off, paintedTrackColour())
    }

    @Test
    fun withAnimationsOffTheTrackArrivesInsteadOfTravelling() {
        // Suppression at the painted level, where the spec tests above can only read the spec: the
        // same instant that showed an interpolated colour must now show the destination.
        setAnimatorScale(0f)
        rule.mainClock.autoAdvance = false
        val (checked, colours) = composeSwitchWithColours()
        val on = colours().action.toArgb()

        rule.onNode(isToggleable()).performClick()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(KinetixDuration.instant / 2L)
        assertEquals(true, checked.value)
        assertEquals("with animations off the track should already be at its destination", on, paintedTrackColour())
    }
}

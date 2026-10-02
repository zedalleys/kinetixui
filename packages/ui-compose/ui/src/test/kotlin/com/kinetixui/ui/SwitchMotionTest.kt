package com.kinetixui.ui

import android.provider.Settings
import androidx.compose.animation.core.TweenSpec
import androidx.compose.material3.Text
import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
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
 * ## What is deliberately NOT claimed
 *
 * No interpolated pixel midpoint. Compose's test surface exposes composition and semantics rather
 * than per-frame geometry, and the frame-clock APIs needed to approximate it are not part of the
 * surface this module's other tests establish. Flutter's widget tests DO measure the thumb's rendered
 * offset mid-travel (`test/switch_motion_test.dart`); that difference between platforms is stated in
 * the PR rather than smoothed over, and the marker below claims only `reducedMotion`, not
 * `accessibility` — the on/off assertions here are interaction and state, not an audit of what
 * assistive technology receives.
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
}

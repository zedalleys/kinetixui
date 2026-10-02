package com.kinetixui.ui

import android.provider.Settings
import androidx.compose.foundation.clickable
import androidx.compose.material3.Text
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.animation.core.TweenSpec
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
 * The disclosure family's reduced-motion contract on Compose.
 *
 * ## What each half proves
 *
 * The two halves assert different things on purpose, because one cannot stand in for the other:
 *
 * - **The spec tests** prove the *suppression*: the duration a disclosure runs for comes from the
 *   canonical token, and collapses to zero — in both directions — when the reader has animations off.
 * - **The rendered tests** prove the suppression *did not break the state change*: composed through
 *   Robolectric with the real Compose runtime, the content still appears and still disappears with
 *   animations off, and the toggle still works.
 *
 * ## What is deliberately NOT claimed
 *
 * No interpolated pixel midpoint. Compose's test surface exposes composition and semantics rather
 * than per-frame geometry, and the frame-clock APIs needed to approximate it are not part of the
 * surface this module's other tests establish. Inventing a geometry claim from a settled-state
 * assertion would be the exact over-reach the web motion gate exists to prevent. Flutter's widget
 * tests DO measure rendered intermediate geometry (`test/disclosure_motion_test.dart`); that
 * difference between platforms is stated in the PR rather than smoothed over.
 *
 * ## The preference is the platform's
 *
 * `Settings.Global.ANIMATOR_DURATION_SCALE` is the value Android itself sets to `0` when a reader
 * turns on Settings → Accessibility → "Remove animations". It is written here through Robolectric's
 * own application context, so the components read the real signal rather than a flag added for
 * testability — there is no test-only hook in the public API.
 *
 * Both directions are covered throughout. The web gate shipped proving only expansion and review
 * caught it: opening and closing are separate curves, so proving one says nothing about the other.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
// The marker deliberately does NOT claim `accessibility`. The repository defines that kind as a test
// asserting the semantics assistive technology receives, or running an accessibility engine; this suite
// asserts animation specs, clicks and whether content exists, which is none of those. Claiming it would
// have promoted these two components on an axis nothing here verifies.
// kx-verify: interaction, reducedMotion
class DisclosureMotionTest {
    @get:Rule
    val rule = createComposeRule()

    private fun setAnimatorScale(scale: Float) {
        Settings.Global.putFloat(
            RuntimeEnvironment.getApplication().contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            scale,
        )
    }

    // ── the spec: suppression ────────────────────────────────────────────────

    @Test
    fun durationComesFromTheCanonicalToken() {
        assertEquals(KinetixDuration.fast, KinetixDisclosureMotion.durationMillis(false))
    }

    @Test
    fun reducedMotionCollapsesTheDurationToZero() {
        assertEquals(0, KinetixDisclosureMotion.durationMillis(true))
    }

    @Test
    fun bothDirectionsAreSuppressed() {
        // Asserted on the duration rather than on the transition objects: `fadeIn(..) +
        // expandVertically(..)` builds a fresh instance every call, so comparing two of them for
        // inequality would pass whatever the specs contained — a test that cannot fail.
        val enter = (KinetixDisclosureMotion.enterSpec<Float>(true) as TweenSpec<Float>)
        val exit = (KinetixDisclosureMotion.exitSpec<Float>(true) as TweenSpec<Float>)
        assertEquals(0, enter.durationMillis) // expanding suppressed
        assertEquals(0, exit.durationMillis) // collapsing suppressed too
    }

    @Test
    fun openingAndClosingUseTheDirectionalEasingPair() {
        // `enter` decelerates, `exit` accelerates — the pair the easing tokens exist for, and the
        // same pair #274 landed on the web. Compared on the easing, which is the thing that differs.
        val enter = (KinetixDisclosureMotion.enterSpec<Float>(false) as TweenSpec<Float>)
        val exit = (KinetixDisclosureMotion.exitSpec<Float>(false) as TweenSpec<Float>)
        assertEquals(KinetixEasing.enter, enter.easing)
        assertEquals(KinetixEasing.exit, exit.easing)
        assertNotEquals(enter.easing, exit.easing)
        assertEquals(KinetixDuration.fast, enter.durationMillis)
        assertEquals(KinetixDuration.fast, exit.durationMillis)
    }

    @Test
    fun theChevronAngleIsStateNotMotion() {
        // Unchanged by the setting: it still reaches 180° with animations off, it just gets there in
        // one frame rather than sweeping.
        assertEquals(0f, KinetixDisclosureMotion.chevronDegrees(false), 0f)
        assertEquals(180f, KinetixDisclosureMotion.chevronDegrees(true), 0f)
    }

    // ── rendered: the state change survives ──────────────────────────────────

    /** A disclosure with its own toggle, composed for real. */
    private fun composeCollapsible() {
        var expanded by mutableStateOf(false)
        rule.setContent {
            androidx.compose.foundation.layout.Column {
                Text("toggle", modifier = Modifier.clickable { expanded = !expanded })
                KinetixCollapsible(expanded = expanded) { Text("disclosed body") }
            }
        }
    }

    @Test
    fun opensAndClosesWithAnimationsOn() {
        setAnimatorScale(1f)
        composeCollapsible()

        rule.onNodeWithText("toggle").performClick()
        rule.waitForIdle()
        rule.onNodeWithText("disclosed body").assertExists()

        rule.onNodeWithText("toggle").performClick()
        rule.waitForIdle()
        rule.onNodeWithText("disclosed body").assertDoesNotExist()
    }

    @Test
    fun opensAndClosesWithAnimationsOff() {
        setAnimatorScale(0f)
        composeCollapsible()

        // Suppression is not removal: the content must still arrive, and still be reachable.
        rule.onNodeWithText("toggle").performClick()
        rule.waitForIdle()
        rule.onNodeWithText("disclosed body").assertExists()

        // And the reverse direction must still complete.
        rule.onNodeWithText("toggle").performClick()
        rule.waitForIdle()
        rule.onNodeWithText("disclosed body").assertDoesNotExist()
    }

    @Test
    fun accordionDisclosesAndHidesWithAnimationsOff() {
        setAnimatorScale(0f)
        var expanded by mutableStateOf(false)
        rule.setContent {
            androidx.compose.foundation.layout.Column {
                KinetixAccordionTrigger(text = "Question", expanded = expanded, onClick = { expanded = !expanded })
                KinetixAccordionContent(expanded = expanded) { Text("answer text") }
            }
        }

        rule.onNodeWithText("Question").performClick()
        rule.waitForIdle()
        rule.onNodeWithText("answer text").assertExists()

        // The reverse direction, with motion suppressed: it must still close.
        rule.onNodeWithText("Question").performClick()
        rule.waitForIdle()
        rule.onNodeWithText("answer text").assertDoesNotExist()
    }

    @Test
    fun accordionDisclosesAndHidesWithAnimationsOn() {
        setAnimatorScale(1f)
        var expanded by mutableStateOf(false)
        rule.setContent {
            androidx.compose.foundation.layout.Column {
                KinetixAccordionTrigger(text = "Question", expanded = expanded, onClick = { expanded = !expanded })
                KinetixAccordionContent(expanded = expanded) { Text("answer text") }
            }
        }

        rule.onNodeWithText("Question").performClick()
        rule.waitForIdle()
        rule.onNodeWithText("answer text").assertExists()

        rule.onNodeWithText("Question").performClick()
        rule.waitForIdle()
        rule.onNodeWithText("answer text").assertDoesNotExist()
    }

    // Two tests rather than one loop: `createComposeRule` accepts `setContent` once per
    // test, and calling it a second time throws IllegalStateException — which is exactly
    // how CI failed. The pair still asserts the same thing: the settled state does not
    // depend on the reader's setting.

    @Test
    fun theSettledStateIsCorrectWithAnimationsOn() {
        setAnimatorScale(1f)
        rule.setContent { KinetixCollapsible(expanded = true) { Text("settled on") } }
        rule.waitForIdle()
        rule.onNodeWithText("settled on").assertExists()
    }

    @Test
    fun theSettingIsObservedWhileTheScreenIsOpen() {
        // The reader can turn animations off without the screen being recreated. This drives the
        // notification the platform sends on that change and asserts the resolver re-reads.
        //
        // What it proves: the ContentObserver is registered on the right URI and updates snapshot
        // state. What it does not prove: that the real framework notifies on this exact setting — that
        // is the platform's contract, not something a JVM test can establish.
        setAnimatorScale(1f)
        val seen = mutableListOf<Boolean>()
        rule.setContent { seen.add(KinetixDisclosureMotion.rememberReduceMotion()) }
        rule.waitForIdle()
        assertEquals(false, seen.last())

        setAnimatorScale(0f)
        RuntimeEnvironment.getApplication().contentResolver.notifyChange(
            Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE),
            null,
        )
        rule.waitForIdle()
        assertEquals(true, seen.last())
    }

    @Test
    fun theSettledStateIsCorrectWithAnimationsOff() {
        setAnimatorScale(0f)
        rule.setContent { KinetixCollapsible(expanded = true) { Text("settled off") } }
        rule.waitForIdle()
        rule.onNodeWithText("settled off").assertExists()
    }
}

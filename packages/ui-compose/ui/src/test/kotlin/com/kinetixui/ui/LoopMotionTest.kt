package com.kinetixui.ui

import android.provider.Settings
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.hasScrollAction
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import com.kinetixui.tokens.KinetixOpacity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

/**
 * The continuous-loop family on Compose: Spinner, Skeleton, Marquee and the typing indicator.
 *
 * ## What this proves
 *
 * - **The spec**: [KinetixLoopMotion.runs] is false exactly when the reader has animations off, and
 *   the loop values the components read are the ones the web keyframes use.
 * - **The rendered state**: composed for real through Robolectric with the platform's own
 *   `ANIMATOR_DURATION_SCALE`, each member still tells TalkBack what the motion was telling a sighted
 *   reader, in both modes. The Marquee's reduced form is observably different: it exposes a scroll
 *   action (the reader moves it by hand) and still has exactly one copy of its content in semantics.
 *
 * ## What is deliberately NOT claimed
 *
 * No measured rotation, alpha or offset over time. Compose's test surface here is composition and
 * semantics; the frame-clock work needed to sample a running infinite transition is not something
 * this module's other tests establish, and nothing in this repository can compile Kotlin outside CI.
 * Flutter's suite (`test/loop_motion_test.dart`) does sample rendered values over time. The two are
 * not claimed to be equal evidence.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
// kx-verify: reducedMotion
class LoopMotionTest {
    @get:Rule
    val rule = createComposeRule()

    private fun setAnimatorScale(scale: Float) {
        Settings.Global.putFloat(
            RuntimeEnvironment.getApplication().contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            scale,
        )
    }

    // ── the spec ─────────────────────────────────────────────────────────────

    @Test
    fun loopsRunWithNormalMotionAndStopWithReducedMotion() {
        assertTrue(KinetixLoopMotion.runs(reduceMotion = false))
        assertFalse(KinetixLoopMotion.runs(reduceMotion = true))
    }

    @Test
    fun loopPeriodsMirrorTheWebKeyframes() {
        assertEquals(800, KinetixLoopMotion.spinnerPeriodMillis)
        assertEquals(1000, KinetixLoopMotion.skeletonHalfCycleMillis)
        assertEquals(1200, KinetixLoopMotion.typingPeriodMillis)
        assertEquals(150, KinetixLoopMotion.typingStaggerMillis)
    }

    @Test
    fun typingDotsRestAtTheMutedOpacityTokenWithReducedMotion() {
        assertEquals(KinetixOpacity.muted, KinetixLoopMotion.restingDotOpacity, 0f)
    }

    // ── rendered: the information survives in both modes ─────────────────────

    @Test
    fun spinnerSaysLoadingWithNormalMotion() {
        setAnimatorScale(1f)
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixSpinner() } }
        rule.onNodeWithContentDescription("Loading").assertExists()
    }

    @Test
    fun spinnerStillSaysLoadingWithReducedMotion() {
        setAnimatorScale(0f)
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixSpinner(label = "Loading results") } }
        rule.onNodeWithContentDescription("Loading results").assertExists()
    }

    @Test
    fun skeletonComposesWithNormalMotion() {
        setAnimatorScale(1f)
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixSkeleton(Modifier.testTag("placeholder")) } }
        rule.onNodeWithTag("placeholder").assertExists()
    }

    @Test
    fun skeletonStillComposesWithReducedMotion() {
        // The placeholder's presence is its information; only the pulse goes.
        setAnimatorScale(0f)
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixSkeleton(Modifier.testTag("placeholder")) } }
        rule.onNodeWithTag("placeholder").assertExists()
    }

    @Test
    fun typingIndicatorSaysTypingWithNormalMotion() {
        setAnimatorScale(1f)
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixTypingIndicator() } }
        rule.onNodeWithContentDescription("Typing").assertExists()
    }

    @Test
    fun typingIndicatorStillSaysTypingWithReducedMotion() {
        setAnimatorScale(0f)
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixTypingIndicator() } }
        rule.onNodeWithContentDescription("Typing").assertExists()
    }

    @Test
    fun marqueeTicksByItselfWithNormalMotion() {
        // Moving on its own: nothing for the reader to scroll, and the duplicate copy stays out of
        // semantics, so the content is announced once.
        setAnimatorScale(1f)
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixMarquee { Text("Alpha") } } }
        rule.onAllNodesWithText("Alpha").assertCountEquals(1)
        rule.onAllNodes(hasScrollAction()).assertCountEquals(0)
    }

    @Test
    fun marqueeBecomesAHandScrolledRowWithReducedMotion() {
        // Not frozen in place: every item stays reachable, by the reader's own scroll.
        setAnimatorScale(0f)
        rule.setContent { KinetixTheme(darkTheme = false) { KinetixMarquee { Text("Alpha") } } }
        rule.onAllNodesWithText("Alpha").assertCountEquals(1)
        rule.onAllNodes(hasScrollAction()).assertCountEquals(1)
    }
}

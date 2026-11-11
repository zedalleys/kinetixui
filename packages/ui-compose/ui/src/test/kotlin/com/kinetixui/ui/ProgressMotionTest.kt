package com.kinetixui.ui

import android.provider.Settings
import androidx.compose.animation.core.TweenSpec
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import com.kinetixui.tokens.KinetixDuration
import com.kinetixui.tokens.KinetixEasing
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ProgressMotionTest {
    @get:Rule val rule = createComposeRule(effectContext = object : MotionDurationScale { override val scaleFactor = 1f })
    private fun preference(reduced: Boolean) {
        Settings.Global.putFloat(RuntimeEnvironment.getApplication().contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, if (reduced) 0f else 1f)
    }
    @Test fun increasesAndDecreasesUseBaseLinearTiming() {
        val normal = KinetixProgressMotion.spec(false) as TweenSpec<Float>
        assertEquals(KinetixDuration.base, normal.durationMillis)
        assertEquals(KinetixEasing.linear, normal.easing)
        assertEquals(0, (KinetixProgressMotion.spec(true) as TweenSpec<Float>).durationMillis)
    }
    @Test fun negativeDecimalAndNonfiniteTargetsAreBounded() {
        assertEquals(0f, KinetixProgressMotion.fraction(-25f))
        assertEquals(0.2525f, KinetixProgressMotion.fraction(25.25f), 0.00001f)
        assertEquals(1f, KinetixProgressMotion.fraction(125f))
        assertEquals(0f, KinetixProgressMotion.fraction(Float.NaN))
        assertEquals(1f, KinetixProgressMotion.fraction(Float.POSITIVE_INFINITY))
        assertEquals(0f, KinetixProgressMotion.fraction(Float.NEGATIVE_INFINITY))
    }
    @Test fun increasesAndDecreasesInterpolateWhileBothComponentsExposeTheExactTarget() {
        preference(false)
        val value = mutableStateOf(20f)
        val observed = mutableListOf<Float>()
        rule.mainClock.autoAdvance = false
        rule.setContent { KinetixTheme { Column {
            val reduced = KinetixDisclosureMotion.rememberReduceMotion()
            val fraction = KinetixProgressMotion.animatedFraction(value.value, reduced)
            SideEffect { observed.add(fraction) }
            KinetixProgress(value.value, Modifier.testTag("bar"))
            KinetixCircularProgress(value.value, Modifier.testTag("ring"), showValue = true)
        } } }
        rule.mainClock.advanceTimeByFrame()
        rule.runOnIdle { value.value = 80f }
        rule.waitForIdle()
        rule.mainClock.advanceTimeByFrame(); rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(120)
        rule.runOnIdle { assertTrue("observed midpoint: ${observed.last()}; history: $observed", observed.last() > 0.2f && observed.last() < 0.8f) }
        for (tag in listOf("bar", "ring")) assertEquals(0.8f, rule.onNodeWithTag(tag).fetchSemanticsNode().config[SemanticsProperties.ProgressBarRangeInfo].current)
        val from = observed.last()
        rule.runOnIdle { value.value = 5f }
        rule.mainClock.advanceTimeByFrame(); rule.mainClock.advanceTimeByFrame(); rule.mainClock.advanceTimeBy(100)
        rule.runOnIdle { assertTrue(observed.last() > 0.05f && observed.last() < from) }
        rule.mainClock.advanceTimeBy(400)
        rule.runOnIdle { assertEquals(0.05f, observed.last(), 0.00001f) }
    }
    @Test fun liveReducedMotionSettlesAndRestoringMotionDoesNotReplayOldProgress() {
        preference(false)
        val value = mutableStateOf(20f)
        val observed = mutableListOf<Float>()
        rule.mainClock.autoAdvance = false
        rule.setContent {
            val reduced = KinetixDisclosureMotion.rememberReduceMotion()
            val fraction = KinetixProgressMotion.animatedFraction(value.value, reduced)
            SideEffect { observed.add(fraction) }
        }
        rule.runOnIdle { value.value = 90f }
        rule.mainClock.advanceTimeBy(100)
        rule.runOnIdle { preference(true) }
        rule.waitForIdle(); rule.mainClock.advanceTimeBy(32); rule.waitForIdle()
        rule.runOnIdle { assertEquals(0.9f, observed.last(), 0.00001f) }
        rule.runOnIdle { preference(false) }
        rule.waitForIdle(); rule.mainClock.advanceTimeBy(32); rule.waitForIdle()
        rule.runOnIdle { assertEquals(0.9f, observed.last(), 0.00001f) }
    }
    @Test fun continuousFrameSpacedRetargetsAdvanceWithoutQueuing() {
        preference(false)
        val value = mutableStateOf(0f)
        val observed = mutableListOf<Float>()
        rule.mainClock.autoAdvance = false
        rule.setContent { val fraction = KinetixProgressMotion.animatedFraction(value.value, false); SideEffect { observed.add(fraction) } }
        for (target in 1..30) {
            rule.runOnIdle { value.value = target.toFloat() }
            rule.mainClock.advanceTimeByFrame()
        }
        rule.runOnIdle { assertTrue("continuous updates must not freeze", observed.last() > 0f) }
        rule.mainClock.advanceTimeBy(400)
        rule.runOnIdle { assertEquals(0.3f, observed.last(), 0.00001f) }
    }
}

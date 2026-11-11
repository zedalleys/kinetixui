package com.kinetixui.ui

import android.provider.Settings
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.foundation.layout.Column
import androidx.compose.ui.test.onNodeWithContentDescription
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class AnimatedNumberTest {
    @get:Rule val rule = createComposeRule()

    @Test fun increasesAndDecreasesWithTargetSemantics() {
        Settings.Global.putFloat(RuntimeEnvironment.getApplication().contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
        val value = mutableStateOf(20f)
        val observed = mutableListOf<Float>()
        rule.mainClock.autoAdvance = false
        rule.setContent { KinetixTheme(darkTheme = false) { Column {
            KinetixAnimatedNumber(value.value, { observed.add(it); it.toInt().toString() })
            Button(onClick = { value.value = if (value.value == 20f) 100f else -20f }) { Text("Change") }
        } } }
        rule.onNodeWithContentDescription("20").assertExists()
        rule.onNodeWithText("Change").performClick()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeByFrame()
        rule.mainClock.advanceTimeBy(150)
        rule.onNodeWithContentDescription("100").assertExists()
        rule.runOnIdle { assertTrue(observed.any { it > 20f && it < 100f }) }
        rule.onNodeWithText("Change").performClick()
        rule.mainClock.advanceTimeBy(400)
        rule.onNodeWithContentDescription("-20").assertExists()
    }

    @Test fun reducedMotionReachesTarget() {
        Settings.Global.putFloat(RuntimeEnvironment.getApplication().contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 0f)
        val value = mutableStateOf(20f)
        rule.setContent { KinetixTheme(darkTheme = false) {
            KinetixAnimatedNumber(value.value, { it.toInt().toString() })
        } }
        rule.runOnIdle { value.value = 100f }
        rule.onNodeWithContentDescription("100").assertExists()
    }

    @Test fun restoringNormalMotionDoesNotReplayAnInterruptedNumber() {
        val resolver = RuntimeEnvironment.getApplication().contentResolver
        fun setReduced(reduced: Boolean) {
            Settings.Global.putFloat(
                resolver,
                Settings.Global.ANIMATOR_DURATION_SCALE,
                if (reduced) 0f else 1f,
            )
        }
        setReduced(false)
        val value = mutableStateOf(20f)
        val observed = mutableListOf<Float>()
        rule.mainClock.autoAdvance = false
        rule.setContent { KinetixTheme(darkTheme = false) {
            KinetixAnimatedNumber(value.value, { observed.add(it); it.toString() })
        } }
        rule.mainClock.advanceTimeByFrame()
        rule.runOnIdle { value.value = 100f }
        rule.waitForIdle()
        rule.mainClock.advanceTimeBy(96)
        rule.runOnIdle { assertTrue(observed.any { it > 20f && it < 100f }) }

        rule.runOnIdle { setReduced(true) }
        rule.waitForIdle()
        rule.mainClock.advanceTimeByFrame()
        rule.runOnIdle {
            assertEquals(100f, observed.last(), 0f)
            observed.clear()
            setReduced(false)
        }
        rule.waitForIdle()
        rule.mainClock.advanceTimeBy(32)
        rule.runOnIdle {
            assertTrue(
                "Restoring motion replayed stale values: $observed",
                observed.isNotEmpty() && observed.all { it == 100f },
            )
        }
    }
}

package com.kinetixui.ui

import android.provider.Settings
import androidx.compose.material3.Text
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.shadows.ShadowDialog
import org.robolectric.annotation.Config
import kotlin.coroutines.EmptyCoroutineContext

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class SheetMotionTest {
    // Pin the test coroutine's normal scale so earlier Robolectric settings
    // cannot turn the geometry assertion into an instant transition.
    @get:Rule val rule = createComposeRule(effectContext = object : MotionDurationScale {
        override val scaleFactor = 1f
    })

    private fun preference(reduced: Boolean) {
        Settings.Global.putFloat(RuntimeEnvironment.getApplication().contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE, if (reduced) 0f else 1f)
    }

    @Test fun normalMotionPreservesTheNativeDurationScale() {
        assertSame(EmptyCoroutineContext, KinetixSheetMotion.context(false))
        assertEquals(0f, KinetixSheetMotion.context(true)[MotionDurationScale]!!.scaleFactor)
    }

    @Test fun slidesWithNormalMotionAndRetainsContentUntilExitFinishes() {
        preference(false)
        val visible = mutableStateOf(false)
        rule.setContent { KinetixTheme { KinetixSheet(visible.value, { visible.value = false }) { Text("Panel", Modifier.testTag("panel")) } } }
        rule.mainClock.autoAdvance = false
        rule.runOnIdle { visible.value = true }
        rule.mainClock.advanceTimeByFrame()
        rule.waitForIdle()
        rule.mainClock.advanceTimeBy(1200)
        rule.onNodeWithTag("panel").assertExists()
        rule.runOnIdle { visible.value = false }
        rule.mainClock.advanceTimeByFrame()
        rule.onNodeWithTag("panel").assertExists()
        rule.mainClock.advanceTimeBy(1200)
        rule.onNodeWithTag("panel").assertDoesNotExist()
    }

    @Test fun reducedMotionOpensAndClosesTheDrawerWithoutLosingItsState() {
        preference(true)
        val visible = mutableStateOf(false)
        rule.setContent { KinetixTheme { KinetixDrawer(visible.value, { visible.value = false }) { Text("Panel", Modifier.testTag("panel")) } } }
        rule.runOnIdle { visible.value = true }
        rule.onNodeWithTag("panel").assertExists()
        rule.runOnIdle { visible.value = false }
        rule.onNodeWithTag("panel").assertDoesNotExist()
    }

    @Test fun closeDuringFirstLayoutCannotLeaveAnInvisibleModal() {
        preference(false)
        val visible = mutableStateOf(false)
        rule.setContent { KinetixTheme { KinetixSheet(visible.value, { visible.value = false }) { Text("Panel", Modifier.testTag("panel")) } } }
        rule.mainClock.autoAdvance = false
        rule.runOnIdle { visible.value = true }
        rule.mainClock.advanceTimeByFrame()
        rule.runOnIdle { visible.value = false }
        rule.mainClock.advanceTimeByFrame()
        rule.waitForIdle()
        rule.mainClock.advanceTimeBy(1200)
        rule.onNodeWithTag("panel").assertDoesNotExist()
    }

    @Test fun removalDuringExitCancelsThePresentationCoroutine() {
        preference(false)
        val visible = mutableStateOf(true)
        val attached = mutableStateOf(true)
        rule.setContent { KinetixTheme { if (attached.value) KinetixSheet(visible.value, {}) { Text("Panel", Modifier.testTag("panel")) } } }
        rule.runOnIdle { visible.value = false; attached.value = false }
        rule.mainClock.advanceTimeBy(1200)
        rule.onNodeWithTag("panel").assertDoesNotExist()
    }

    @Test fun nativeBackDuringControlledExitCannotLeaveTheModalShowing() {
        preference(false)
        val visible = mutableStateOf(false)
        rule.setContent { KinetixTheme { KinetixSheet(visible.value, { visible.value = false }) { Text("Panel", Modifier.testTag("panel")) } } }
        rule.runOnIdle { visible.value = true }
        rule.onNodeWithTag("panel").assertExists()
        val dialog = ShadowDialog.getLatestDialog()
        rule.runOnIdle { assertTrue(dialog.isShowing) }
        rule.mainClock.autoAdvance = false
        rule.runOnIdle { visible.value = false }
        rule.mainClock.advanceTimeByFrame()
        rule.waitForIdle()
        rule.mainClock.advanceTimeByFrame()
        rule.runOnIdle { @Suppress("DEPRECATION") dialog.onBackPressed() }
        rule.mainClock.advanceTimeBy(1200)
        rule.waitForIdle()
        rule.mainClock.advanceTimeByFrame()
        rule.runOnIdle { assertFalse("a native interruption must not retain a hidden blocking Dialog", dialog.isShowing) }
    }

    @Test fun rapidReversalAndLiveReducedMotionDoNotLeaveAStaleDialog() {
        preference(false)
        val visible = mutableStateOf(false)
        rule.setContent { KinetixTheme { KinetixSheet(visible.value, { visible.value = false }) { Text("Panel", Modifier.testTag("panel")) } } }
        rule.mainClock.autoAdvance = false
        rule.runOnIdle { visible.value = true }
        rule.mainClock.advanceTimeByFrame()
        rule.waitForIdle()
        rule.mainClock.advanceTimeBy(200)
        rule.runOnIdle { visible.value = false }
        rule.mainClock.advanceTimeBy(32)
        rule.runOnIdle { visible.value = true }
        rule.mainClock.advanceTimeByFrame()
        rule.waitForIdle()
        rule.mainClock.advanceTimeBy(1200)
        rule.onNodeWithTag("panel").assertExists()
        rule.runOnIdle { preference(true); visible.value = false }
        rule.waitForIdle()
        rule.mainClock.advanceTimeBy(100)
        rule.waitForIdle()
        rule.mainClock.advanceTimeByFrame()
        rule.onNodeWithTag("panel").assertDoesNotExist()
    }
}

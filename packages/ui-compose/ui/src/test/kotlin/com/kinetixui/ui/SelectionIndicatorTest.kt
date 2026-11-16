// kx-verify: interaction, reducedMotion, rtl
// kx-verify-only: segmented-control, tabs

package com.kinetixui.ui

import android.provider.Settings
import androidx.compose.foundation.layout.width
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.graphics.toPixelMap
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertIsNotSelected
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import kotlin.math.abs

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
@GraphicsMode(GraphicsMode.Mode.NATIVE)
class SelectionIndicatorTest {
    @get:Rule val rule = createComposeRule()

    @Test fun tabsGlidePreviousToNext() = verifyTravel(tabs = true, start = 0, end = 2)

    @Test fun tabsGlideNextToPrevious() = verifyTravel(tabs = true, start = 2, end = 0)

    @Test fun segmentsGlidePreviousToNext() = verifyTravel(tabs = false, start = 0, end = 2)

    @Test fun segmentsGlideNextToPrevious() = verifyTravel(tabs = false, start = 2, end = 0)

    @Test
    fun scaledTrackPaintsUnderTheSelectedTab() {
        var surface = 0
        rule.setContent {
            KinetixTheme {
                surface = KinetixColorScheme.current.background.toArgb()
                KinetixTabsList(Modifier.graphicsLayer { scaleX = 0.65f }.testTag("track")) {
                    KinetixTabsTrigger("One", false, {}, Modifier.width(80.dp))
                    KinetixTabsTrigger("Two", true, {}, Modifier.width(90.dp).testTag("selected"))
                }
            }
        }
        val track = rule.onNodeWithTag("track")
        val image = track.captureToImage().toPixelMap()
        val rowBounds = track.fetchSemanticsNode().boundsInRoot
        val selectedBounds = rule.onNodeWithTag("selected").fetchSemanticsNode().boundsInRoot
        val expected = (selectedBounds.left - rowBounds.left) / rowBounds.width * image.width
        val actual = (0 until image.width).first { image[it, image.height / 2].toArgb() == surface }
        assertTrue("scaled indicator starts at $actual, selected item starts at $expected", abs(actual - expected) <= 3f)
    }

    private fun verifyTravel(tabs: Boolean, start: Int, end: Int) {
        val resolver = RuntimeEnvironment.getApplication().contentResolver
        fun scale(value: Float) {
            Settings.Global.putFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, value)
            resolver.notifyChange(Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE), null)
            rule.waitForIdle()
        }
        scale(1f)
        val selected = mutableStateOf(start)
        val direction = mutableStateOf(LayoutDirection.Ltr)
        val thirdWidth = mutableStateOf(102.dp)
        var surface = 0
        rule.setContent {
            KinetixTheme {
                surface = KinetixColorScheme.current.background.toArgb()
                CompositionLocalProvider(LocalLayoutDirection provides direction.value) {
                    val track = Modifier.testTag("track")
                    val widths = listOf(62.dp, 85.dp, thirdWidth.value)
                    if (tabs) {
                        KinetixTabsList(track) {
                            widths.forEachIndexed { index, width ->
                                KinetixTabsTrigger("Item ${index + 1}", selected.value == index,
                                    { selected.value = index }, Modifier.width(width).testTag("item-$index"), enabled = index != 1)
                            }
                        }
                    } else {
                        KinetixSegmentedControl(track) {
                            widths.forEachIndexed { index, width ->
                                KinetixSegmentedControlItem("Item ${index + 1}", selected.value == index,
                                    { selected.value = index }, Modifier.width(width).testTag("item-$index"), enabled = index != 1)
                            }
                        }
                    }
                }
            }
        }

        fun left(): Int {
            val image = rule.onNodeWithTag("track").captureToImage().toPixelMap()
            val y = image.height / 2
            return (0 until image.width).first { image[it, y].toArgb() == surface }
        }

        fun itemLeft(index: Int): Float = rule.onNodeWithTag("item-$index").fetchSemanticsNode().boundsInRoot.left -
            rule.onNodeWithTag("track").fetchSemanticsNode().boundsInRoot.left

        rule.onNodeWithTag("item-1").assertIsNotEnabled()
        val first = left()
        val target = itemLeft(end)
        val sign = if (end > start) 1 else -1
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("item-$end").performClick()
        rule.mainClock.advanceTimeBy(64)
        val early = left()
        rule.mainClock.advanceTimeBy(48)
        val midway = left()
        assertEquals(end, selected.value)
        rule.onNodeWithTag("item-$end").assertIsSelected()
        rule.onNodeWithTag("item-$start").assertIsNotSelected()
        assertTrue(
            "indicator must travel through distinct intermediate positions (first=$first, early=$early, midway=$midway, target=$target)",
            sign * (early - first) > 1 && sign * (midway - early) > 1 && sign * (target - midway) > 3f,
        )

        rule.onNodeWithTag("item-$start").performClick()
        rule.mainClock.advanceTimeByFrame()
        val retarget = left()
        assertTrue("retarget must start near the rendered position (first=$first, midway=$midway, retarget=$retarget)",
            abs(retarget - midway) < abs(midway - first))
        scale(0f)
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        assertEquals(first, left())
        scale(1f)
        rule.mainClock.advanceTimeBy(350)
        assertEquals(first, left())

        rule.mainClock.autoAdvance = true
        rule.runOnIdle {
            direction.value = LayoutDirection.Rtl
            thirdWidth.value = 125.dp
        }
        val rtlLeft = left()
        val rtlTarget = itemLeft(start)
        assertTrue("RTL indicator must align to the selected item: $rtlLeft vs $rtlTarget",
            abs(rtlLeft - rtlTarget) <= 3f)
        assertTrue(sign * (rtlLeft - first) > 0)
    }
}

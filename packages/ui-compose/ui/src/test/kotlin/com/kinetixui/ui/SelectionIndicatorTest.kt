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
import androidx.compose.ui.test.assertIsSelected
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

    @Test fun tabsTravelForwardAndRetargetBackwardDuringLiveReduction() = verifyTravel(tabs = true)

    @Test fun segmentsTravelForwardAndRetargetBackwardDuringLiveReduction() = verifyTravel(tabs = false)

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

    private fun verifyTravel(tabs: Boolean) {
        val resolver = RuntimeEnvironment.getApplication().contentResolver
        fun scale(value: Float) {
            Settings.Global.putFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, value)
            resolver.notifyChange(Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE), null)
            rule.waitForIdle()
        }
        scale(1f)
        val selected = mutableStateOf(0)
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
                                    { selected.value = index }, Modifier.width(width).testTag("item-$index"))
                            }
                        }
                    } else {
                        KinetixSegmentedControl(track) {
                            widths.forEachIndexed { index, width ->
                                KinetixSegmentedControlItem("Item ${index + 1}", selected.value == index,
                                    { selected.value = index }, Modifier.width(width).testTag("item-$index"))
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

        val first = left()
        rule.mainClock.autoAdvance = false
        rule.onNodeWithTag("item-2").performClick()
        repeat(3) { rule.mainClock.advanceTimeByFrame() }
        rule.mainClock.advanceTimeBy(48)
        val midway = left()
        assertEquals(2, selected.value)
        if (tabs) rule.onNodeWithTag("item-2").assertIsSelected()
        assertTrue("indicator must have a visible intermediate position", midway > first)

        rule.onNodeWithTag("item-0").performClick()
        rule.mainClock.advanceTimeByFrame()
        val retarget = left()
        assertTrue("retarget must start near the rendered position (first=$first, midway=$midway, retarget=$retarget)", abs(retarget - midway) < midway - first)
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
        val trackLeft = rule.onNodeWithTag("track").fetchSemanticsNode().boundsInRoot.left
        val selectedLeft = rule.onNodeWithTag("item-0").fetchSemanticsNode().boundsInRoot.left
        val rtlLeft = left()
        assertTrue("RTL indicator must align to the selected item: $rtlLeft vs ${selectedLeft - trackLeft}",
            abs(rtlLeft - (selectedLeft - trackLeft)) <= 3f)
        assertTrue(rtlLeft > first)
    }
}

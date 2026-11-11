package com.kinetixui.ui

import android.provider.Settings
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material3.Text
import androidx.compose.ui.Modifier
import androidx.compose.ui.MotionDurationScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTouchInput
import androidx.compose.ui.test.swipeLeft
import androidx.compose.ui.unit.dp
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.RuntimeEnvironment
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class CarouselMotionTest {
    // Model the window scale that remains at one for an already-running scroll.
    @get:Rule val rule = createComposeRule(effectContext = object : MotionDurationScale {
        override val scaleFactor = 1f
    })

    private lateinit var pager: PagerState

    private fun setReduced(reduced: Boolean) {
        Settings.Global.putFloat(
            RuntimeEnvironment.getApplication().contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            if (reduced) 0f else 1f,
        )
    }

    private fun mount(reduced: Boolean = false, start: Int = 0) {
        setReduced(reduced)
        rule.mainClock.autoAdvance = false
        rule.setContent {
            KinetixTheme(darkTheme = false) {
                pager = rememberPagerState(initialPage = start) { 3 }
                Column {
                    KinetixCarouselNext(pager)
                    KinetixCarouselPrevious(pager)
                    KinetixCarousel(pager, Modifier.height(160.dp).testTag("pager")) { Text("Page $it") }
                }
            }
        }
        rule.mainClock.advanceTimeByFrame()
    }

    private fun assertSettled(page: Int) = rule.runOnIdle {
        assertEquals(page, pager.currentPage)
        assertEquals(0f, pager.currentPageOffsetFraction, 0.001f)
        assertFalse(pager.isScrollInProgress)
    }

    @Test fun liveReductionSettlesForwardScrollAndRestorationDoesNotReplay() {
        mount()
        rule.onNodeWithContentDescription("Next slide").performClick()
        rule.mainClock.advanceTimeBy(96)
        rule.runOnIdle {
            assertTrue(pager.isScrollInProgress)
            assertTrue(pager.currentPageOffsetFraction != 0f)
            setReduced(true)
        }
        rule.waitForIdle()
        rule.mainClock.advanceTimeBy(32)
        assertSettled(1)
        rule.runOnIdle { setReduced(false) }
        rule.waitForIdle()
        repeat(5) {
            rule.mainClock.advanceTimeByFrame()
            assertSettled(1)
        }
        rule.onNodeWithContentDescription("Previous slide").performClick()
        rule.mainClock.advanceTimeBy(96)
        rule.runOnIdle {
            assertTrue(pager.isScrollInProgress)
            assertTrue(pager.currentPageOffsetFraction != 0f)
        }
        rule.mainClock.advanceTimeBy(800)
        assertSettled(0)
    }

    @Test fun liveReductionSettlesBackwardScrollAtItsDestination() {
        mount(start = 2)
        rule.onNodeWithContentDescription("Previous slide").performClick()
        rule.mainClock.advanceTimeBy(96)
        rule.runOnIdle {
            assertTrue(pager.isScrollInProgress)
            assertTrue(pager.currentPageOffsetFraction != 0f)
            setReduced(true)
        }
        rule.waitForIdle()
        rule.mainClock.advanceTimeBy(32)
        assertSettled(1)
    }

    @Test fun reducedButtonsSnapAndPointerSwipeStillPages() {
        mount(reduced = true)
        rule.onNodeWithContentDescription("Next slide").performClick()
        rule.mainClock.advanceTimeBy(32)
        assertSettled(1)
        rule.onNodeWithContentDescription("Previous slide").performClick()
        rule.mainClock.advanceTimeBy(32)
        assertSettled(0)
        rule.onNodeWithTag("pager").performTouchInput { swipeLeft() }
        rule.mainClock.advanceTimeBy(800)
        assertSettled(1)
    }
}

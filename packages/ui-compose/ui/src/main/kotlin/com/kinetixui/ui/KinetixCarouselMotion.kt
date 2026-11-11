package com.kinetixui.ui

import androidx.compose.foundation.pager.PagerState
import androidx.compose.runtime.State
import androidx.compose.ui.MotionDurationScale
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.withContext

internal object KinetixCarouselMotion {
    suspend fun move(pager: PagerState, page: Int, reduceMotion: State<Boolean>) {
        if (reduceMotion.value) {
            pager.scrollToPage(page)
            return
        }

        val windowScale = currentCoroutineContext()[MotionDurationScale]
        // The pager reads this scale on each animation frame. Zero settles the
        // active scroll at its own target, without starting a new scroll.
        val liveScale = object : MotionDurationScale {
            override val scaleFactor: Float
                get() = if (reduceMotion.value) 0f else windowScale?.scaleFactor ?: 1f
        }
        withContext(liveScale) {
            pager.animateScrollToPage(page)
        }
    }
}

package com.kinetixui.ui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.PagerState
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

/**
 * KinetixCarousel family — mirrors
 * `packages/ui/src/components/carousel.tsx` (a themed wrapper over the
 * `embla-carousel-react` library). Compose's own `HorizontalPager`/
 * `VerticalPager` (`@ExperimentalFoundationApi` at this project's Compose
 * version — stable behavior, just an opt-in) already provide exactly what
 * Embla provides — swipe paging, snap positioning, programmatic scroll —
 * so this wraps that machinery directly rather than a hand-rolled drag
 * implementation, the same "reuse the platform's gesture/paging machinery"
 * call [KinetixSlider] made for drag and [KinetixToaster] made for
 * queuing. There's no separate `CarouselContent`/`CarouselItem` pair:
 * `HorizontalPager`'s own `content: @Composable (page: Int) -> Unit`
 * lambda already covers both. `size-8` (32dp) isn't on the shared
 * `spacing_*` scale — hardcoded, same reasoning as `KinetixFab`'s
 * off-scale sizes. The chevron buttons are plain "‹"/"›" glyphs, same "no
 * icon library" gap noted for `KinetixBreadcrumbSeparator`.
 */
enum class KinetixCarouselOrientation { Horizontal, Vertical }

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun KinetixCarousel(
    pagerState: PagerState,
    modifier: Modifier = Modifier,
    orientation: KinetixCarouselOrientation = KinetixCarouselOrientation.Horizontal,
    content: @Composable (page: Int) -> Unit,
) {
    when (orientation) {
        KinetixCarouselOrientation.Horizontal -> HorizontalPager(state = pagerState, modifier = modifier) { page -> content(page) }
        KinetixCarouselOrientation.Vertical -> VerticalPager(state = pagerState, modifier = modifier) { page -> content(page) }
    }
}

@Composable
fun KinetixCarouselPrevious(
    pagerState: PagerState,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    KinetixButton(
        onClick = { scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) } },
        modifier = modifier.size(32.dp), // size-8, not on the shared scale
        variant = KinetixButtonVariant.Outline,
        corners = KinetixCorners.Pill,
        size = KinetixButtonSize.Icon,
        enabled = pagerState.currentPage > 0,
    ) {
        Text("‹")
    }
}

@Composable
fun KinetixCarouselNext(
    pagerState: PagerState,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    KinetixButton(
        onClick = { scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) } },
        modifier = modifier.size(32.dp), // size-8, not on the shared scale
        variant = KinetixButtonVariant.Outline,
        corners = KinetixCorners.Pill,
        size = KinetixButtonSize.Icon,
        enabled = pagerState.currentPage < pagerState.pageCount - 1,
    ) {
        Text("›")
    }
}

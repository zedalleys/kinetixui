package com.kinetixui.ui

import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * KinetixVirtualList — mirrors
 * `packages/ui/src/components/virtual-list.tsx`: a windowed-rendering
 * primitive. Unlike [KinetixTour], this maps cleanly onto a native
 * mechanism — `LazyColumn` already only composes the rows visible in the
 * viewport (plus a small buffer), the same "reuse the platform machinery"
 * call [KinetixSlider]/[KinetixSelect] make. No fixed-row-height
 * restriction here either: `LazyColumn` measures each row itself, so the
 * web version's fixed-height limitation doesn't carry over.
 */
@Composable
fun <T> KinetixVirtualList(
    data: List<T>,
    modifier: Modifier = Modifier,
    key: ((T) -> Any)? = null,
    itemContent: @Composable (T) -> Unit,
) {
    LazyColumn(modifier = modifier) {
        items(items = data, key = key) { item -> itemContent(item) }
    }
}

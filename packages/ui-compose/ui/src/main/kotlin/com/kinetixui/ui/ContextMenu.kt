package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp

/**
 * KinetixContextMenu — mirrors `packages/ui/src/components/context-menu.tsx`.
 * Same item family as [KinetixDropdownMenu] (`KinetixDropdownMenuItem`/
 * `CheckboxItem`/`RadioItem`/`Label`/`Separator` are reused directly — the
 * two React components share the exact same item styling in the source).
 * The one real departure from every other overlay in this package:
 * visibility here is **not** caller-owned — a long-press on `content` is
 * what a context menu *is*, so the press-detection and open-state live
 * inside this composable rather than threading a `visible` param through
 * to a gesture detector the caller would just have to wire up anyway.
 * Opens anchored to the `content` container (Material3 `DropdownMenu`'s
 * default anchor corner), not to the exact long-press point — capturing
 * the precise touch offset would need custom `PopupPositionProvider` math
 * this pass didn't take on; a real, deliberate simplification.
 * `ContextMenuSub` (nested submenus) isn't ported, same gap as
 * [KinetixDropdownMenu]'s.
 */
@Composable
fun KinetixContextMenu(
    modifier: Modifier = Modifier,
    menuContent: @Composable ColumnScope.() -> Unit,
    content: @Composable () -> Unit,
) {
    var expanded by remember { mutableStateOf(false) }
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))

    Box(
        modifier = modifier.pointerInput(Unit) {
            detectTapGestures(onLongPress = { expanded = true })
        },
    ) {
        content()
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false },
            modifier = Modifier
                .widthIn(min = 128.dp) // min-w-32, not on the shared scale
                .clip(shape)
                .background(colors.popover, shape),
            content = menuContent,
        )
    }
}

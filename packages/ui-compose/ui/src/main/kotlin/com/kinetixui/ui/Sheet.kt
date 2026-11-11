package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.yield
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * KinetixSheet family — mirrors `packages/ui/src/components/sheet.tsx`.
 * The React version's `side` (top/bottom/left/right, via `sheetVariants`)
 * collapses to **bottom only** here: Material3's `ModalBottomSheet`
 * (`@ExperimentalMaterial3Api` at this project's Material3 version —
 * stable behavior, just an opt-in) is the idiomatic Android pattern, and
 * unlike [KinetixDialog] there's no equally-idiomatic single primitive for
 * a left/right/top edge-anchored panel — a real, deliberately deferred
 * gap rather than a hand-rolled `Dialog`-based slide-in. `KinetixSheetHeader`/
 * `Footer`/`Title`/`Description` mirror [KinetixDialog]'s equivalents.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun KinetixSheet(
    visible: Boolean,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    val reduceMotion = KinetixDisclosureMotion.rememberReduceMotion()
    val sheetState = rememberModalBottomSheetState()
    var retained by remember { mutableStateOf(false) }
    if (!visible && !retained) return

    LaunchedEffect(visible, reduceMotion) {
        if (visible) retained = true
        // Wait for the native sheet's anchors and initial show effect before
        // issuing our controlled target. A close during first layout must win.
        snapshotFlow { sheetState.hasExpandedState }.first { it }
        yield()
        if (visible) {
            KinetixSheetMotion.show(sheetState, reduceMotion)
        } else {
            KinetixSheetMotion.hide(sheetState, reduceMotion)
            retained = false
        }
    }
    val colors = KinetixColorScheme.current
    val radius = dimensionResource(R.dimen.radius_xl)
    val shape = RoundedCornerShape(topStart = radius, topEnd = radius)

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState,
        modifier = modifier,
        containerColor = colors.background,
        scrimColor = colors.scrim,
        contentColor = colors.foreground,
        shape = shape,
    ) {
        Column(
            modifier = Modifier.padding(dimensionResource(R.dimen.spacing_6)),
            verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_4)),
        ) {
            content()
        }
    }
}

@Composable
fun KinetixSheetHeader(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2))) { // space-y-2
        content()
    }
}

@Composable
fun KinetixSheetFooter(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Row(
        modifier = modifier,
        horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2), Alignment.End),
    ) {
        content()
    }
}

@Composable
fun KinetixSheetTitle(
    text: String,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier,
        color = colors.foreground,
        fontWeight = FontWeight.SemiBold,
        fontSize = dimensionResource(R.dimen.font_size_title_dialog).value.sp, // text-lg (18dp)
    )
}

@Composable
fun KinetixSheetDescription(
    text: String,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier,
        color = colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
        lineHeight = dimensionResource(R.dimen.line_height_body_md).value.sp,
    )
}

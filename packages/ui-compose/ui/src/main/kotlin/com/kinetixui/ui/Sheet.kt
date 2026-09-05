package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
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
    if (!visible) return
    val colors = KinetixColorScheme.current
    val radius = dimensionResource(R.dimen.radius_xl)
    val shape = RoundedCornerShape(topStart = radius, topEnd = radius)

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        modifier = modifier,
        containerColor = colors.background,
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

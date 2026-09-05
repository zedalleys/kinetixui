package com.kinetixui.ui

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixCommandDialog family — mirrors
 * `packages/ui/src/components/command.tsx` (a themed wrapper over the
 * `cmdk` library, itself shown inside `Dialog`/`DialogContent`).
 * `KinetixCommandDialog` composes [KinetixDialog] directly (matching the
 * source's own `CommandDialog`). `cmdk`'s actual value-add — fuzzy-scored
 * client-side filtering as you type — isn't reimplemented: the caller
 * filters its own `items` against `query` (a plain `items.filter {
 * it.contains(query, ignoreCase = true) }` at the call site) and this
 * package only renders whatever list results, a real and deliberately
 * simplified scope, not a silent one. Items reuse Material3's
 * `DropdownMenuItem` directly (it's a standalone styled row, not exclusive
 * to `DropdownMenu`'s popup), same technique [KinetixSelectItem] uses.
 * `KinetixCommandSeparator` reuses [KinetixSeparator] outright.
 */
@Composable
fun KinetixCommandDialog(
    visible: Boolean,
    onDismissRequest: () -> Unit,
    query: String,
    onQueryChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    placeholder: String = "Type a command or search…",
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    val borderWidthPx = with(LocalDensity.current) { dimensionResource(R.dimen.border_width_default).toPx() }

    KinetixDialog(visible = visible, onDismissRequest = onDismissRequest, modifier = modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .drawBehind {
                    drawLine(
                        color = colors.border,
                        start = Offset(0f, size.height),
                        end = Offset(size.width, size.height),
                        strokeWidth = borderWidthPx,
                    )
                }
                .padding(bottom = dimensionResource(R.dimen.spacing_3)),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            BasicTextField(
                value = query,
                onValueChange = onQueryChange,
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                textStyle = TextStyle(
                    color = colors.foreground,
                    fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
                ),
                cursorBrush = SolidColor(colors.primary),
                interactionSource = remember { MutableInteractionSource() },
                decorationBox = { inner ->
                    Box {
                        if (query.isEmpty()) {
                            Text(
                                text = placeholder,
                                color = colors.mutedForeground,
                                fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
                            )
                        }
                        inner()
                    }
                },
            )
        }
        Box(modifier = Modifier.heightIn(max = 300.dp)) { // max-h-[300px], not on the shared scale
            KinetixScrollArea {
                Column {
                    content()
                }
            }
        }
    }
}

@Composable
fun KinetixCommandEmpty(
    text: String = "No results found.",
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = dimensionResource(R.dimen.spacing_6)),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = text, color = colors.foreground, fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp)
    }
}

@Composable
fun KinetixCommandGroup(
    modifier: Modifier = Modifier,
    heading: String? = null,
    content: @Composable () -> Unit,
) {
    val colors = KinetixColorScheme.current
    Column(modifier = modifier.padding(dimensionResource(R.dimen.spacing_1))) {
        if (heading != null) {
            Text(
                text = heading,
                color = colors.mutedForeground,
                fontWeight = FontWeight.Medium,
                fontSize = dimensionResource(R.dimen.font_size_label_sm).value.sp,
                modifier = Modifier.padding(
                    horizontal = dimensionResource(R.dimen.spacing_2),
                    vertical = dimensionResource(R.dimen.spacing_1),
                ),
            )
        }
        content()
    }
}

@Composable
fun KinetixCommandItem(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
) {
    val colors = KinetixColorScheme.current
    DropdownMenuItem(
        text = {
            Text(
                text = text,
                color = colors.foreground,
                fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
            )
        },
        onClick = onClick,
        modifier = modifier,
        enabled = enabled,
    )
}

@Composable
fun KinetixCommandShortcut(
    text: String,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier,
        color = colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
    )
}

@Composable
fun KinetixCommandSeparator(modifier: Modifier = Modifier) {
    KinetixSeparator(modifier = modifier.padding(vertical = dimensionResource(R.dimen.spacing_1)))
}

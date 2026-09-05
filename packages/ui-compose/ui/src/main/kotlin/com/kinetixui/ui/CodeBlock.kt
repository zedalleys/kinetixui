package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * KinetixCodeBlock — mirrors `packages/ui/src/components/code-block.tsx`:
 * a code display with a copy button and, for more than one file, a tab
 * strip. Presentational only, same as the source — bring your own syntax
 * highlighting by passing pre-highlighted text if needed; this just
 * renders `code`/`files[].code` as plain monospace text. Copy uses
 * Compose's own `LocalClipboardManager` — no new dependency, same "the
 * platform already has this" reuse as `KinetixToaster` wrapping
 * `SnackbarHostState`. Horizontal overflow wraps [KinetixScrollArea],
 * genuine reuse rather than a new scroll implementation. The
 * copy-button glyph is the plain text "Copy"/"Copied" swap, same
 * convention `KinetixPasswordInput`'s show/hide toggle uses.
 */
data class KinetixCodeBlockFile(val name: String, val code: String)

@Composable
fun KinetixCodeBlock(
    code: String,
    modifier: Modifier = Modifier,
    filename: String? = null,
    files: List<KinetixCodeBlockFile> = emptyList(),
    hideCopy: Boolean = false,
) {
    val colors = KinetixColorScheme.current
    val tabs = files.ifEmpty { listOf(KinetixCodeBlockFile(name = filename.orEmpty(), code = code)) }
    var active by remember { mutableIntStateOf(0) }
    var copied by remember { mutableStateOf(false) }
    val current = tabs.getOrElse(active) { tabs[0] }
    val hasHeader = tabs.size > 1 || current.name.isNotEmpty()
    val clipboard = LocalClipboardManager.current
    val scope = rememberCoroutineScope()
    val borderWidthPx = with(LocalDensity.current) { dimensionResource(R.dimen.border_width_default).toPx() }
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))

    fun copy() {
        clipboard.setText(AnnotatedString(current.code))
        copied = true
        scope.launch {
            delay(1500)
            copied = false
        }
    }

    Column(
        modifier = modifier
            .clip(shape)
            .background(colors.muted, shape)
            .border(dimensionResource(R.dimen.border_width_default), colors.border, shape),
    ) {
        if (hasHeader) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(colors.background)
                    .drawBehind {
                        drawLine(
                            color = colors.border,
                            start = Offset(0f, size.height),
                            end = Offset(size.width, size.height),
                            strokeWidth = borderWidthPx,
                        )
                    }
                    .padding(horizontal = dimensionResource(R.dimen.spacing_2)),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Row {
                    tabs.forEachIndexed { i, tab ->
                        val selected = i == active
                        Text(
                            text = tab.name.ifEmpty { "code" },
                            color = if (selected) colors.foreground else colors.mutedForeground,
                            fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                            modifier = Modifier
                                .clickable { active = i }
                                .padding(
                                    horizontal = dimensionResource(R.dimen.spacing_3),
                                    vertical = dimensionResource(R.dimen.spacing_2),
                                ),
                        )
                    }
                }
                if (!hideCopy) {
                    Text(
                        text = if (copied) "Copied" else "Copy",
                        color = colors.mutedForeground,
                        fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                        modifier = Modifier.clickable(onClick = ::copy),
                    )
                }
            }
        }
        Box {
            KinetixScrollArea(orientation = KinetixScrollAreaOrientation.Horizontal) {
                Text(
                    text = current.code,
                    modifier = Modifier.padding(dimensionResource(R.dimen.spacing_4)),
                    color = colors.foreground,
                    fontFamily = FontFamily.Monospace,
                    fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                )
            }
            if (!hasHeader && !hideCopy) {
                Text(
                    text = if (copied) "Copied" else "Copy",
                    color = colors.mutedForeground,
                    fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(dimensionResource(R.dimen.spacing_2))
                        .clickable(onClick = ::copy),
                )
            }
        }
    }
}

package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.min

/**
 * KinetixFileUpload family — mirrors
 * `packages/ui/src/components/file-upload.tsx`. Presentational only, same
 * as the source: it reports "browse" intent via `onBrowse` and renders
 * whatever `files` list you hand back, each with its own status. The
 * source's drag-and-drop is web-only — Android has no page-level file DnD,
 * so the drop zone here is just a big tap target that calls `onBrowse`
 * (wire it to an `ActivityResultContracts.GetContent` launcher yourself).
 * The dashed border is drawn with a `PathEffect.dashPathEffect` `Stroke`
 * (Compose has no dashed `BorderStroke`), same "draw it yourself" approach
 * `KinetixInputGroupButton`'s single-side border uses. Status/remove
 * glyphs are plain text — no icon library wired in.
 */
enum class KinetixUploadStatus { Loading, Uploaded, Error }

data class KinetixUploadFile(
    val id: String,
    val name: String,
    val size: Long? = null,
    val status: KinetixUploadStatus = KinetixUploadStatus.Uploaded,
    val progress: Float? = null,
    val error: String? = null,
)

/** "1.4 MB" / "820 B" — matches the source's `formatBytes`. */
fun formatBytes(bytes: Long?): String {
    if (bytes == null || bytes <= 0L) return ""
    val units = listOf("B", "KB", "MB", "GB")
    var value = bytes.toDouble()
    var i = 0
    while (value >= 1024 && i < units.lastIndex) {
        value /= 1024
        i++
    }
    val decimals = if (value < 10 && i > 0) 1 else 0
    return "%.${decimals}f %s".format(value, units[i])
}

@Composable
fun KinetixFileUpload(
    onBrowse: () -> Unit,
    modifier: Modifier = Modifier,
    multiple: Boolean = false,
    helperText: String? = null,
    buttonLabel: String = "Browse files",
    enabled: Boolean = true,
    files: List<KinetixUploadFile> = emptyList(),
    onRemove: ((String) -> Unit)? = null,
    onRetry: ((String) -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))
    val strokeWidthPx = with(LocalDensity.current) { dimensionResource(R.dimen.border_width_default).toPx() }

    Column(modifier = modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_3))) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(shape)
                .drawBehind {
                    drawRoundRect(
                        color = colors.border,
                        cornerRadius = CornerRadius(size.minDimension / 8f),
                        style = Stroke(
                            width = strokeWidthPx,
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 8f)),
                        ),
                    )
                }
                .clickable(enabled = enabled, onClick = onBrowse)
                .padding(dimensionResource(R.dimen.spacing_6)),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2)),
        ) {
            Text(text = "⬆", color = colors.mutedForeground, fontSize = dimensionResource(R.dimen.font_size_headline_sm).value.sp)
            Text(
                text = "Tap to add ${if (multiple) "files" else "a file"}",
                color = colors.mutedForeground,
                fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
            )
            KinetixButton(
                onClick = onBrowse,
                variant = KinetixButtonVariant.Outline,
                size = KinetixButtonSize.Sm,
                enabled = enabled,
            ) {
                Text(buttonLabel)
            }
            if (helperText != null) {
                Text(
                    text = helperText,
                    color = colors.mutedForeground,
                    fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                )
            }
        }

        files.forEach { file ->
            KinetixFileUploadItem(file = file, onRemove = onRemove, onRetry = onRetry)
        }
    }
}

@Composable
fun KinetixFileUploadItem(
    file: KinetixUploadFile,
    modifier: Modifier = Modifier,
    onRemove: ((String) -> Unit)? = null,
    onRetry: ((String) -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    val isError = file.status == KinetixUploadStatus.Error
    val shape = RoundedCornerShape(dimensionResource(R.dimen.radius_md))
    val borderColor = if (isError) colors.destructive else colors.border

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .border(dimensionResource(R.dimen.border_width_default), borderColor, shape)
            .padding(10.dp), // p-2.5, off the shared spacing scale
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        val glyph = when (file.status) {
            KinetixUploadStatus.Loading -> "…"
            KinetixUploadStatus.Error -> "!"
            KinetixUploadStatus.Uploaded -> "•"
        }
        Text(
            text = glyph,
            color = if (isError) colors.destructive else colors.mutedForeground,
            fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = file.name,
                color = colors.foreground,
                fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                maxLines = 1,
            )
            Text(
                text = if (isError && file.error != null) file.error else formatBytes(file.size),
                color = if (isError) colors.destructive else colors.mutedForeground,
                fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                maxLines = 1,
            )
            if (file.status == KinetixUploadStatus.Loading && file.progress != null) {
                Box(
                    modifier = Modifier
                        .padding(top = dimensionResource(R.dimen.spacing_1))
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(RoundedCornerShape(dimensionResource(R.dimen.radius_full)))
                        .background(colors.muted),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(min(1f, file.progress / 100f).coerceAtLeast(0f))
                            .height(4.dp)
                            .background(colors.primary),
                    )
                }
            }
        }
        if (isError && onRetry != null) {
            Text(
                text = "Retry",
                color = colors.primary,
                fontWeight = FontWeight.Medium,
                fontSize = dimensionResource(R.dimen.font_size_label_md).value.sp,
                modifier = Modifier.clickable { onRetry(file.id) },
            )
        }
        if (onRemove != null) {
            Text(
                text = "×",
                color = colors.mutedForeground,
                modifier = Modifier.clickable { onRemove(file.id) },
            )
        }
    }
}

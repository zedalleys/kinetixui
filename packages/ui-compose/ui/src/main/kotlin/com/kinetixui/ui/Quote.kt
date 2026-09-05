package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * KinetixQuote — mirrors `packages/ui/src/components/quote.tsx`: a
 * blockquote with an optional attributed author (name, title, avatar
 * slot). Curly quotes are added around the text here the same way the
 * React source adds them around `children` — not the caller's job.
 */
@Composable
fun KinetixQuote(
    text: String,
    modifier: Modifier = Modifier,
    author: String? = null,
    authorTitle: String? = null,
    avatar: (@Composable () -> Unit)? = null,
) {
    val colors = KinetixColorScheme.current
    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_4))) {
        Text(
            text = "“$text”",
            color = colors.foreground,
            fontWeight = FontWeight.Medium,
            fontSize = dimensionResource(R.dimen.font_size_title_md).value.sp,
            lineHeight = dimensionResource(R.dimen.line_height_title_md).value.sp,
        )
        if (author != null || authorTitle != null) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_3)),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                avatar?.invoke()
                Column {
                    if (author != null) {
                        Text(
                            text = author,
                            color = colors.foreground,
                            fontWeight = FontWeight.Medium,
                            fontSize = dimensionResource(R.dimen.font_size_body_md).value.sp,
                            lineHeight = dimensionResource(R.dimen.line_height_body_md).value.sp,
                        )
                    }
                    if (authorTitle != null) {
                        Text(
                            text = authorTitle,
                            color = colors.mutedForeground,
                            fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                            lineHeight = dimensionResource(R.dimen.line_height_body_sm).value.sp,
                        )
                    }
                }
            }
        }
    }
}

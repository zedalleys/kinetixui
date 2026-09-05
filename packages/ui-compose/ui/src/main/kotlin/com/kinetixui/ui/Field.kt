package com.kinetixui.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixField family — mirrors `packages/ui/src/components/field.tsx`'s
 * label + control + description + feedback composition. The React version
 * shares an `invalid` flag (and wires `id`/`aria-describedby`) through
 * React Context; here a `compositionLocalOf` plays the same role for
 * `invalid` — [KinetixFieldLabel] and [KinetixFieldMessage] read it rather
 * than taking it as a parameter, same call as the source's `useField()`.
 * The `id`/`aria-describedby` wiring itself isn't ported: Android's
 * accessibility model doesn't use string-ID cross-references the way ARIA
 * does, so there's nothing equivalent to wire up. `gap-1.5` (6dp) isn't on
 * the shared `spacing_*` scale — hardcoded, same reasoning as `KinetixCard`
 * header's gap. `FieldControl`'s `Slot`-based prop injection has no
 * Compose equivalent (Compose has no generic "clone this child with extra
 * props") — callers just place their own control (`KinetixInput`, etc.)
 * directly inside [KinetixField]'s `content` slot.
 */
private val LocalFieldInvalid = compositionLocalOf { false }

@Composable
fun KinetixField(
    modifier: Modifier = Modifier,
    invalid: Boolean = false,
    content: @Composable () -> Unit,
) {
    CompositionLocalProvider(LocalFieldInvalid provides invalid) {
        Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            content()
        }
    }
}

@Composable
fun KinetixFieldLabel(
    text: String,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    val invalid = LocalFieldInvalid.current
    KinetixLabel(text = text, modifier = modifier, color = if (invalid) colors.destructive else colors.foreground)
}

@Composable
fun KinetixFieldDescription(
    text: String,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        modifier = modifier,
        color = colors.mutedForeground,
        fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
        lineHeight = dimensionResource(R.dimen.line_height_body_sm).value.sp,
    )
}

enum class KinetixFieldMessageIntent { Error, Warning, Success, Info }

/**
 * The leading intent icon (`CircleAlert`/`TriangleAlert`/`CircleCheck`/`Info`)
 * isn't ported — same "no icon library wired in" gap as [KinetixTag] /
 * [KinetixCheckbox] / [KinetixAlert].
 */
@Composable
fun KinetixFieldMessage(
    text: String,
    modifier: Modifier = Modifier,
    intent: KinetixFieldMessageIntent = KinetixFieldMessageIntent.Error,
) {
    val colors = KinetixColorScheme.current
    val color = when (intent) {
        KinetixFieldMessageIntent.Error -> colors.destructive
        KinetixFieldMessageIntent.Warning -> colors.warning
        KinetixFieldMessageIntent.Success -> colors.success
        KinetixFieldMessageIntent.Info -> colors.info
    }
    Text(
        text = text,
        modifier = modifier,
        color = color,
        fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
        lineHeight = dimensionResource(R.dimen.line_height_body_sm).value.sp,
    )
}

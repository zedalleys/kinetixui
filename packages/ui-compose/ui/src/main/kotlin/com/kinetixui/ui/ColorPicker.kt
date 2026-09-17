package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// -- color math (kept identical, formula-for-formula, across all four platforms) --

fun kinetixHexToRgba(hex: String): FloatArray {
    val h = hex.removePrefix("#")
    return if (h.length == 8) {
        val n = h.toLong(16)
        floatArrayOf(
            ((n shr 24) and 0xFF).toFloat(),
            ((n shr 16) and 0xFF).toFloat(),
            ((n shr 8) and 0xFF).toFloat(),
            (n and 0xFF).toFloat() / 255f,
        )
    } else {
        val full = if (h.length == 3) h.map { "$it$it" }.joinToString("") else h
        val n = full.toLong(16)
        floatArrayOf(((n shr 16) and 0xFF).toFloat(), ((n shr 8) and 0xFF).toFloat(), (n and 0xFF).toFloat(), 1f)
    }
}

fun kinetixRgbaToHex(r: Float, g: Float, b: Float, a: Float, includeAlpha: Boolean): String {
    fun ch(v: Float) = v.toInt().coerceIn(0, 255).toString(16).padStart(2, '0')
    val base = "#${ch(r)}${ch(g)}${ch(b)}"
    return if (includeAlpha) "$base${ch(a * 255f)}" else base
}

fun kinetixHsvToRgb(h: Float, s: Float, v: Float): FloatArray {
    val sN = s / 100f
    val vN = v / 100f
    val c = vN * sN
    val hh = h / 60f
    val x = c * (1 - kotlin.math.abs(hh % 2 - 1))
    var r = 0f
    var g = 0f
    var b = 0f
    when {
        hh < 1 -> { r = c; g = x }
        hh < 2 -> { r = x; g = c }
        hh < 3 -> { g = c; b = x }
        hh < 4 -> { g = x; b = c }
        hh < 5 -> { r = x; b = c }
        else -> { r = c; b = x }
    }
    val m = vN - c
    return floatArrayOf((r + m) * 255f, (g + m) * 255f, (b + m) * 255f)
}

fun kinetixRgbToHsv(r: Float, g: Float, b: Float): FloatArray {
    val rN = r / 255f
    val gN = g / 255f
    val bN = b / 255f
    val max = maxOf(rN, gN, bN)
    val min = minOf(rN, gN, bN)
    val d = max - min
    var h = 0f
    if (d != 0f) {
        h = when (max) {
            rN -> (gN - bN) / d
            gN -> (bN - rN) / d + 2f
            else -> (rN - gN) / d + 4f
        }
        h *= 60f
        if (h < 0f) h += 360f
    }
    val s = if (max == 0f) 0f else d / max
    return floatArrayOf(h, s * 100f, max * 100f)
}

/**
 * KinetixColorPicker — mirrors `packages/ui/src/components/color-picker.tsx`:
 * a saturation/value square, hue and (optional) alpha rails, a hex field,
 * and swatches. Internal HSV state (not derived from `value` on every
 * recomposition) for the same reason as the web version: saturation 0 or
 * value 0 erase hue information, and re-deriving it every time would make
 * the hue thumb jump to red whenever a drag crosses either edge. `value`
 * only resyncs the internal state when it changes from something other
 * than this composable's own last emission.
 *
 * The square and rails are hand-rolled with `pointerInput`/
 * `detectDragGestures` rather than reused from `KinetixSlider` — a 2D
 * gesture has no single-axis primitive to build on, and the rails need
 * per-instance gradient track painting `KinetixSlider`'s fixed styling
 * doesn't expose. No eyedropper: there's no OS-level "sample a pixel
 * anywhere on screen" API exposed to a normal (non-privileged) Android
 * app, unlike the web's `EyeDropper` — a web-only enhancement, same as
 * `KinetixTour`.
 */
@Composable
fun KinetixColorPicker(
    value: String,
    onChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    alpha: Boolean = false,
    swatches: List<String> = emptyList(),
) {
    val colors = KinetixColorScheme.current
    var hsv by remember {
        val rgba = kinetixHexToRgba(value)
        mutableStateOf(kinetixRgbToHsv(rgba[0], rgba[1], rgba[2]))
    }
    var alphaValue by remember { mutableStateOf(kinetixHexToRgba(value)[3]) }
    var lastEmitted by remember { mutableStateOf(value) }

    LaunchedEffect(value) {
        if (value != lastEmitted) {
            val rgba = kinetixHexToRgba(value)
            hsv = kinetixRgbToHsv(rgba[0], rgba[1], rgba[2])
            alphaValue = rgba[3]
            lastEmitted = value
        }
    }

    val (h, s, v) = hsv

    fun commit(nh: Float, ns: Float, nv: Float, na: Float) {
        hsv = floatArrayOf(nh, ns, nv)
        alphaValue = na
        val rgb = kinetixHsvToRgb(nh, ns, nv)
        val hex = kinetixRgbaToHex(rgb[0], rgb[1], rgb[2], na, alpha)
        lastEmitted = hex
        onChange(hex)
    }

    Column(modifier = modifier, verticalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_3))) {
        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .height(160.dp)
                .clip(RoundedCornerShape(dimensionResource(R.dimen.radius_md)))
                .background(Color.hsv(h, 1f, 1f))
                .pointerInput(h) {
                    detectDragGestures { change, _ ->
                        change.consume()
                        commit(
                            h,
                            (change.position.x / size.width * 100f).coerceIn(0f, 100f),
                            (100f - change.position.y / size.height * 100f).coerceIn(0f, 100f),
                            alphaValue,
                        )
                    }
                }
                .pointerInput(h) {
                    detectTapGestures { offset ->
                        commit(
                            h,
                            (offset.x / size.width * 100f).coerceIn(0f, 100f),
                            (100f - offset.y / size.height * 100f).coerceIn(0f, 100f),
                            alphaValue,
                        )
                    }
                },
        ) {
            Box(modifier = Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(Color.White, Color.Transparent))))
            Box(modifier = Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black))))
            Box(
                modifier = Modifier
                    .offset(x = maxWidth * (s / 100f) - 7.dp, y = maxHeight * (1f - v / 100f) - 7.dp)
                    .size(14.dp)
                    .border(2.dp, Color.White, CircleShape)
                    .background(Color.hsv(h, s / 100f, v / 100f), CircleShape),
            )
        }

        GradientRail(
            fraction = h / 360f,
            trackBrush = Brush.horizontalGradient((0..6).map { Color.hsv(it * 60f, 1f, 1f) }),
            onChange = { f -> commit(f * 360f, s, v, alphaValue) },
        )

        if (alpha) {
            GradientRail(
                fraction = alphaValue,
                trackBrush = SolidColor(Color(0xFFE5E5E5)),
                overlayBrush = Brush.horizontalGradient(listOf(Color.Transparent, Color.hsv(h, s / 100f, v / 100f))),
                onChange = { f -> commit(h, s, v, f) },
            )
        }

        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_2))) {
            Box(
                modifier = Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(dimensionResource(R.dimen.radius_sm)))
                    .border(dimensionResource(R.dimen.border_width_default), colors.border, RoundedCornerShape(dimensionResource(R.dimen.radius_sm)))
                    .background(Color.hsv(h, s / 100f, v / 100f, alphaValue)),
            )
            var hexDraft by remember(value) { mutableStateOf(value.removePrefix("#").uppercase()) }
            BasicTextField(
                value = hexDraft,
                onValueChange = { hexDraft = it.filter { c -> c.isDigit() || c in 'a'..'f' || c in 'A'..'F' }.take(if (alpha) 8 else 6) },
                textStyle = TextStyle(color = colors.foreground, fontSize = 12.sp),
                singleLine = true,
                cursorBrush = SolidColor(colors.primary),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                keyboardActions = KeyboardActions(onDone = {
                    val pattern = if (alpha) Regex("^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$") else Regex("^[0-9a-fA-F]{6}$")
                    if (pattern.matches(hexDraft)) onChange("#${hexDraft.lowercase()}")
                }),
                modifier = Modifier.weight(1f),
            )
        }

        if (swatches.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(dimensionResource(R.dimen.spacing_1))) {
                swatches.forEach { sw ->
                    val rgba = kinetixHexToRgba(sw)
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .clip(RoundedCornerShape(dimensionResource(R.dimen.radius_sm)))
                            .background(Color(rgba[0] / 255f, rgba[1] / 255f, rgba[2] / 255f))
                            .clickable {
                                val newHsv = kinetixRgbToHsv(rgba[0], rgba[1], rgba[2])
                                commit(newHsv[0], newHsv[1], newHsv[2], alphaValue)
                            },
                    )
                }
            }
        }
    }
}

@Composable
private fun GradientRail(
    fraction: Float,
    trackBrush: Brush,
    onChange: (Float) -> Unit,
    overlayBrush: Brush? = null,
) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .height(20.dp)
            .pointerInput(Unit) {
                detectDragGestures { change, _ ->
                    change.consume()
                    onChange((change.position.x / size.width).coerceIn(0f, 1f))
                }
            }
            .pointerInput(Unit) {
                detectTapGestures { offset ->
                    onChange((offset.x / size.width).coerceIn(0f, 1f))
                }
            },
        contentAlignment = Alignment.CenterStart,
    ) {
        Box(modifier = Modifier.fillMaxWidth().height(12.dp).clip(RoundedCornerShape(50)).background(trackBrush))
        if (overlayBrush != null) {
            Box(modifier = Modifier.fillMaxWidth().height(12.dp).clip(RoundedCornerShape(50)).background(overlayBrush))
        }
        Box(
            modifier = Modifier
                .offset(x = maxWidth * fraction - 7.dp)
                .size(14.dp)
                .border(2.dp, Color.White, CircleShape)
                .background(Color.White, CircleShape),
        )
    }
}

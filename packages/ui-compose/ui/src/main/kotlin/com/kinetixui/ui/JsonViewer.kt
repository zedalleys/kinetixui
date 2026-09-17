package com.kinetixui.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixJsonViewer — mirrors `packages/ui/src/components/json-viewer.tsx`:
 * a collapsible, syntax-colored tree over arbitrary JSON-shaped data.
 * Accepts a plain `Map<String, Any?>` / `List<Any?>` / primitive tree — the
 * ad-hoc shape most JSON deserializes into without pulling in a specific
 * serialization library — rather than a sealed `JsonElement` type. Unlike
 * [KinetixDataGrid], a recursive expand/collapse tree needs no gesture or
 * layout primitive native platforms lack, so this ships with the same
 * feature set as web.
 */
@Composable
fun KinetixJsonViewer(
    value: Any?,
    modifier: Modifier = Modifier,
    expandDepth: Int = 1,
) {
    Column(modifier = modifier) {
        JsonNode(name = null, value = value, depth = 0, expandDepth = expandDepth, isLast = true)
    }
}

@Composable
private fun JsonNode(name: String?, value: Any?, depth: Int, expandDepth: Int, isLast: Boolean) {
    val colors = KinetixColorScheme.current
    val isContainer = value is Map<*, *> || value is List<*>

    if (!isContainer) {
        Row(modifier = Modifier.padding(start = (depth * 16).dp)) {
            if (name != null) {
                Text("\"$name\": ", color = colors.mutedForeground, fontSize = 12.sp)
            }
            JsonPrimitiveText(value)
            if (!isLast) Text(",", color = colors.mutedForeground, fontSize = 12.sp)
        }
        return
    }

    val isArrayVal = value is List<*>
    val entries: List<Pair<String, Any?>> = when (value) {
        is List<*> -> value.mapIndexed { i, v -> i.toString() to v }
        is Map<*, *> -> value.entries.map { it.key.toString() to it.value }
        else -> emptyList()
    }
    val openBracket = if (isArrayVal) "[" else "{"
    val closeBracket = if (isArrayVal) "]" else "}"

    if (entries.isEmpty()) {
        Row(modifier = Modifier.padding(start = (depth * 16 + 20).dp)) {
            if (name != null) Text("\"$name\": ", color = colors.mutedForeground, fontSize = 12.sp)
            Text("$openBracket$closeBracket", fontSize = 12.sp)
            if (!isLast) Text(",", color = colors.mutedForeground, fontSize = 12.sp)
        }
        return
    }

    var expanded by remember { mutableStateOf(depth < expandDepth) }

    Column {
        Row(
            modifier = Modifier
                .padding(start = (depth * 16).dp)
                .clickable { expanded = !expanded },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "▸",
                fontSize = 10.sp,
                color = colors.mutedForeground,
                modifier = Modifier
                    .padding(end = 4.dp)
                    .rotate(if (expanded) 90f else 0f),
            )
            if (name != null) Text("\"$name\": ", color = colors.mutedForeground, fontSize = 12.sp)
            Text(openBracket, fontSize = 12.sp)
            if (!expanded) {
                Text(
                    " ${entries.size} ${if (isArrayVal) "item" else "key"}${if (entries.size == 1) "" else "s"} ",
                    color = colors.mutedForeground,
                    fontSize = 12.sp,
                )
                Text(closeBracket, fontSize = 12.sp)
                if (!isLast) Text(",", color = colors.mutedForeground, fontSize = 12.sp)
            }
        }
        if (expanded) {
            entries.forEachIndexed { i, (key, v) ->
                JsonNode(
                    name = if (isArrayVal) null else key,
                    value = v,
                    depth = depth + 1,
                    expandDepth = expandDepth,
                    isLast = i == entries.lastIndex,
                )
            }
            Row(modifier = Modifier.padding(start = (depth * 16).dp)) {
                Text(closeBracket, fontSize = 12.sp)
                if (!isLast) Text(",", color = colors.mutedForeground, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun JsonPrimitiveText(value: Any?) {
    val colors = KinetixColorScheme.current
    when (value) {
        null -> Text("null", color = colors.mutedForeground, fontSize = 12.sp, fontStyle = FontStyle.Italic)
        is String -> Text("\"$value\"", color = colors.success, fontSize = 12.sp)
        is Number -> Text(value.toString(), color = colors.info, fontSize = 12.sp)
        is Boolean -> Text(value.toString(), color = colors.warning, fontSize = 12.sp)
        else -> Text(value.toString(), fontSize = 12.sp)
    }
}

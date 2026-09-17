package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

data class KinetixDiffLine(val type: Type, val oldLine: Int?, val newLine: Int?, val text: String) {
    enum class Type { EQUAL, ADD, REMOVE }
}

enum class KinetixDiffMode { Unified, Split }

/**
 * Line-based LCS diff — the same longest-common-subsequence backtrack
 * `git diff`'s line mode is built on, hand-rolled rather than pulled from
 * a package so it behaves identically to `computeLineDiff` in
 * `packages/ui/src/components/diff-viewer.tsx`. O(n·m) time and space —
 * fine for a config file or a token snapshot, not multi-thousand-line
 * files.
 */
fun kinetixComputeLineDiff(oldText: String, newText: String): List<KinetixDiffLine> {
    val oldLines = oldText.split("\n")
    val newLines = newText.split("\n")
    val n = oldLines.size
    val m = newLines.size
    val dp = Array(n + 1) { IntArray(m + 1) }
    for (i in n - 1 downTo 0) {
        for (j in m - 1 downTo 0) {
            dp[i][j] = if (oldLines[i] == newLines[j]) dp[i + 1][j + 1] + 1 else maxOf(dp[i + 1][j], dp[i][j + 1])
        }
    }

    val ops = mutableListOf<KinetixDiffLine>()
    var i = 0
    var j = 0
    while (i < n && j < m) {
        when {
            oldLines[i] == newLines[j] -> {
                ops.add(KinetixDiffLine(KinetixDiffLine.Type.EQUAL, i + 1, j + 1, oldLines[i]))
                i++
                j++
            }
            dp[i + 1][j] >= dp[i][j + 1] -> {
                ops.add(KinetixDiffLine(KinetixDiffLine.Type.REMOVE, i + 1, null, oldLines[i]))
                i++
            }
            else -> {
                ops.add(KinetixDiffLine(KinetixDiffLine.Type.ADD, null, j + 1, newLines[j]))
                j++
            }
        }
    }
    while (i < n) {
        ops.add(KinetixDiffLine(KinetixDiffLine.Type.REMOVE, i + 1, null, oldLines[i]))
        i++
    }
    while (j < m) {
        ops.add(KinetixDiffLine(KinetixDiffLine.Type.ADD, null, j + 1, newLines[j]))
        j++
    }
    return ops
}

/**
 * KinetixDiffViewer — mirrors `packages/ui/src/components/diff-viewer.tsx`.
 * `Split` mode doesn't pair adjacent remove/add runs onto the same row the
 * way GitHub's split view does — each op renders in its own column, blank
 * on the other side, same simplification as the web version.
 */
@Composable
fun KinetixDiffViewer(
    oldText: String,
    newText: String,
    modifier: Modifier = Modifier,
    mode: KinetixDiffMode = KinetixDiffMode.Unified,
    oldLabel: String = "Before",
    newLabel: String = "After",
) {
    val colors = KinetixColorScheme.current
    val ops = remember(oldText, newText) { kinetixComputeLineDiff(oldText, newText) }
    val lineNumberStyle = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = colors.mutedForeground)
    val textStyle = TextStyle(fontFamily = FontFamily.Monospace, fontSize = 11.sp, color = colors.foreground)

    Column(
        modifier = modifier.border(
            dimensionResource(R.dimen.border_width_default),
            colors.border,
            RoundedCornerShape(dimensionResource(R.dimen.radius_md)),
        ),
    ) {
        if (mode == KinetixDiffMode.Unified) {
            ops.forEach { op ->
                val bg = when (op.type) {
                    KinetixDiffLine.Type.ADD -> colors.success.copy(alpha = 0.1f)
                    KinetixDiffLine.Type.REMOVE -> colors.destructive.copy(alpha = 0.1f)
                    KinetixDiffLine.Type.EQUAL -> Color.Transparent
                }
                Row(modifier = Modifier.fillMaxWidth().background(bg)) {
                    Text(op.oldLine?.toString() ?: "", style = lineNumberStyle, modifier = Modifier.width(28.dp).padding(horizontal = 4.dp))
                    Text(op.newLine?.toString() ?: "", style = lineNumberStyle, modifier = Modifier.width(28.dp).padding(horizontal = 4.dp))
                    Text(
                        when (op.type) {
                            KinetixDiffLine.Type.ADD -> "+"
                            KinetixDiffLine.Type.REMOVE -> "−"
                            KinetixDiffLine.Type.EQUAL -> ""
                        },
                        style = textStyle.copy(
                            color = when (op.type) {
                                KinetixDiffLine.Type.ADD -> colors.success
                                KinetixDiffLine.Type.REMOVE -> colors.destructive
                                KinetixDiffLine.Type.EQUAL -> colors.foreground
                            },
                        ),
                        modifier = Modifier.width(14.dp),
                    )
                    Text(op.text, style = textStyle)
                }
            }
        } else {
            Row(modifier = Modifier.fillMaxWidth().background(colors.muted)) {
                Text(oldLabel, style = lineNumberStyle, modifier = Modifier.weight(1f).padding(4.dp))
                Text(newLabel, style = lineNumberStyle, modifier = Modifier.weight(1f).padding(4.dp))
            }
            ops.forEach { op ->
                Row(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.weight(1f).background(
                            if (op.type == KinetixDiffLine.Type.REMOVE) colors.destructive.copy(alpha = 0.1f) else Color.Transparent,
                        ),
                    ) {
                        Text(op.oldLine?.toString() ?: "", style = lineNumberStyle, modifier = Modifier.width(28.dp).padding(horizontal = 4.dp))
                        Text(if (op.type != KinetixDiffLine.Type.ADD) op.text else "", style = textStyle)
                    }
                    Row(
                        modifier = Modifier.weight(1f).background(
                            if (op.type == KinetixDiffLine.Type.ADD) colors.success.copy(alpha = 0.1f) else Color.Transparent,
                        ),
                    ) {
                        Text(op.newLine?.toString() ?: "", style = lineNumberStyle, modifier = Modifier.width(28.dp).padding(horizontal = 4.dp))
                        Text(if (op.type != KinetixDiffLine.Type.REMOVE) op.text else "", style = textStyle)
                    }
                }
            }
        }
    }
}

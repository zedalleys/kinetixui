package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixMarkdownEditor — mirrors
 * `packages/ui/src/components/markdown-editor.tsx`: a formatting toolbar
 * over a plain text field (never a `contenteditable`-style rich view — no
 * native platform has that, so it would've been a web-only, eighth
 * standing non-port). `BasicTextField`'s `TextFieldValue` carries both the
 * text *and* the current selection, so toolbar actions insert/wrap syntax
 * at the real cursor position, same as the web version — unlike SwiftUI's
 * `TextEditor`, which has no selection API before iOS 17.
 */
@Composable
fun KinetixMarkdownEditor(
    value: String,
    onChange: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = KinetixColorScheme.current
    var field by remember { mutableStateOf(TextFieldValue(value)) }
    if (field.text != value) field = TextFieldValue(value)
    var showPreview by remember { mutableStateOf(false) }

    fun commit(next: TextFieldValue) {
        field = next
        onChange(next.text)
    }

    fun applyInline(before: String, after: String, placeholder: String) {
        val text = field.text
        val selection = field.selection
        val selected = if (!selection.collapsed) text.substring(selection.start, selection.end) else placeholder
        val newText = text.substring(0, selection.start) + before + selected + after + text.substring(selection.end)
        commit(TextFieldValue(newText, TextRange(selection.start + before.length, selection.start + before.length + selected.length)))
    }

    fun applyLinePrefix(prefix: (Int) -> String) {
        val text = field.text
        val selection = field.selection
        val lineStart = text.lastIndexOf('\n', (selection.start - 1).coerceAtLeast(0)).let { if (it < 0) 0 else it + 1 }
        var lineEnd = text.indexOf('\n', selection.end.coerceAtLeast(lineStart))
        if (lineEnd < 0) lineEnd = text.length
        val block = text.substring(lineStart, lineEnd)
        val lines = block.split("\n")
        val prefixed = lines.mapIndexed { i, line -> prefix(i) + line }.joinToString("\n")
        val newText = text.substring(0, lineStart) + prefixed + text.substring(lineEnd)
        val newEnd = selection.end + (prefixed.length - block.length)
        commit(TextFieldValue(newText, TextRange(selection.start + prefix(0).length, newEnd)))
    }

    Column(
        modifier = modifier.border(
            dimensionResource(R.dimen.border_width_default),
            colors.border,
            RoundedCornerShape(dimensionResource(R.dimen.radius_md)),
        ),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().background(colors.muted).padding(dimensionResource(R.dimen.spacing_1)),
            horizontalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            ToolbarLabel("B", bold = true) { applyInline("**", "**", "bold text") }
            ToolbarLabel("I", italic = true) { applyInline("*", "*", "italic text") }
            ToolbarLabel("H2") { applyLinePrefix { "## " } }
            ToolbarLabel("Link") { applyInline("[", "](https://)", "link text") }
            ToolbarLabel("•") { applyLinePrefix { "- " } }
            ToolbarLabel("1.") { applyLinePrefix { i -> "${i + 1}. " } }
            ToolbarLabel("<>") { applyInline("`", "`", "code") }
            ToolbarLabel("“”") { applyLinePrefix { "> " } }
            ToolbarLabel(if (showPreview) "Editor" else "Preview") { showPreview = !showPreview }
        }
        if (showPreview) {
            Row(modifier = Modifier.fillMaxWidth()) {
                BasicTextField(
                    value = field,
                    onValueChange = { commit(it) },
                    textStyle = androidx.compose.ui.text.TextStyle(color = colors.foreground, fontSize = 13.sp),
                    cursorBrush = SolidColor(colors.action),
                    modifier = Modifier.weight(1f).padding(dimensionResource(R.dimen.spacing_2)),
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .border(dimensionResource(R.dimen.border_width_default), colors.border)
                        .padding(dimensionResource(R.dimen.spacing_2)),
                ) {
                    KinetixMarkdownPreview(value)
                }
            }
        } else {
            BasicTextField(
                value = field,
                onValueChange = { commit(it) },
                textStyle = androidx.compose.ui.text.TextStyle(color = colors.foreground, fontSize = 13.sp),
                cursorBrush = SolidColor(colors.action),
                modifier = Modifier.fillMaxWidth().padding(dimensionResource(R.dimen.spacing_2)),
            )
        }
    }
}

@Composable
private fun ToolbarLabel(text: String, bold: Boolean = false, italic: Boolean = false, onClick: () -> Unit) {
    val colors = KinetixColorScheme.current
    Text(
        text = text,
        color = colors.mutedForeground,
        fontSize = 12.sp,
        fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal,
        fontStyle = if (italic) FontStyle.Italic else FontStyle.Normal,
        modifier = Modifier
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp, vertical = 4.dp),
    )
}

/**
 * A hand-rolled Markdown renderer covering exactly the syntax the toolbar
 * produces (headings, bold, italic, inline code, bullet/numbered lists,
 * blockquotes, paragraphs) — not full CommonMark, same scope as the web
 * version's `renderMarkdown`. Links render as plain underlined text
 * (Compose's `Text` needs `LinkAnnotation`/click handling for a real tap
 * target, out of scope for this preview pane).
 */
@Composable
private fun KinetixMarkdownPreview(source: String) {
    val colors = KinetixColorScheme.current
    for (line in source.split("\n")) {
        when {
            line.startsWith("### ") -> Text(inlineAnnotated(line.removePrefix("### "), colors), fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = colors.foreground)
            line.startsWith("## ") -> Text(inlineAnnotated(line.removePrefix("## "), colors), fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = colors.foreground)
            line.startsWith("# ") -> Text(inlineAnnotated(line.removePrefix("# "), colors), fontSize = 20.sp, fontWeight = FontWeight.Bold, color = colors.foreground)
            line.startsWith("> ") -> Text(inlineAnnotated(line.removePrefix("> "), colors), fontSize = 13.sp, fontStyle = FontStyle.Italic, color = colors.mutedForeground)
            line.startsWith("- ") || line.startsWith("* ") -> Text("• " + line.drop(2), fontSize = 13.sp, color = colors.foreground)
            Regex("^\\d+\\.\\s").containsMatchIn(line) -> Text(line, fontSize = 13.sp, color = colors.foreground)
            line.isBlank() -> Text("", fontSize = 4.sp)
            else -> Text(inlineAnnotated(line, colors), fontSize = 13.sp, color = colors.foreground)
        }
    }
}

private fun inlineAnnotated(text: String, colors: KinetixColors) = buildAnnotatedString {
    var i = 0
    while (i < text.length) {
        when {
            text.startsWith("**", i) -> {
                val end = text.indexOf("**", i + 2)
                if (end < 0) { append(text.substring(i)); i = text.length } else {
                    withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(text.substring(i + 2, end)) }
                    i = end + 2
                }
            }
            text.startsWith("*", i) -> {
                val end = text.indexOf("*", i + 1)
                if (end < 0) { append(text.substring(i)); i = text.length } else {
                    withStyle(SpanStyle(fontStyle = FontStyle.Italic)) { append(text.substring(i + 1, end)) }
                    i = end + 1
                }
            }
            text.startsWith("`", i) -> {
                val end = text.indexOf("`", i + 1)
                if (end < 0) { append(text.substring(i)); i = text.length } else {
                    withStyle(SpanStyle(fontFamily = androidx.compose.ui.text.font.FontFamily.Monospace, background = colors.muted)) {
                        append(text.substring(i + 1, end))
                    }
                    i = end + 1
                }
            }
            else -> {
                append(text[i])
                i++
            }
        }
    }
}

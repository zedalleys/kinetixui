package com.kinetixui.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.dimensionResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * KinetixTreeView / KinetixTreeItem — mirrors
 * `packages/ui/src/components/tree-view.tsx`: nested expand/collapse
 * rows with optional checkboxes. Data-driven ([KinetixTreeNode] tree)
 * rather than the React composition API — recursion over a plain data
 * structure is far simpler to get right in Compose than threading
 * expand/select/check state through arbitrarily-nested composable
 * children. Tap-to-expand/select only: the web version's keyboard roving
 * tabindex (arrow-key navigation) isn't ported — a real, documented
 * scope-down, not a silent gap; touch is the primary interaction model
 * here. No icon library wired in yet (same gap as [KinetixInform]) — the
 * expand indicator is a plain "▸"/"⌄" glyph, same convention as
 * [KinetixSelect]'s "⌄". `checkable` checkboxes are independent per node
 * — no automatic parent-selects-all-children propagation, same
 * simplification as the web source.
 */
data class KinetixTreeNode(
    val value: String,
    val label: String,
    val children: List<KinetixTreeNode> = emptyList(),
)

@Composable
fun KinetixTreeView(
    nodes: List<KinetixTreeNode>,
    modifier: Modifier = Modifier,
    checkable: Boolean = false,
    expanded: Set<String> = emptySet(),
    onExpandedChange: ((Set<String>) -> Unit)? = null,
    selected: String? = null,
    onSelectedChange: ((String) -> Unit)? = null,
    checkedValues: Set<String> = emptySet(),
    onCheckedChange: ((Set<String>) -> Unit)? = null,
) {
    Column(modifier = modifier) {
        nodes.forEach { node ->
            KinetixTreeItemRow(
                node = node,
                level = 0,
                checkable = checkable,
                expanded = expanded,
                onExpandedChange = onExpandedChange,
                selected = selected,
                onSelectedChange = onSelectedChange,
                checkedValues = checkedValues,
                onCheckedChange = onCheckedChange,
            )
        }
    }
}

@Composable
private fun KinetixTreeItemRow(
    node: KinetixTreeNode,
    level: Int,
    checkable: Boolean,
    expanded: Set<String>,
    onExpandedChange: ((Set<String>) -> Unit)?,
    selected: String?,
    onSelectedChange: ((String) -> Unit)?,
    checkedValues: Set<String>,
    onCheckedChange: ((Set<String>) -> Unit)?,
) {
    val colors = KinetixColorScheme.current
    val hasChildren = node.children.isNotEmpty()
    val isExpanded = node.value in expanded
    val isSelected = node.value == selected
    val isChecked = node.value in checkedValues

    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(if (isSelected) colors.accent else Color.Transparent, RoundedCornerShape(dimensionResource(R.dimen.radius_sm)))
                .clickable {
                    onSelectedChange?.invoke(node.value)
                    if (checkable) {
                        onCheckedChange?.invoke(if (isChecked) checkedValues - node.value else checkedValues + node.value)
                    }
                }
                .padding(start = (level * 20 + 8).dp, top = 6.dp, bottom = 6.dp, end = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (hasChildren) {
                Text(
                    text = if (isExpanded) "⌄" else "▸",
                    color = colors.mutedForeground,
                    modifier = Modifier
                        .size(16.dp)
                        .clickable {
                            onExpandedChange?.invoke(if (isExpanded) expanded - node.value else expanded + node.value)
                        },
                )
            } else {
                Text(text = "", modifier = Modifier.size(16.dp))
            }
            if (checkable) {
                Checkbox(
                    checked = isChecked,
                    onCheckedChange = {
                        onCheckedChange?.invoke(if (it) checkedValues + node.value else checkedValues - node.value)
                    },
                    colors = CheckboxDefaults.colors(checkedColor = colors.primary, checkmarkColor = colors.primaryForeground),
                    modifier = Modifier.size(20.dp),
                )
            }
            Text(
                text = node.label,
                color = colors.foreground,
                fontSize = dimensionResource(R.dimen.font_size_body_sm).value.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.weight(1f),
            )
        }
        if (hasChildren && isExpanded) {
            node.children.forEach { child ->
                KinetixTreeItemRow(
                    node = child,
                    level = level + 1,
                    checkable = checkable,
                    expanded = expanded,
                    onExpandedChange = onExpandedChange,
                    selected = selected,
                    onSelectedChange = onSelectedChange,
                    checkedValues = checkedValues,
                    onCheckedChange = onCheckedChange,
                )
            }
        }
    }
}

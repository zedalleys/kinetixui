import 'package:flutter/material.dart';

import 'app_text.dart';
import 'checkbox.dart';
import 'theme.dart';

/// Mirrors `packages/ui/src/components/tree-view.tsx`: nested expand/
/// collapse rows with optional checkboxes. Data-driven ([KinetixTreeNode]
/// tree) rather than the React composition API, same call as the
/// Compose/SwiftUI ports — recursion over a plain data structure is far
/// simpler than threading state through arbitrarily-nested widget
/// children (Flutter widgets can reference themselves as children
/// directly, no indirection needed either way). Tap-to-expand/select
/// only: the web version's keyboard roving tabindex isn't ported, a
/// documented scope-down (touch is primary here). `checkable` checkboxes
/// are independent per node — no parent-selects-all-children
/// propagation, same simplification as the web source.
class KinetixTreeNode {
  const KinetixTreeNode(this.value, this.label, {this.children = const []});

  final String value;
  final String label;
  final List<KinetixTreeNode> children;
}

class KinetixTreeView extends StatelessWidget {
  const KinetixTreeView({
    super.key,
    required this.nodes,
    this.checkable = false,
    this.expanded = const {},
    this.onExpandedChange,
    this.selected,
    this.onSelectedChange,
    this.checkedValues = const {},
    this.onCheckedChange,
  });

  final List<KinetixTreeNode> nodes;
  final bool checkable;
  final Set<String> expanded;
  final ValueChanged<Set<String>>? onExpandedChange;
  final String? selected;
  final ValueChanged<String>? onSelectedChange;
  final Set<String> checkedValues;
  final ValueChanged<Set<String>>? onCheckedChange;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final node in nodes)
          _KinetixTreeItemRow(
            node: node,
            level: 0,
            checkable: checkable,
            expanded: expanded,
            onExpandedChange: onExpandedChange,
            selected: selected,
            onSelectedChange: onSelectedChange,
            checkedValues: checkedValues,
            onCheckedChange: onCheckedChange,
          ),
      ],
    );
  }
}

class _KinetixTreeItemRow extends StatelessWidget {
  const _KinetixTreeItemRow({
    required this.node,
    required this.level,
    required this.checkable,
    required this.expanded,
    required this.onExpandedChange,
    required this.selected,
    required this.onSelectedChange,
    required this.checkedValues,
    required this.onCheckedChange,
  });

  final KinetixTreeNode node;
  final int level;
  final bool checkable;
  final Set<String> expanded;
  final ValueChanged<Set<String>>? onExpandedChange;
  final String? selected;
  final ValueChanged<String>? onSelectedChange;
  final Set<String> checkedValues;
  final ValueChanged<Set<String>>? onCheckedChange;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final hasChildren = node.children.isNotEmpty;
    final isExpanded = expanded.contains(node.value);
    final isSelected = selected == node.value;
    final isChecked = checkedValues.contains(node.value);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        InkWell(
          borderRadius: BorderRadius.circular(4),
          onTap: () {
            if (onSelectedChange != null) onSelectedChange!(node.value);
            if (checkable && onCheckedChange != null) {
              final next = Set<String>.from(checkedValues);
              isChecked ? next.remove(node.value) : next.add(node.value);
              onCheckedChange!(next);
            }
          },
          child: Container(
            decoration: BoxDecoration(
              color: isSelected ? c.accent : null,
              borderRadius: BorderRadius.circular(4),
            ),
            padding: EdgeInsets.only(left: (level * 20 + 8).toDouble(), top: 6, bottom: 6, right: 8),
            child: Row(
              children: [
                if (hasChildren)
                  GestureDetector(
                    onTap: () {
                      if (onExpandedChange == null) return;
                      final next = Set<String>.from(expanded);
                      isExpanded ? next.remove(node.value) : next.add(node.value);
                      onExpandedChange!(next);
                    },
                    child: SizedBox(
                      width: 16,
                      height: 16,
                      child: Icon(
                        isExpanded ? Icons.expand_more : Icons.chevron_right,
                        size: 16,
                        color: c.mutedForeground,
                      ),
                    ),
                  )
                else
                  const SizedBox(width: 16, height: 16),
                const SizedBox(width: 6),
                if (checkable) ...[
                  KinetixCheckbox(
                    value: isChecked,
                    onChanged: (v) {
                      if (onCheckedChange == null) return;
                      final next = Set<String>.from(checkedValues);
                      v ? next.add(node.value) : next.remove(node.value);
                      onCheckedChange!(next);
                    },
                  ),
                  const SizedBox(width: 6),
                ],
                Expanded(
                  child: Text(
                    node.label,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppText.bodySm.copyWith(color: c.foreground),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (hasChildren && isExpanded)
          for (final child in node.children)
            _KinetixTreeItemRow(
              node: child,
              level: level + 1,
              checkable: checkable,
              expanded: expanded,
              onExpandedChange: onExpandedChange,
              selected: selected,
              onSelectedChange: onSelectedChange,
              checkedValues: checkedValues,
              onCheckedChange: onCheckedChange,
            ),
      ],
    );
  }
}

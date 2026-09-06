import 'package:flutter/material.dart';

import 'button.dart';
import 'table.dart';
import 'app_text.dart';
import 'theme.dart';

class KinetixDataColumn<T> {
  const KinetixDataColumn({
    required this.header,
    required this.cell,
    this.width,
    this.sortKey,
  });

  final String header;
  final String Function(T row) cell;
  final double? width;

  /// Returns a string sort key (compared lexicographically — zero-pad
  /// numbers). `null` ⇒ the column isn't sortable.
  final String Function(T row)? sortKey;
}

/// Mirrors `packages/ui/src/components/data-table.tsx`. Hand-held sort +
/// pagination, reusing [KinetixTable] / [KinetixTableRow] / [KinetixButton]
/// outright. Tapping a sortable header cycles asc → desc.
class KinetixDataTable<T> extends StatefulWidget {
  const KinetixDataTable({
    super.key,
    required this.columns,
    required this.rows,
    this.pageSize = 10,
  });

  final List<KinetixDataColumn<T>> columns;
  final List<T> rows;
  final int pageSize;

  @override
  State<KinetixDataTable<T>> createState() => _KinetixDataTableState<T>();
}

class _KinetixDataTableState<T> extends State<KinetixDataTable<T>> {
  int? _sortColumn;
  bool _ascending = true;
  int _page = 0;

  List<T> get _sorted {
    final col = _sortColumn == null ? null : widget.columns[_sortColumn!];
    final key = col?.sortKey;
    if (key == null) return widget.rows;
    final sorted = [...widget.rows]..sort((a, b) => key(a).compareTo(key(b)));
    return _ascending ? sorted : sorted.reversed.toList();
  }

  int get _pageCount {
    final n = (widget.rows.length / widget.pageSize).ceil();
    return n < 1 ? 1 : n;
  }

  List<T> get _pageRows {
    final all = _sorted;
    final start = _page * widget.pageSize;
    if (start >= all.length) return const [];
    return all.sublist(start, (start + widget.pageSize).clamp(0, all.length));
  }

  void _toggleSort(int i) {
    if (widget.columns[i].sortKey == null) return;
    setState(() {
      if (_sortColumn == i) {
        _ascending = !_ascending;
      } else {
        _sortColumn = i;
        _ascending = true;
      }
      _page = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        KinetixTable(
          children: [
            KinetixTableRow(
              isHeader: true,
              cells: [
                for (var i = 0; i < widget.columns.length; i++)
                  _headerCell(context, i),
              ],
            ),
            for (final row in _pageRows)
              KinetixTableRow(
                cells: [
                  for (final col in widget.columns)
                    KinetixTableCell(
                      width: col.width,
                      child: Text(col.cell(row), style: AppText.bodyMd.copyWith(color: c.foreground)),
                    ),
                ],
              ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Text(
              'Page ${_page + 1} of $_pageCount',
              style: TextStyle(fontSize: 13, color: c.mutedForeground),
            ),
            const Spacer(),
            KinetixButton(
              variant: KinetixButtonVariant.outline,
              size: KinetixButtonSize.sm,
              onPressed: _page > 0 ? () => setState(() => _page -= 1) : null,
              child: const Text('Previous'),
            ),
            const SizedBox(width: 8),
            KinetixButton(
              variant: KinetixButtonVariant.outline,
              size: KinetixButtonSize.sm,
              onPressed: _page < _pageCount - 1 ? () => setState(() => _page += 1) : null,
              child: const Text('Next'),
            ),
          ],
        ),
      ],
    );
  }

  Widget _headerCell(BuildContext context, int i) {
    final c = KinetixTheme.of(context);
    final col = widget.columns[i];
    final Widget label = GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => _toggleSort(i),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              col.header,
              style: AppText.labelLg.copyWith(color: c.mutedForeground),
            ),
            if (_sortColumn == i) ...[
              const SizedBox(width: 4),
              Icon(_ascending ? Icons.arrow_upward : Icons.arrow_downward, size: 12, color: c.mutedForeground),
            ],
          ],
        ),
      ),
    );
    return col.width == null ? Expanded(child: label) : SizedBox(width: col.width, child: label);
  }
}

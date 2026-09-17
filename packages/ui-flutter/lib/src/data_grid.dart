import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';

/// A single DataGrid column: [id] identifies it for edit callbacks,
/// [cellText] both renders the cell and (when [sortable]) drives the sort
/// compare and seeds the edit field.
class KinetixDataGridColumn<T> {
  const KinetixDataGridColumn({
    required this.id,
    required this.header,
    required this.cellText,
    this.width = 120,
    this.sortable = false,
    this.editable = false,
    this.onCellEdit,
  });

  final String id;
  final String header;
  final double width;
  final bool sortable;
  final bool editable;
  final String Function(T row) cellText;
  final void Function(T row, int rowIndex, String value)? onCellEdit;
}

/// Mirrors `packages/ui/src/components/data-grid.tsx`'s row-virtualized
/// grid. Column resize, drag-to-reorder, and column pin are web-only: no
/// touch-friendly drag-a-column-border gesture convention on mobile, and a
/// sticky column needs a custom layout `ListView` doesn't give for free.
/// Ships the three features that map directly onto Flutter primitives
/// instead: `ListView.builder` only builds rows near the viewport (bound
/// its height via a parent `SizedBox`/`Expanded`, same as
/// `KinetixVirtualList`), a tap-to-sort header, and tap-to-edit cells that
/// commit on the keyboard's submit action rather than the web's
/// blur-also-commits. The header and body scroll horizontally in lockstep
/// via two `ScrollController`s kept in sync — a `ScrollController` can only
/// attach to one scrollable at a time in Flutter, so they can't just share
/// one.
class KinetixDataGrid<T> extends StatefulWidget {
  const KinetixDataGrid({
    super.key,
    required this.columns,
    required this.rows,
    this.rowHeight = 40,
  });

  final List<KinetixDataGridColumn<T>> columns;
  final List<T> rows;
  final double rowHeight;

  @override
  State<KinetixDataGrid<T>> createState() => _KinetixDataGridState<T>();
}

class _KinetixDataGridState<T> extends State<KinetixDataGrid<T>> {
  final ScrollController _headerController = ScrollController();
  final ScrollController _bodyController = ScrollController();
  final TextEditingController _editController = TextEditingController();
  String? _sortColumnId;
  bool _ascending = true;
  int? _editingRow;
  String? _editingColumnId;

  @override
  void initState() {
    super.initState();
    _bodyController.addListener(() {
      if (_headerController.hasClients && _headerController.offset != _bodyController.offset) {
        _headerController.jumpTo(_bodyController.offset);
      }
    });
  }

  @override
  void dispose() {
    _headerController.dispose();
    _bodyController.dispose();
    _editController.dispose();
    super.dispose();
  }

  List<T> get _sortedRows {
    final columnId = _sortColumnId;
    if (columnId == null) return widget.rows;
    final column = widget.columns.firstWhere((c) => c.id == columnId);
    final sorted = [...widget.rows]..sort((a, b) => column.cellText(a).compareTo(column.cellText(b)));
    return _ascending ? sorted : sorted.reversed.toList();
  }

  void _toggleSort(KinetixDataGridColumn<T> column) {
    if (!column.sortable) return;
    setState(() {
      if (_sortColumnId == column.id) {
        _ascending = !_ascending;
      } else {
        _sortColumnId = column.id;
        _ascending = true;
      }
    });
  }

  double get _totalWidth => widget.columns.fold(0, (sum, c) => sum + c.width);

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final sorted = _sortedRows;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SingleChildScrollView(
          controller: _headerController,
          scrollDirection: Axis.horizontal,
          physics: const NeverScrollableScrollPhysics(),
          child: SizedBox(
            width: _totalWidth,
            height: widget.rowHeight,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: c.background,
                border: Border(bottom: BorderSide(color: c.border)),
              ),
              child: Row(
                children: [
                  for (final column in widget.columns)
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => _toggleSort(column),
                      child: SizedBox(
                        width: column.width,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Flexible(
                                child: Text(
                                  column.header,
                                  overflow: TextOverflow.ellipsis,
                                  style: AppText.labelLg.copyWith(color: c.mutedForeground),
                                ),
                              ),
                              if (_sortColumnId == column.id) ...[
                                const SizedBox(width: 4),
                                Icon(
                                  _ascending ? Icons.arrow_upward : Icons.arrow_downward,
                                  size: 12,
                                  color: c.mutedForeground,
                                ),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            controller: _bodyController,
            itemCount: sorted.length,
            itemExtent: widget.rowHeight,
            itemBuilder: (context, rowIndex) {
              final row = sorted[rowIndex];
              return DecoratedBox(
                decoration: BoxDecoration(border: Border(bottom: BorderSide(color: c.border))),
                child: SizedBox(
                  width: _totalWidth,
                  child: Row(
                    children: [
                      for (final column in widget.columns) _cell(context, column, row, rowIndex),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _cell(BuildContext context, KinetixDataGridColumn<T> column, T row, int rowIndex) {
    final c = KinetixTheme.of(context);
    final isEditing = _editingRow == rowIndex && _editingColumnId == column.id;
    return SizedBox(
      width: column.width,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: isEditing
            ? TextField(
                controller: _editController,
                style: AppText.bodyMd.copyWith(color: c.foreground),
                decoration: const InputDecoration(border: InputBorder.none, isDense: true),
                onSubmitted: (value) {
                  column.onCellEdit?.call(row, rowIndex, value);
                  setState(() {
                    _editingRow = null;
                    _editingColumnId = null;
                  });
                },
              )
            : GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: column.editable
                    ? () {
                        setState(() {
                          _editingRow = rowIndex;
                          _editingColumnId = column.id;
                          _editController.text = column.cellText(row);
                        });
                      }
                    : null,
                child: Text(
                  column.cellText(row),
                  overflow: TextOverflow.ellipsis,
                  style: AppText.bodyMd.copyWith(color: c.foreground),
                ),
              ),
      ),
    );
  }
}

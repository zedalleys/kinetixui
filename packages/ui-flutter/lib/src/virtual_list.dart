import 'package:flutter/widgets.dart';

/// Mirrors `packages/ui/src/components/virtual-list.tsx`: a windowed-rendering
/// primitive. Like `KinetixVirtualList` on Compose (`LazyColumn`) and SwiftUI
/// (`List`), this maps cleanly onto a native mechanism — `ListView.builder`
/// already only builds the children near the visible viewport, so there's no
/// manual scroll-offset math to port and no fixed-row-height restriction.
class KinetixVirtualList<T> extends StatelessWidget {
  const KinetixVirtualList({
    super.key,
    required this.items,
    required this.itemBuilder,
    this.itemExtent,
  });

  final List<T> items;
  final Widget Function(BuildContext context, T item, int index) itemBuilder;

  /// Fixed row height, forwarded to `ListView.builder`'s `itemExtent` when
  /// known — lets Flutter skip measuring every row up front.
  final double? itemExtent;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: items.length,
      itemExtent: itemExtent,
      itemBuilder: (context, index) => itemBuilder(context, items[index], index),
    );
  }
}

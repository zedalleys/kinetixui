import 'package:flutter/widgets.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/table.tsx`. Cells take an optional
/// `width` (null = flexible equal share via `Expanded`), consistent per
/// column — the caller keeps it consistent across rows. For a wide table,
/// give every cell a fixed `width` and wrap `KinetixTable` in a
/// horizontal `SingleChildScrollView`. `h-10` (40) is off the shared
/// spacing scale.
class KinetixTable extends StatelessWidget {
  const KinetixTable({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: children,
    );
  }
}

class KinetixTableRow extends StatelessWidget {
  const KinetixTableRow({super.key, required this.cells, this.isHeader = false});

  final List<Widget> cells;
  final bool isHeader;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Container(
      constraints: BoxConstraints(minHeight: isHeader ? 40 : 44),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: c.border, width: 1)),
      ),
      child: Row(crossAxisAlignment: CrossAxisAlignment.center, children: cells),
    );
  }
}

class KinetixTableHead extends StatelessWidget {
  const KinetixTableHead(this.text, {super.key, this.width});

  final String text;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final Widget label = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Text(
        text,
        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: c.mutedForeground),
      ),
    );
    return width == null ? Expanded(child: label) : SizedBox(width: width, child: label);
  }
}

class KinetixTableCell extends StatelessWidget {
  const KinetixTableCell({super.key, required this.child, this.width});

  final Widget child;
  final double? width;

  @override
  Widget build(BuildContext context) {
    final Widget padded = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      child: Align(alignment: Alignment.centerLeft, child: child),
    );
    return width == null ? Expanded(child: padded) : SizedBox(width: width, child: padded);
  }
}

class KinetixTableCaption extends StatelessWidget {
  const KinetixTableCaption(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Text(text, style: TextStyle(fontSize: 14, color: c.mutedForeground)),
    );
  }
}

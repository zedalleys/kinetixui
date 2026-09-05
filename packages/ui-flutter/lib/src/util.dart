import 'package:flutter/widgets.dart';

/// Interleave [gap]-sized spacers between [items]
/// (`Axis.vertical` → `SizedBox(height:)`, `Axis.horizontal` → `width:`).
/// The `Kinetix*` slot widgets (Card / RadioGroup / …) use this to bake a
/// fixed gap into a `Column` / `Row` without the caller adding spacers.
List<Widget> gapAll(List<Widget> items, double gap, {Axis axis = Axis.vertical}) {
  if (items.length < 2) return items;
  final out = <Widget>[];
  for (var i = 0; i < items.length; i++) {
    if (i > 0) {
      out.add(axis == Axis.vertical ? SizedBox(height: gap) : SizedBox(width: gap));
    }
    out.add(items[i]);
  }
  return out;
}

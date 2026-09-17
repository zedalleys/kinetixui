import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/json-viewer.tsx`: a collapsible,
/// syntax-colored tree over arbitrary JSON-shaped data. Accepts the same
/// shape `dart:convert`'s `jsonDecode` produces — `Map<String, dynamic>`,
/// `List<dynamic>`, `String`, `num`, `bool`, or `null` — directly, no
/// wrapper type needed the way `KinetixJSONValue` is on SwiftUI. Unlike
/// `KinetixDataGrid`, a recursive expand/collapse tree needs no gesture or
/// layout primitive Flutter lacks, so this ships with the same feature set
/// as web.
class KinetixJsonViewer extends StatelessWidget {
  const KinetixJsonViewer({super.key, required this.data, this.expandDepth = 1});

  final dynamic data;
  final int expandDepth;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: _JsonNode(name: null, value: data, depth: 0, expandDepth: expandDepth, isLast: true),
      ),
    );
  }
}

class _JsonNode extends StatefulWidget {
  const _JsonNode({
    required this.name,
    required this.value,
    required this.depth,
    required this.expandDepth,
    required this.isLast,
  });

  final String? name;
  final dynamic value;
  final int depth;
  final int expandDepth;
  final bool isLast;

  @override
  State<_JsonNode> createState() => _JsonNodeState();
}

class _JsonNodeState extends State<_JsonNode> {
  late bool _expanded = widget.depth < widget.expandDepth;

  static const _fontSize = 12.0;

  TextStyle _mono(Color color, {bool italic = false}) => TextStyle(
        fontFamily: 'monospace',
        fontSize: _fontSize,
        color: color,
        fontStyle: italic ? FontStyle.italic : FontStyle.normal,
      );

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final value = widget.value;
    final isContainer = value is Map || value is List;

    if (!isContainer) {
      return Padding(
        padding: EdgeInsets.only(left: (widget.depth * 16).toDouble()),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (widget.name != null) Text('"${widget.name}": ', style: _mono(c.mutedForeground)),
            _primitive(c, value),
            if (!widget.isLast) Text(',', style: _mono(c.mutedForeground)),
          ],
        ),
      );
    }

    final isArray = value is List;
    final entries = isArray
        ? List.generate((value as List).length, (i) => MapEntry(i.toString(), value[i]))
        : (value as Map).entries.map((e) => MapEntry(e.key.toString(), e.value)).toList();
    final openBracket = isArray ? '[' : '{';
    final closeBracket = isArray ? ']' : '}';

    if (entries.isEmpty) {
      return Padding(
        padding: EdgeInsets.only(left: (widget.depth * 16 + 20).toDouble()),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (widget.name != null) Text('"${widget.name}": ', style: _mono(c.mutedForeground)),
            Text('$openBracket$closeBracket', style: _mono(c.foreground)),
            if (!widget.isLast) Text(',', style: _mono(c.mutedForeground)),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Padding(
          padding: EdgeInsets.only(left: (widget.depth * 16).toDouble()),
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => setState(() => _expanded = !_expanded),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                AnimatedRotation(
                  turns: _expanded ? 0.25 : 0,
                  duration: const Duration(milliseconds: 100),
                  child: Icon(Icons.chevron_right, size: 14, color: c.mutedForeground),
                ),
                if (widget.name != null) Text('"${widget.name}": ', style: _mono(c.mutedForeground)),
                Text(openBracket, style: _mono(c.foreground)),
                if (!_expanded) ...[
                  Text(
                    ' ${entries.length} ${isArray ? 'item' : 'key'}${entries.length == 1 ? '' : 's'} ',
                    style: _mono(c.mutedForeground),
                  ),
                  Text(closeBracket, style: _mono(c.foreground)),
                  if (!widget.isLast) Text(',', style: _mono(c.mutedForeground)),
                ],
              ],
            ),
          ),
        ),
        if (_expanded) ...[
          for (var i = 0; i < entries.length; i++)
            _JsonNode(
              name: isArray ? null : entries[i].key,
              value: entries[i].value,
              depth: widget.depth + 1,
              expandDepth: widget.expandDepth,
              isLast: i == entries.length - 1,
            ),
          Padding(
            padding: EdgeInsets.only(left: (widget.depth * 16).toDouble()),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(closeBracket, style: _mono(c.foreground)),
                if (!widget.isLast) Text(',', style: _mono(c.mutedForeground)),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _primitive(KinetixColors c, dynamic value) {
    if (value == null) return Text('null', style: _mono(c.mutedForeground, italic: true));
    if (value is String) return Text('"$value"', style: _mono(c.success));
    if (value is num) return Text(value.toString(), style: _mono(c.info));
    if (value is bool) return Text(value.toString(), style: _mono(c.warning));
    return Text(value.toString(), style: _mono(c.foreground));
  }
}

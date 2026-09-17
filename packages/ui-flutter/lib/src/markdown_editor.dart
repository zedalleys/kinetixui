import 'package:flutter/material.dart';

import 'theme.dart';

/// Mirrors `packages/ui/src/components/markdown-editor.tsx`: a formatting
/// toolbar over a plain text field (never a `contenteditable`-style rich
/// view — no native platform has that, so it would've been a web-only,
/// eighth standing non-port). `TextEditingController.selection` gives full
/// cursor-range access, so — unlike SwiftUI's `TextEditor` before iOS 17 —
/// toolbar actions insert/wrap syntax at the real cursor position, same as
/// the web/Compose versions.
class KinetixMarkdownEditor extends StatefulWidget {
  const KinetixMarkdownEditor({super.key, required this.value, required this.onChanged, this.minLines = 8});

  final String value;
  final ValueChanged<String> onChanged;
  final int minLines;

  @override
  State<KinetixMarkdownEditor> createState() => _KinetixMarkdownEditorState();
}

class _KinetixMarkdownEditorState extends State<KinetixMarkdownEditor> {
  late final TextEditingController _controller = TextEditingController(text: widget.value);
  bool _showPreview = false;

  @override
  void didUpdateWidget(covariant KinetixMarkdownEditor oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value != _controller.text) {
      _controller.value = _controller.value.copyWith(text: widget.value, selection: TextSelection.collapsed(offset: widget.value.length));
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _applyInline(String before, String after, String placeholder) {
    final text = _controller.text;
    final selection = _controller.selection;
    final start = selection.start < 0 ? text.length : selection.start;
    final end = selection.end < 0 ? text.length : selection.end;
    final selected = start != end ? text.substring(start, end) : placeholder;
    final newText = text.replaceRange(start, end, '$before$selected$after');
    _controller.value = TextEditingValue(
      text: newText,
      selection: TextSelection(baseOffset: start + before.length, extentOffset: start + before.length + selected.length),
    );
    widget.onChanged(newText);
  }

  void _applyLinePrefix(String Function(int) prefix) {
    final text = _controller.text;
    final selection = _controller.selection;
    final start = selection.start < 0 ? text.length : selection.start;
    final end = selection.end < 0 ? text.length : selection.end;
    final lineStart = text.lastIndexOf('\n', (start - 1).clamp(0, text.length)) + 1;
    var lineEnd = text.indexOf('\n', end < lineStart ? lineStart : end);
    if (lineEnd < 0) lineEnd = text.length;
    final block = text.substring(lineStart, lineEnd);
    final lines = block.split('\n');
    final prefixed = [for (var i = 0; i < lines.length; i++) '${prefix(i)}${lines[i]}'].join('\n');
    final newText = text.replaceRange(lineStart, lineEnd, prefixed);
    final newEnd = end + (prefixed.length - block.length);
    _controller.value = TextEditingValue(
      text: newText,
      selection: TextSelection(baseOffset: start + prefix(0).length, extentOffset: newEnd),
    );
    widget.onChanged(newText);
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return DecoratedBox(
      decoration: BoxDecoration(border: Border.all(color: c.border), borderRadius: BorderRadius.circular(8)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ColoredBox(
            color: c.muted,
            child: Padding(
              padding: const EdgeInsets.all(4),
              child: Row(
                children: [
                  _ToolbarLabel('B', bold: true, onTap: () => _applyInline('**', '**', 'bold text')),
                  _ToolbarLabel('I', italic: true, onTap: () => _applyInline('*', '*', 'italic text')),
                  _ToolbarLabel('H2', onTap: () => _applyLinePrefix((_) => '## ')),
                  _ToolbarLabel('Link', onTap: () => _applyInline('[', '](https://)', 'link text')),
                  _ToolbarLabel('•', onTap: () => _applyLinePrefix((_) => '- ')),
                  _ToolbarLabel('1.', onTap: () => _applyLinePrefix((i) => '${i + 1}. ')),
                  _ToolbarLabel('<>', onTap: () => _applyInline('`', '`', 'code')),
                  _ToolbarLabel('“”', onTap: () => _applyLinePrefix((_) => '> ')),
                  const Spacer(),
                  _ToolbarLabel(
                    _showPreview ? 'Editor' : 'Preview',
                    onTap: () => setState(() => _showPreview = !_showPreview),
                  ),
                ],
              ),
            ),
          ),
          if (_showPreview)
            IntrinsicHeight(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.all(8),
                      child: TextField(
                        controller: _controller,
                        onChanged: widget.onChanged,
                        minLines: widget.minLines,
                        maxLines: null,
                        style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
                        decoration: const InputDecoration(border: InputBorder.none, isDense: true),
                      ),
                    ),
                  ),
                  VerticalDivider(width: 1, color: c.border),
                  Expanded(
                    child: SingleChildScrollView(
                      padding: const EdgeInsets.all(8),
                      child: _KinetixMarkdownPreview(source: widget.value),
                    ),
                  ),
                ],
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.all(8),
              child: TextField(
                controller: _controller,
                onChanged: widget.onChanged,
                minLines: widget.minLines,
                maxLines: null,
                style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
                decoration: const InputDecoration(border: InputBorder.none, isDense: true),
              ),
            ),
        ],
      ),
    );
  }
}

class _ToolbarLabel extends StatelessWidget {
  const _ToolbarLabel(this.text, {required this.onTap, this.bold = false, this.italic = false});

  final String text;
  final VoidCallback onTap;
  final bool bold;
  final bool italic;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Text(
          text,
          style: TextStyle(
            fontSize: 12,
            color: c.mutedForeground,
            fontWeight: bold ? FontWeight.bold : FontWeight.normal,
            fontStyle: italic ? FontStyle.italic : FontStyle.normal,
          ),
        ),
      ),
    );
  }
}

/// A hand-rolled Markdown renderer covering exactly the syntax the toolbar
/// produces — not full CommonMark, same scope as the web version's
/// `renderMarkdown`.
class _KinetixMarkdownPreview extends StatelessWidget {
  const _KinetixMarkdownPreview({required this.source});

  final String source;

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final numbered = RegExp(r'^\d+\.\s');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final line in source.split('\n'))
          if (line.startsWith('### '))
            Text.rich(_inline(line.substring(4), c), style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600))
          else if (line.startsWith('## '))
            Text.rich(_inline(line.substring(3), c), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w600))
          else if (line.startsWith('# '))
            Text.rich(_inline(line.substring(2), c), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold))
          else if (line.startsWith('> '))
            Text.rich(_inline(line.substring(2), c), style: TextStyle(fontSize: 13, fontStyle: FontStyle.italic, color: c.mutedForeground))
          else if (line.startsWith('- ') || line.startsWith('* '))
            Text('• ${line.substring(2)}', style: const TextStyle(fontSize: 13))
          else if (numbered.hasMatch(line))
            Text(line, style: const TextStyle(fontSize: 13))
          else if (line.trim().isEmpty)
            const SizedBox(height: 8)
          else
            Text.rich(_inline(line, c), style: const TextStyle(fontSize: 13)),
      ],
    );
  }

  InlineSpan _inline(String text, KinetixColors c) {
    final spans = <InlineSpan>[];
    var i = 0;
    while (i < text.length) {
      if (text.startsWith('**', i)) {
        final end = text.indexOf('**', i + 2);
        if (end < 0) {
          spans.add(TextSpan(text: text.substring(i)));
          break;
        }
        spans.add(TextSpan(text: text.substring(i + 2, end), style: const TextStyle(fontWeight: FontWeight.bold)));
        i = end + 2;
      } else if (text.startsWith('*', i)) {
        final end = text.indexOf('*', i + 1);
        if (end < 0) {
          spans.add(TextSpan(text: text.substring(i)));
          break;
        }
        spans.add(TextSpan(text: text.substring(i + 1, end), style: const TextStyle(fontStyle: FontStyle.italic)));
        i = end + 1;
      } else if (text.startsWith('`', i)) {
        final end = text.indexOf('`', i + 1);
        if (end < 0) {
          spans.add(TextSpan(text: text.substring(i)));
          break;
        }
        spans.add(TextSpan(
          text: text.substring(i + 1, end),
          style: TextStyle(fontFamily: 'monospace', backgroundColor: c.muted),
        ));
        i = end + 1;
      } else {
        final next = [
          text.indexOf('**', i),
          text.indexOf('*', i),
          text.indexOf('`', i),
        ].where((n) => n >= 0).fold<int?>(null, (a, b) => a == null || b < a ? b : a);
        final stop = next ?? text.length;
        spans.add(TextSpan(text: text.substring(i, stop)));
        i = stop;
      }
    }
    return TextSpan(children: spans, style: TextStyle(color: c.foreground));
  }
}

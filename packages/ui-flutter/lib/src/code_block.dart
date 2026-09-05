import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'theme.dart';

class KinetixCodeBlockFile {
  const KinetixCodeBlockFile({required this.name, required this.code});

  final String name;
  final String code;
}

/// Mirrors `packages/ui/src/components/code-block.tsx`: a monospaced code
/// display with a copy button and, for more than one file, a tab strip.
/// Presentational — no syntax highlighting, same as the other ports. Copy
/// uses Flutter's `Clipboard` (cross-platform).
class KinetixCodeBlock extends StatefulWidget {
  KinetixCodeBlock({super.key, required String code, String filename = '', this.hideCopy = false})
      : files = [KinetixCodeBlockFile(name: filename, code: code)];

  const KinetixCodeBlock.files({super.key, required this.files, this.hideCopy = false});

  final List<KinetixCodeBlockFile> files;
  final bool hideCopy;

  @override
  State<KinetixCodeBlock> createState() => _KinetixCodeBlockState();
}

class _KinetixCodeBlockState extends State<KinetixCodeBlock> {
  int _active = 0;
  bool _copied = false;

  KinetixCodeBlockFile get _current =>
      widget.files.isEmpty ? const KinetixCodeBlockFile(name: '', code: '') : widget.files[_active.clamp(0, widget.files.length - 1)];

  bool get _hasHeader => widget.files.length > 1 || _current.name.isNotEmpty;

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: _current.code));
    if (!mounted) return;
    setState(() => _copied = true);
    await Future<void>.delayed(const Duration(milliseconds: 1500));
    if (mounted) setState(() => _copied = false);
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);

    final Widget copyButton = GestureDetector(
      onTap: _copy,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Icon(_copied ? Icons.check : Icons.copy, size: 14, color: c.mutedForeground),
      ),
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: c.muted,
          border: Border.all(color: c.input, width: 1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_hasHeader)
              DecoratedBox(
                decoration: BoxDecoration(
                  color: c.background,
                  border: Border(bottom: BorderSide(color: c.input, width: 1)),
                ),
                child: Row(
                  children: [
                    for (var i = 0; i < widget.files.length; i++)
                      GestureDetector(
                        onTap: () => setState(() => _active = i),
                        behavior: HitTestBehavior.opaque,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            border: Border(
                              bottom: BorderSide(
                                color: i == _active ? c.primary : const Color(0x00000000),
                                width: 2,
                              ),
                            ),
                          ),
                          child: Text(
                            widget.files[i].name.isEmpty ? 'code' : widget.files[i].name,
                            style: TextStyle(
                              fontSize: 13,
                              color: i == _active ? c.foreground : c.mutedForeground,
                            ),
                          ),
                        ),
                      ),
                    const Spacer(),
                    if (!widget.hideCopy) copyButton,
                  ],
                ),
              ),
            Stack(
              children: [
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: SelectableText(
                      _current.code,
                      style: TextStyle(fontSize: 13, fontFamily: 'monospace', color: c.foreground),
                    ),
                  ),
                ),
                if (!_hasHeader && !widget.hideCopy)
                  Positioned(right: 6, top: 6, child: copyButton),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

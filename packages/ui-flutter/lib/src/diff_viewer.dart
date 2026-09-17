import 'package:flutter/material.dart';

import 'theme.dart';

enum KinetixDiffLineKind { equal, add, remove }

class KinetixDiffLine {
  const KinetixDiffLine({required this.kind, this.oldLine, this.newLine, required this.text});

  final KinetixDiffLineKind kind;
  final int? oldLine;
  final int? newLine;
  final String text;
}

enum KinetixDiffMode { unified, split }

/// Line-based LCS diff — the same longest-common-subsequence backtrack
/// `git diff`'s line mode is built on, hand-rolled rather than pulled from
/// a package so it behaves identically to `computeLineDiff` in
/// `packages/ui/src/components/diff-viewer.tsx`. O(n·m) time and space —
/// fine for a config file or a token snapshot, not multi-thousand-line
/// files.
List<KinetixDiffLine> kinetixComputeLineDiff(String oldText, String newText) {
  final oldLines = oldText.split('\n');
  final newLines = newText.split('\n');
  final n = oldLines.length;
  final m = newLines.length;

  final dp = List.generate(n + 1, (_) => List.filled(m + 1, 0));
  for (var i = n - 1; i >= 0; i--) {
    for (var j = m - 1; j >= 0; j--) {
      dp[i][j] = oldLines[i] == newLines[j] ? dp[i + 1][j + 1] + 1 : (dp[i + 1][j] > dp[i][j + 1] ? dp[i + 1][j] : dp[i][j + 1]);
    }
  }

  final ops = <KinetixDiffLine>[];
  var i = 0;
  var j = 0;
  while (i < n && j < m) {
    if (oldLines[i] == newLines[j]) {
      ops.add(KinetixDiffLine(kind: KinetixDiffLineKind.equal, oldLine: i + 1, newLine: j + 1, text: oldLines[i]));
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.add(KinetixDiffLine(kind: KinetixDiffLineKind.remove, oldLine: i + 1, text: oldLines[i]));
      i++;
    } else {
      ops.add(KinetixDiffLine(kind: KinetixDiffLineKind.add, newLine: j + 1, text: newLines[j]));
      j++;
    }
  }
  while (i < n) {
    ops.add(KinetixDiffLine(kind: KinetixDiffLineKind.remove, oldLine: i + 1, text: oldLines[i]));
    i++;
  }
  while (j < m) {
    ops.add(KinetixDiffLine(kind: KinetixDiffLineKind.add, newLine: j + 1, text: newLines[j]));
    j++;
  }
  return ops;
}

/// Mirrors `packages/ui/src/components/diff-viewer.tsx`. [KinetixDiffMode.split]
/// doesn't pair adjacent remove/add runs onto the same row the way GitHub's
/// split view does — each op renders in its own column, blank on the other
/// side, same simplification as the web version.
class KinetixDiffViewer extends StatelessWidget {
  const KinetixDiffViewer({
    super.key,
    required this.oldText,
    required this.newText,
    this.mode = KinetixDiffMode.unified,
    this.oldLabel = 'Before',
    this.newLabel = 'After',
  });

  final String oldText;
  final String newText;
  final KinetixDiffMode mode;
  final String oldLabel;
  final String newLabel;

  TextStyle _mono(Color color) => TextStyle(fontFamily: 'monospace', fontSize: 11, color: color);

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final ops = kinetixComputeLineDiff(oldText, newText);

    return DecoratedBox(
      decoration: BoxDecoration(border: Border.all(color: c.border), borderRadius: BorderRadius.circular(8)),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (mode == KinetixDiffMode.split)
                ColoredBox(
                  color: c.muted,
                  child: Row(
                    children: [
                      Expanded(child: Padding(padding: const EdgeInsets.all(4), child: Text(oldLabel, style: _mono(c.mutedForeground)))),
                      Expanded(child: Padding(padding: const EdgeInsets.all(4), child: Text(newLabel, style: _mono(c.mutedForeground)))),
                    ],
                  ),
                ),
              for (final op in ops) mode == KinetixDiffMode.unified ? _unifiedRow(c, op) : _splitRow(c, op),
            ],
          ),
        ),
      ),
    );
  }

  Widget _unifiedRow(KinetixColors c, KinetixDiffLine op) {
    final background = switch (op.kind) {
      KinetixDiffLineKind.add => c.success.withValues(alpha: 0.1),
      KinetixDiffLineKind.remove => c.destructive.withValues(alpha: 0.1),
      KinetixDiffLineKind.equal => Colors.transparent,
    };
    final markerColor = switch (op.kind) {
      KinetixDiffLineKind.add => c.success,
      KinetixDiffLineKind.remove => c.destructive,
      KinetixDiffLineKind.equal => c.foreground,
    };
    final marker = switch (op.kind) {
      KinetixDiffLineKind.add => '+',
      KinetixDiffLineKind.remove => '−',
      KinetixDiffLineKind.equal => '',
    };
    return ColoredBox(
      color: background,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(width: 28, child: Text(op.oldLine?.toString() ?? '', textAlign: TextAlign.right, style: _mono(c.mutedForeground))),
          SizedBox(width: 28, child: Text(op.newLine?.toString() ?? '', textAlign: TextAlign.right, style: _mono(c.mutedForeground))),
          SizedBox(width: 14, child: Text(marker, style: _mono(markerColor))),
          Text(op.text, style: _mono(c.foreground)),
        ],
      ),
    );
  }

  Widget _splitRow(KinetixColors c, KinetixDiffLine op) {
    return Row(
      children: [
        Expanded(
          child: ColoredBox(
            color: op.kind == KinetixDiffLineKind.remove ? c.destructive.withValues(alpha: 0.1) : Colors.transparent,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(width: 28, child: Text(op.oldLine?.toString() ?? '', textAlign: TextAlign.right, style: _mono(c.mutedForeground))),
                Text(op.kind != KinetixDiffLineKind.add ? op.text : '', style: _mono(c.foreground)),
              ],
            ),
          ),
        ),
        Expanded(
          child: ColoredBox(
            color: op.kind == KinetixDiffLineKind.add ? c.success.withValues(alpha: 0.1) : Colors.transparent,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox(width: 28, child: Text(op.newLine?.toString() ?? '', textAlign: TextAlign.right, style: _mono(c.mutedForeground))),
                Text(op.kind != KinetixDiffLineKind.remove ? op.text : '', style: _mono(c.foreground)),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

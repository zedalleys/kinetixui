import 'package:flutter/material.dart';

import 'app_text.dart';
import 'theme.dart';

enum KinetixFileStatus { pending, uploading, done, error }

class KinetixFileItem {
  const KinetixFileItem({required this.name, this.status = KinetixFileStatus.pending, this.detail});

  final String name;
  final KinetixFileStatus status;
  final String? detail;
}

/// Mirrors `packages/ui/src/components/file-upload.tsx`. Presentational
/// only (same as the source and the other ports): it reports "browse"
/// intent via `onBrowse` and renders whatever `files` you hand back. The
/// drop zone is a large tap target — wire `onBrowse` to a file-picker
/// plugin yourself.
class KinetixFileUpload extends StatelessWidget {
  const KinetixFileUpload({
    super.key,
    this.files = const [],
    this.prompt = 'Tap to choose files',
    required this.onBrowse,
    this.onRemove,
  });

  final List<KinetixFileItem> files;
  final String prompt;
  final VoidCallback onBrowse;
  final void Function(KinetixFileItem item)? onRemove;

  IconData _icon(KinetixFileStatus s) => switch (s) {
        KinetixFileStatus.pending => Icons.insert_drive_file_outlined,
        KinetixFileStatus.uploading => Icons.upload_outlined,
        KinetixFileStatus.done => Icons.check_circle_outline,
        KinetixFileStatus.error => Icons.error_outline,
      };

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onBrowse,
          child: DottedBorderBox(
            color: c.border,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: Column(
                children: [
                  Icon(Icons.upload_file_outlined, size: 28, color: c.mutedForeground),
                  const SizedBox(height: 8),
                  Text(prompt, style: AppText.bodyMd.copyWith(color: c.mutedForeground)),
                ],
              ),
            ),
          ),
        ),
        for (final file in files) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: c.background,
              borderRadius: BorderRadius.circular(6),
              border: Border.all(color: c.border, width: 1),
            ),
            child: Row(
              children: [
                Icon(
                  _icon(file.status),
                  size: 16,
                  color: switch (file.status) {
                    KinetixFileStatus.done => c.success,
                    KinetixFileStatus.error => c.destructive,
                    _ => c.mutedForeground,
                  },
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        file.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: AppText.bodyMd.copyWith(color: c.foreground),
                      ),
                      if (file.detail != null)
                        Text(file.detail!, style: AppText.bodySm.copyWith(color: c.mutedForeground)),
                    ],
                  ),
                ),
                if (onRemove != null)
                  GestureDetector(
                    onTap: () => onRemove!(file),
                    child: Icon(Icons.close, size: 12, color: c.mutedForeground),
                  ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// A 1px dashed rounded border box (Flutter has no dashed `Border`).
class DottedBorderBox extends StatelessWidget {
  const DottedBorderBox({super.key, required this.color, required this.child});

  final Color color;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _DashedRectPainter(color),
      child: SizedBox(width: double.infinity, child: child),
    );
  }
}

class _DashedRectPainter extends CustomPainter {
  _DashedRectPainter(this.color);

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final rrect = RRect.fromRectAndRadius(
      Offset.zero & size,
      const Radius.circular(8),
    );
    final path = Path()..addRRect(rrect);
    const double dash = 6;
    const double gap = 4;
    for (final metric in path.computeMetrics()) {
      double distance = 0;
      while (distance < metric.length) {
        canvas.drawPath(
          metric.extractPath(distance, distance + dash),
          paint,
        );
        distance += dash + gap;
      }
    }
  }

  @override
  bool shouldRepaint(_DashedRectPainter oldDelegate) => oldDelegate.color != color;
}

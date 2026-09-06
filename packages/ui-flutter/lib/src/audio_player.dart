import 'package:flutter/material.dart';

import 'slider.dart';
import 'app_text.dart';
import 'theme.dart';

enum KinetixAudioPlayerVariant { full, mini }

String _time(double seconds) {
  final t = seconds < 0 ? 0 : seconds.floor();
  final m = t ~/ 60;
  final s = (t % 60).toString().padLeft(2, '0');
  return '$m:$s';
}

/// Mirrors `packages/ui/src/components/audio-player.tsx` (`variant .full /
/// .mini` transport UI). Presentational only — same call the other ports
/// made: playback is the caller's (wired to `isPlaying` / `position` /
/// `duration` in, `onPlayPause` / `onSeek` / `onSkip` / `onPrev` /
/// `onNext` out). The scrubber reuses [KinetixSlider].
class KinetixAudioPlayer extends StatelessWidget {
  const KinetixAudioPlayer({
    super.key,
    required this.title,
    this.subtitle,
    required this.isPlaying,
    required this.position,
    required this.duration,
    this.variant = KinetixAudioPlayerVariant.full,
    required this.onPlayPause,
    this.onSeek,
    this.onSkip,
    this.onPrev,
    this.onNext,
  });

  final String title;
  final String? subtitle;
  final bool isPlaying;
  final double position;
  final double duration;
  final KinetixAudioPlayerVariant variant;
  final VoidCallback onPlayPause;
  final ValueChanged<double>? onSeek;
  final void Function(double deltaSeconds)? onSkip;
  final VoidCallback? onPrev;
  final VoidCallback? onNext;

  Widget _iconButton(BuildContext context, IconData icon, double size, VoidCallback onTap) {
    final c = KinetixTheme.of(context);
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Icon(icon, size: size, color: c.foreground),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final scrubber = KinetixSlider(
      value: position,
      max: duration <= 0 ? 0.01 : duration,
      onChanged: onSeek,
    );

    if (variant == KinetixAudioPlayerVariant.mini) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: c.background,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: c.border, width: 1),
        ),
        child: Row(
          children: [
            _iconButton(context, isPlaying ? Icons.pause : Icons.play_arrow, 16, onPlayPause),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: c.foreground),
                  ),
                  scrubber,
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: c.background,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: c.border, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(title, style: AppText.labelLg.copyWith(color: c.foreground)),
          if (subtitle != null)
            Text(subtitle!, style: TextStyle(fontSize: 13, color: c.mutedForeground)),
          const SizedBox(height: 8),
          scrubber,
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(_time(position), style: AppText.bodySm.copyWith(color: c.mutedForeground)),
              Text(_time(duration), style: AppText.bodySm.copyWith(color: c.mutedForeground)),
            ],
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (onPrev != null) _iconButton(context, Icons.skip_previous, 20, onPrev!),
              _iconButton(context, Icons.replay_10, 20, () => onSkip?.call(-10)),
              _iconButton(context, isPlaying ? Icons.pause : Icons.play_arrow, 28, onPlayPause),
              _iconButton(context, Icons.forward_10, 20, () => onSkip?.call(10)),
              if (onNext != null) _iconButton(context, Icons.skip_next, 20, onNext!),
            ],
          ),
        ],
      ),
    );
  }
}

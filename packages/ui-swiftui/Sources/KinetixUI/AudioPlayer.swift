//
// AudioPlayer.swift — KinetixAudioPlayer.
//
// Mirrors packages/ui/src/components/audio-player.tsx (`variant .full /
// .mini` transport UI over a native `<audio>`). Presentational only —
// same call the Compose port made: playback is the caller's (wired to
// `isPlaying` / `position` / `duration` in, `onPlayPause` / `onSkip` /
// `onPrev` / `onNext` out), no media framework is pulled in. The scrubber
// reuses KinetixSlider. Transport glyphs are SF Symbols.
//

import SwiftUI

public enum KinetixAudioPlayerVariant {
    case full, mini
}

public struct KinetixAudioPlayer: View {
    @Environment(\.kinetixColors) private var colors

    private let title: String
    private let subtitle: String?
    private let isPlaying: Bool
    @Binding private var position: Double
    private let duration: Double
    private let variant: KinetixAudioPlayerVariant
    private let onPlayPause: () -> Void
    private let onSkip: (Double) -> Void
    private let onPrev: (() -> Void)?
    private let onNext: (() -> Void)?

    public init(
        title: String,
        subtitle: String? = nil,
        isPlaying: Bool,
        position: Binding<Double>,
        duration: Double,
        variant: KinetixAudioPlayerVariant = .full,
        onPlayPause: @escaping () -> Void,
        onSkip: @escaping (Double) -> Void = { _ in },
        onPrev: (() -> Void)? = nil,
        onNext: (() -> Void)? = nil
    ) {
        self.title = title
        self.subtitle = subtitle
        self.isPlaying = isPlaying
        self._position = position
        self.duration = duration
        self.variant = variant
        self.onPlayPause = onPlayPause
        self.onSkip = onSkip
        self.onPrev = onPrev
        self.onNext = onNext
    }

    private func timeLabel(_ seconds: Double) -> String {
        let t = Int(max(0, seconds))
        return String(format: "%d:%02d", t / 60, t % 60)
    }

    @ViewBuilder
    private func iconButton(_ symbol: String, size: CGFloat, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: size))
                .foregroundStyle(colors.foreground)
                .frame(width: size + 16, height: size + 16)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    public var body: some View {
        switch variant {
        case .full:
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(colors.foreground)
                    if let subtitle {
                        Text(subtitle)
                            .font(.system(size: 13))
                            .foregroundStyle(colors.mutedForeground)
                    }
                }
                KinetixSlider(value: $position, in: 0...max(duration, 0.01))
                HStack {
                    Text(timeLabel(position))
                    Spacer()
                    Text(timeLabel(duration))
                }
                .font(.system(size: 12))
                .foregroundStyle(colors.mutedForeground)
                HStack(spacing: 4) {
                    Spacer()
                    if let onPrev { iconButton("backward.fill", size: 16, action: onPrev) }
                    iconButton("gobackward.10", size: 16) { onSkip(-10) }
                    iconButton(isPlaying ? "pause.fill" : "play.fill", size: 22, action: onPlayPause)
                    iconButton("goforward.10", size: 16) { onSkip(10) }
                    if let onNext { iconButton("forward.fill", size: 16, action: onNext) }
                    Spacer()
                }
            }
            .padding(16)
            .background(colors.background, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .strokeBorder(colors.border, lineWidth: 1)
            }

        case .mini:
            HStack(spacing: 8) {
                iconButton(isPlaying ? "pause.fill" : "play.fill", size: 16, action: onPlayPause)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(colors.foreground)
                        .lineLimit(1)
                    KinetixSlider(value: $position, in: 0...max(duration, 0.01))
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(colors.background, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .strokeBorder(colors.border, lineWidth: 1)
            }
        }
    }
}

//
// MessageBubble.swift — KinetixMessageBubble / KinetixTypingIndicator.
//
// Mirrors packages/ui/src/components/message-bubble.tsx: a sent/received
// chat bubble with grouping, timestamp, and a status tick, plus a typing
// indicator. `grouped` uses a uniform (not single-corner) radius
// reduction as its consecutive-run cue — `UnevenRoundedRectangle`'s exact
// OS-version floor isn't certain enough to rely on without a local
// toolchain to verify against this package's iOS 16.0 floor, so this is
// a documented, simpler fallback rather than the web/Compose ports'
// precise single-corner treatment. SF Symbols give a real checkmark
// glyph, but no "double checkmark" one exists, so delivered/read use two
// plain "✓" characters, matching the web/Compose "✓✓" convention.
//

import SwiftUI

public enum KinetixMessageVariant {
    case sent, received
}

public enum KinetixMessageStatus {
    case sent, delivered, read
}

public struct KinetixMessageBubble<Avatar: View>: View {
    @Environment(\.kinetixColors) private var colors

    private let text: String
    private let variant: KinetixMessageVariant
    private let timestamp: String?
    private let status: KinetixMessageStatus?
    private let grouped: Bool
    private let avatar: Avatar

    public init(
        _ text: String,
        variant: KinetixMessageVariant = .received,
        timestamp: String? = nil,
        status: KinetixMessageStatus? = nil,
        grouped: Bool = false,
        @ViewBuilder avatar: () -> Avatar = { EmptyView() }
    ) {
        self.text = text
        self.variant = variant
        self.timestamp = timestamp
        self.status = status
        self.grouped = grouped
        self.avatar = avatar()
    }

    private var sent: Bool { variant == .sent }

    public var body: some View {
        HStack(alignment: .bottom, spacing: 8) { // spacing/2
            if !sent {
                avatar
            } else {
                Spacer(minLength: 40)
            }

            VStack(alignment: sent ? .trailing : .leading, spacing: 4) {
                Text(text)
                    .font(.kinetixBodySm)
                    .foregroundStyle(sent ? colors.actionForeground : colors.foreground)
                    .padding(.horizontal, 14) // px-3.5, off-scale — same call as KinetixBadge
                    .padding(.vertical, 8) // spacing/2
                    .background(
                        sent ? colors.action : colors.muted,
                        in: RoundedRectangle(cornerRadius: grouped ? 10 : 16, style: .continuous)
                    )
                    .frame(maxWidth: 280, alignment: sent ? .trailing : .leading)

                if timestamp != nil || (sent && status != nil) {
                    HStack(spacing: 4) {
                        if let timestamp {
                            Text(timestamp).font(.kinetixLabelSm).foregroundStyle(colors.mutedForeground)
                        }
                        if sent, let status {
                            Text(status == .sent ? "✓" : "✓✓")
                                .font(.kinetixLabelSm)
                                .foregroundStyle(status == .read ? colors.action : colors.mutedForeground)
                        }
                    }
                    .padding(.horizontal, 4)
                }
            }

            if !sent {
                Spacer(minLength: 40)
            }
        }
    }
}

public struct KinetixTypingIndicator: View {
    @Environment(\.kinetixColors) private var colors
    @State private var animate = false

    public init() {}

    public var body: some View {
        HStack(spacing: 4) { // spacing/1
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .fill(colors.mutedForeground)
                    .frame(width: 6, height: 6)
                    .offset(y: animate ? -3 : 0)
                    .animation(
                        .easeInOut(duration: 0.6).repeatForever(autoreverses: true).delay(Double(i) * 0.15),
                        value: animate
                    )
            }
        }
        .padding(.horizontal, 14) // px-3.5, off-scale
        .padding(.vertical, 10) // spacing/2.5, off-scale
        .background(colors.muted, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .onAppear { animate = true }
    }
}

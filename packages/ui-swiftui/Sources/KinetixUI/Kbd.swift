//
// Kbd.swift — KinetixKbd / KinetixKbdGroup.
//
// Mirrors packages/ui/src/components/kbd.tsx. A single keyboard key glyph;
// wrap several in KinetixKbdGroup for a shortcut combo. Gap-fill addition
// (not in the original Figma source) — matches the shadcn/ui Kbd/KbdGroup
// API shape.
//

import SwiftUI

public struct KinetixKbd: View {
    @Environment(\.kinetixColors) private var colors

    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.kinetixLabelSm)
            .foregroundStyle(colors.mutedForeground)
            .frame(minWidth: 20, minHeight: 20)
            // Figma has no 1.5x spacing step (6pt) — px-1.5 mirrored
            // literally, same "off-scale, documented" call as KinetixBadge.
            .padding(.horizontal, 6)
            .background(colors.muted, in: RoundedRectangle(cornerRadius: 4, style: .continuous)) // radius/sm
            .overlay {
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .strokeBorder(colors.border, lineWidth: 1)
            }
    }
}

/// Lays out multiple `KinetixKbd` for a shortcut combo.
public struct KinetixKbdGroup<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 4) { // spacing/1
            content
        }
    }
}

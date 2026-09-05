//
// Accordion.swift — KinetixAccordion family.
//
// Mirrors packages/ui/src/components/accordion.tsx. Radix's Root / Item
// carry no styling here beyond `border-b` (a bottom rule on each item).
// Expand/collapse state is caller-owned — `isExpanded` passed straight
// through, no Root/Trigger/Content graph to reassemble (same call as the
// Compose port and KinetixCollapsible). Chevron is the `chevron.down` SF
// Symbol, rotated 180° when open.
//

import SwiftUI

public struct KinetixAccordion<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(spacing: 0) { content }
    }
}

public struct KinetixAccordionItem<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(spacing: 0) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(alignment: .bottom) {
                Rectangle().fill(colors.border).frame(height: 1) // border-b
            }
    }
}

public struct KinetixAccordionTrigger: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String
    private let isExpanded: Bool
    private let action: () -> Void

    public init(_ text: String, isExpanded: Bool, action: @escaping () -> Void) {
        self.text = text
        self.isExpanded = isExpanded
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack {
                Text(text)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(colors.foreground)
                Spacer(minLength: 8)
                Image(systemName: "chevron.down")
                    .font(.system(size: 14))
                    .foregroundStyle(colors.mutedForeground)
                    .rotationEffect(.degrees(isExpanded ? 180 : 0))
            }
            .padding(.vertical, 16) // py-4
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .animation(.easeInOut(duration: 0.2), value: isExpanded)
    }
}

public struct KinetixAccordionContent<Content: View>: View {
    private let isExpanded: Bool
    private let content: Content

    public init(isExpanded: Bool, @ViewBuilder content: () -> Content) {
        self.isExpanded = isExpanded
        self.content = content()
    }

    public var body: some View {
        if isExpanded {
            VStack(alignment: .leading, spacing: 0) { content }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.bottom, 16) // pb-4
                .transition(.opacity.combined(with: .move(edge: .top)))
        }
    }
}

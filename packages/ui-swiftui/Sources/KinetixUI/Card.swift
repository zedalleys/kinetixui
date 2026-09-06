//
// Card.swift — KinetixCard family.
//
// Mirrors packages/ui/src/components/card.tsx's Card / CardHeader /
// CardTitle / CardDescription / CardContent / CardFooter — thin styled
// slots around a `content` view, same as the React version's plain
// `<div>`s. `p-6` (24) and `radius-xl` (16) are on the shared token
// scale; the `space-y-1.5` header gap (6) isn't — literal, same
// reasoning as KinetixBadge's padding. `shadow-sm` has no token in this
// package (no elevation scale yet) — a small literal shadow, matching the
// Compose port's call.
//

import SwiftUI

public struct KinetixCard<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .foregroundStyle(colors.cardForeground) // cascades to Text descendants
            .background(colors.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(colors.border, lineWidth: 1)
            }
            .shadow(color: .black.opacity(0.05), radius: 2, y: 1) // shadow-sm approx
    }
}

public struct KinetixCardHeader<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 6) { content }
            .padding(24)
    }
}

public struct KinetixCardTitle: View {
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.kinetixTitleMd.weight(.semibold))
            .tracking(-0.4) // tracking-tight
    }
}

public struct KinetixCardDescription: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.kinetixBody)
            .foregroundStyle(colors.mutedForeground)
    }
}

public struct KinetixCardContent<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) { content }
            .padding([.horizontal, .bottom], 24) // p-6 pt-0
    }
}

public struct KinetixCardFooter<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 8) { content }
            .padding([.horizontal, .bottom], 24) // p-6 pt-0
    }
}

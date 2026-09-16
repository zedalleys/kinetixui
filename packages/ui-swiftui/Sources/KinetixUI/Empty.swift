//
// Empty.swift — KinetixEmpty family.
//
// Mirrors packages/ui/src/components/empty.tsx. A placeholder for a
// zero-results state — thin styled slots around a `content` view, same
// "no fixed schema" approach as KinetixCard. KinetixEmpty itself carries
// no border/background (composes cleanly inside whatever already has
// one). Gap-fill addition (not in the original Figma source) — matches
// the shadcn/ui Empty API shape.
//

import SwiftUI

public struct KinetixEmpty<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(spacing: 24) { content } // spacing/6
            .padding(40) // p-10, not on the shared spacing scale
            .frame(maxWidth: .infinity)
            .multilineTextAlignment(.center)
    }
}

public struct KinetixEmptyHeader<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(spacing: 8) { content } // spacing/2
    }
}

public enum KinetixEmptyMediaVariant {
    case `default`, icon
}

public struct KinetixEmptyMedia<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let variant: KinetixEmptyMediaVariant
    private let content: Content

    public init(variant: KinetixEmptyMediaVariant = .default, @ViewBuilder content: () -> Content) {
        self.variant = variant
        self.content = content()
    }

    public var body: some View {
        if variant == .icon {
            content
                .foregroundStyle(colors.mutedForeground)
                .padding(8) // spacing/2
                .background(colors.muted, in: Circle())
        } else {
            content
        }
    }
}

public struct KinetixEmptyTitle: View {
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.kinetixTitleSm.weight(.medium))
            .tracking(0.1)
    }
}

public struct KinetixEmptyDescription: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.kinetixBodySm)
            .foregroundStyle(colors.mutedForeground)
    }
}

public struct KinetixEmptyContent<Content: View>: View {
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        VStack(spacing: 12) { content } // spacing/3
    }
}

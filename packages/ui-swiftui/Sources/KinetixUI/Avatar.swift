//
// Avatar.swift — KinetixAvatar / KinetixAvatarFallback.
//
// Mirror packages/ui/src/components/avatar.tsx's `Avatar` /
// `AvatarFallback` (`size-10 rounded-full` container, `bg-muted text-sm`
// fallback). 40 is a fixed Figma size, off the shared spacing scale.
//
// `AvatarImage` isn't ported — it's a bare `<img>` with no design-
// specific styling; pass `Image(…).resizable().scaledToFill()` into the
// `content` slot. `AvatarGroup` isn't ported either (it re-wraps its
// children, not idiomatic in SwiftUI) — compose it directly:
// `HStack(spacing: -8) { KinetixAvatar { … } }`, same call as the
// Compose port.
//

import SwiftUI

public struct KinetixAvatar<Content: View>: View {
    private let size: CGFloat
    private let content: Content

    public init(size: CGFloat = 40, @ViewBuilder content: () -> Content) {
        self.size = size
        self.content = content()
    }

    public var body: some View {
        content
            .frame(width: size, height: size)
            .clipShape(Circle())
    }
}

public struct KinetixAvatarFallback: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        colors.muted
            .overlay {
                Text(text)
                    .font(.kinetixBody)
                    .foregroundStyle(colors.mutedForeground)
            }
    }
}

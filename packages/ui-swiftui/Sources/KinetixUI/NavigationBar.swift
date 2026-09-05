//
// NavigationBar.swift — KinetixNavigationBar.
//
// Mirrors packages/ui/src/components/navigation-bar.tsx: a mobile top app
// bar — leading slot, title with optional info text, trailing actions.
// The React `onBack` shortcut becomes `KinetixNavigationBackButton`,
// placed in the `leading` slot (avoids a leading-vs-onBack branch).
//

import SwiftUI

public struct KinetixNavigationBar<Leading: View, Actions: View>: View {
    @Environment(\.kinetixColors) private var colors

    private let title: String
    private let infoText: String?
    private let leading: Leading
    private let actions: Actions

    public init(
        title: String,
        infoText: String? = nil,
        @ViewBuilder leading: () -> Leading,
        @ViewBuilder actions: () -> Actions
    ) {
        self.title = title
        self.infoText = infoText
        self.leading = leading()
        self.actions = actions()
    }

    public var body: some View {
        HStack(spacing: 8) {
            leading
                .frame(minWidth: 36, alignment: .leading)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(colors.foreground)
                    .lineLimit(1)
                if let infoText {
                    Text(infoText)
                        .font(.system(size: 13))
                        .foregroundStyle(colors.mutedForeground)
                        .lineLimit(1)
                }
            }
            Spacer(minLength: 0)
            actions
        }
        .padding(.horizontal, 8)
        .frame(height: 56) // h-14
        .frame(maxWidth: .infinity)
        .background(colors.background)
        .overlay(alignment: .bottom) {
            Rectangle().fill(colors.border).frame(height: 1) // border-b
        }
    }
}

public extension KinetixNavigationBar where Leading == EmptyView {
    init(title: String, infoText: String? = nil, @ViewBuilder actions: () -> Actions) {
        self.init(title: title, infoText: infoText, leading: { EmptyView() }, actions: actions)
    }
}

public extension KinetixNavigationBar where Leading == EmptyView, Actions == EmptyView {
    init(title: String, infoText: String? = nil) {
        self.init(title: title, infoText: infoText, leading: { EmptyView() }, actions: { EmptyView() })
    }
}

public struct KinetixNavigationBackButton: View {
    @Environment(\.kinetixColors) private var colors
    private let action: () -> Void

    public init(action: @escaping () -> Void) {
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Image(systemName: "chevron.left")
                .font(.system(size: 18))
                .foregroundStyle(colors.foreground)
                .frame(width: 36, height: 36)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Back")
    }
}

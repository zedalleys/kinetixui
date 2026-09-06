//
// Command.swift — KinetixCommandDialog family.
//
// Mirrors packages/ui/src/components/command.tsx (a themed wrapper over
// `cmdk` shown inside a Dialog). Composes KinetixDialog directly. cmdk's
// fuzzy client-side filtering isn't reimplemented — the caller filters
// its own items against `query` and this renders whatever list results
// (same deliberately simplified scope as the Compose port).
// KinetixCommandSeparator is KinetixSeparator.
//

import SwiftUI

public struct KinetixCommandDialog<Content: View>: View {
    @Environment(\.kinetixColors) private var colors

    @Binding private var isPresented: Bool
    @Binding private var query: String
    private let placeholder: String
    private let content: Content

    public init(
        isPresented: Binding<Bool>,
        query: Binding<String>,
        placeholder: String = "Type a command or search…",
        @ViewBuilder content: () -> Content
    ) {
        self._isPresented = isPresented
        self._query = query
        self.placeholder = placeholder
        self.content = content()
    }

    public var body: some View {
        KinetixDialog(isPresented: $isPresented) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(colors.mutedForeground)
                    TextField(placeholder, text: $query)
                        .textFieldStyle(.plain)
                        .font(.kinetixBody)
                        .foregroundStyle(colors.foreground)
                }
                .padding(.vertical, 12)

                KinetixSeparator()

                ScrollView {
                    VStack(alignment: .leading, spacing: 2) { content }
                        .padding(.vertical, 8)
                }
                .frame(maxHeight: 320)
            }
        }
    }
}

public struct KinetixCommandGroup<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let heading: String
    private let content: Content

    public init(_ heading: String, @ViewBuilder content: () -> Content) {
        self.heading = heading
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(heading)
                .font(.kinetixLabelSm)
                .foregroundStyle(colors.mutedForeground)
                .padding(.horizontal, 8)
                .padding(.top, 4)
            content
        }
    }
}

public struct KinetixCommandItem: View {
    @Environment(\.kinetixColors) private var colors
    private let title: String
    private let systemImage: String?
    private let action: () -> Void

    public init(_ title: String, systemImage: String? = nil, action: @escaping () -> Void) {
        self.title = title
        self.systemImage = systemImage
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if let systemImage {
                    Image(systemName: systemImage)
                        .foregroundStyle(colors.mutedForeground)
                        .frame(width: 16)
                }
                Text(title)
                    .font(.kinetixBody)
                    .foregroundStyle(colors.foreground)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 8)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

public typealias KinetixCommandSeparator = KinetixSeparator

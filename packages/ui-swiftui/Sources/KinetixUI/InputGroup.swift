//
// InputGroup.swift — KinetixInputGroup family.
//
// Mirrors packages/ui/src/components/input-group.tsx: one bordered shell
// hosting an input plus fixed add-ons (icon, text, button) on either
// side. Place `KinetixInputGroupText` / `KinetixInputGroupAddon` /
// `KinetixInputGroupInput` / `KinetixInputGroupButton` in order inside
// `KinetixInputGroup`.
//

import SwiftUI

public enum KinetixInputGroupAddonAlign {
    case start, end
}

public struct KinetixInputGroup<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 0) { content }
            .frame(maxWidth: .infinity)
            .background(colors.background)
            .overlay {
                RoundedRectangle(cornerRadius: 4, style: .continuous) // radius/sm
                    .strokeBorder(colors.input, lineWidth: 1)
            }
            .clipShape(RoundedRectangle(cornerRadius: 4, style: .continuous))
    }
}

public struct KinetixInputGroupInput: View {
    @Environment(\.kinetixColors) private var colors
    @Binding private var text: String
    private let placeholder: String
    private let isSecure: Bool

    public init(text: Binding<String>, placeholder: String = "", isSecure: Bool = false) {
        self._text = text
        self.placeholder = placeholder
        self.isSecure = isSecure
    }

    @ViewBuilder
    private var field: some View {
        if isSecure {
            SecureField(placeholder, text: $text)
        } else {
            TextField(placeholder, text: $text)
        }
    }

    public var body: some View {
        field
            .textFieldStyle(.plain)
            .font(.system(size: 14))
            .foregroundStyle(colors.foreground)
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
    }
}

public struct KinetixInputGroupText: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.system(size: 14))
            .foregroundStyle(colors.mutedForeground)
            .padding(.horizontal, 12)
            .fixedSize(horizontal: true, vertical: false)
    }
}

public struct KinetixInputGroupAddon<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let align: KinetixInputGroupAddonAlign
    private let content: Content

    public init(align: KinetixInputGroupAddonAlign = .start, @ViewBuilder content: () -> Content) {
        self.align = align
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 8) { content }
            .foregroundStyle(colors.mutedForeground)
            .padding(.leading, align == .start ? 12 : 0)
            .padding(.trailing, align == .end ? 12 : 0)
    }
}

public struct KinetixInputGroupButton: View {
    @Environment(\.kinetixColors) private var colors
    private let title: String
    private let action: () -> Void

    public init(_ title: String, action: @escaping () -> Void) {
        self.title = title
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Text(title)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(colors.foreground)
                .padding(.horizontal, 12)
                .frame(maxHeight: .infinity)
                .background(colors.muted)
                .overlay(alignment: .leading) {
                    Rectangle().fill(colors.input).frame(width: 1)
                }
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

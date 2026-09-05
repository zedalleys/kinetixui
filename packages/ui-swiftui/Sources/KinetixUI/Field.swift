//
// Field.swift — KinetixField family.
//
// Mirrors packages/ui/src/components/field.tsx's label + control +
// description + feedback composition. The React version threads an
// `invalid` flag through React Context; here a custom EnvironmentKey
// plays the same role — KinetixFieldLabel / KinetixFieldMessage read it
// rather than taking it as a parameter (same call as the Compose port's
// `compositionLocalOf`). The `id` / `aria-describedby` wiring and the
// `Slot`-based `FieldControl` injection aren't ported (no SwiftUI
// equivalent) — place your control (KinetixInput, …) directly in the
// `content` slot. Message icons are SF Symbols.
//

import SwiftUI

private struct KinetixFieldInvalidKey: EnvironmentKey {
    static let defaultValue = false
}

extension EnvironmentValues {
    var kinetixFieldInvalid: Bool {
        get { self[KinetixFieldInvalidKey.self] }
        set { self[KinetixFieldInvalidKey.self] = newValue }
    }
}

public struct KinetixField<Content: View>: View {
    private let invalid: Bool
    private let content: Content

    public init(invalid: Bool = false, @ViewBuilder content: () -> Content) {
        self.invalid = invalid
        self.content = content()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 6) { content } // gap-1.5
            .environment(\.kinetixFieldInvalid, invalid)
    }
}

public struct KinetixFieldLabel: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.kinetixFieldInvalid) private var invalid
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        KinetixLabel(text, color: invalid ? colors.destructive : nil)
    }
}

public struct KinetixFieldDescription: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.system(size: 13)) // body-sm
            .foregroundStyle(colors.mutedForeground)
    }
}

public enum KinetixFieldMessageIntent {
    case error, warning, success, info
}

public struct KinetixFieldMessage: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String
    private let intent: KinetixFieldMessageIntent
    private let hideIcon: Bool

    public init(_ text: String, intent: KinetixFieldMessageIntent = .error, hideIcon: Bool = false) {
        self.text = text
        self.intent = intent
        self.hideIcon = hideIcon
    }

    private var color: Color {
        switch intent {
        case .error:   return colors.destructive
        case .warning: return colors.warning
        case .success: return colors.success
        case .info:    return colors.info
        }
    }

    private var symbol: String {
        switch intent {
        case .error:   return "exclamationmark.circle"
        case .warning: return "exclamationmark.triangle"
        case .success: return "checkmark.circle"
        case .info:    return "info.circle"
        }
    }

    public var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            if !hideIcon {
                Image(systemName: symbol).font(.system(size: 13))
            }
            Text(text).font(.system(size: 13))
        }
        .foregroundStyle(color)
    }
}

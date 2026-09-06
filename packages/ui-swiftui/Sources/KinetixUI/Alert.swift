//
// Alert.swift — KinetixAlert / KinetixAlertTitle / KinetixAlertDescription.
//
// Mirror packages/ui/src/components/alert.tsx (`alertVariants`). Every
// variant but `.default` uses a 50%-alpha border
// (`border-destructive/50`, …) — reproduced with `Color.opacity(0.5)`.
// Text colour cascades from KinetixAlert to the title/description via
// `.foregroundStyle`, the same inheritance the web `text-{variant}` uses,
// so those don't take a `variant` of their own. The leading-icon slot
// isn't ported — no icon set is wired in yet (same call as the Compose
// port and KinetixTag's glyph).
//

import SwiftUI

public enum KinetixAlertVariant {
    case `default`, destructive, success, warning, info
}

public struct KinetixAlert<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let variant: KinetixAlertVariant
    private let content: Content

    public init(variant: KinetixAlertVariant = .default, @ViewBuilder content: () -> Content) {
        self.variant = variant
        self.content = content()
    }

    private var palette: (border: Color, fg: Color) {
        switch variant {
        case .default:     return (colors.border, colors.foreground)
        case .destructive: return (colors.destructive.opacity(0.5), colors.destructive)
        case .success:     return (colors.success.opacity(0.5), colors.success)
        case .warning:     return (colors.warning.opacity(0.5), colors.warning)
        case .info:        return (colors.info.opacity(0.5), colors.info)
        }
    }

    public var body: some View {
        let p = palette
        VStack(alignment: .leading, spacing: 4) { content }
            .frame(maxWidth: .infinity, alignment: .leading)
            .foregroundStyle(p.fg) // cascades to Title / Description
            .padding(.horizontal, 16) // spacing/4
            .padding(.vertical, 12)   // spacing/3
            .background(colors.background, in: RoundedRectangle(cornerRadius: 12, style: .continuous)) // radius/lg
            .overlay {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(p.border, lineWidth: 1)
            }
            .accessibilityElement(children: .combine)
    }
}

public struct KinetixAlertTitle: View {
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.kinetixLabelLg)
            .tracking(-0.4) // tracking-tight
            .padding(.bottom, 4)
    }
}

public struct KinetixAlertDescription: View {
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        Text(text)
            .font(.kinetixBody)
            .fixedSize(horizontal: false, vertical: true)
    }
}

//
// Inform.swift — KinetixInform.
//
// Mirrors packages/ui/src/components/inform.tsx: a persistent, dismissible,
// intent-tinted inline notice with an optional action. Distinct from
// KinetixAlert (border-only, static): filled, closable, can carry a CTA.
// Distinct from KinetixBanner (full-bleed, no rounded corners): a contained,
// rounded inline card. No icon library wired in yet for the leading intent
// icon, same gap as KinetixAlert/KinetixBanner — the dismiss "xmark" uses
// SF Symbols directly since that's a fixed glyph, not a per-intent choice.
//

import SwiftUI

public enum KinetixInformVariant {
    case information, warning, success, error, action
}

public struct KinetixInform: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String
    private let variant: KinetixInformVariant
    private let actionLabel: String?
    private let onAction: (() -> Void)?
    private let onDismiss: (() -> Void)?

    public init(
        _ text: String,
        variant: KinetixInformVariant = .information,
        actionLabel: String? = nil,
        onAction: (() -> Void)? = nil,
        onDismiss: (() -> Void)? = nil
    ) {
        self.text = text
        self.variant = variant
        self.actionLabel = actionLabel
        self.onAction = onAction
        self.onDismiss = onDismiss
    }

    private var tint: (container: Color, content: Color) {
        switch variant {
        case .information: return (colors.info.opacity(0.1), colors.info)
        case .warning: return (colors.warning.opacity(0.15), colors.warning)
        case .success: return (colors.success.opacity(0.15), colors.success)
        case .error: return (colors.destructive.opacity(0.1), colors.destructive)
        case .action: return (colors.foreground, colors.background)
        }
    }

    public var body: some View {
        HStack(alignment: .top, spacing: 10) { // spacing/2.5
            VStack(alignment: .leading, spacing: 8) { // spacing/2
                Text(text)
                    .font(.kinetixBodySm)
                    .foregroundStyle(tint.content)

                if let actionLabel {
                    Button(action: { onAction?() }) {
                        Text(actionLabel)
                            .font(.kinetixLabelMd.weight(.medium))
                            .underline()
                            .foregroundStyle(tint.content)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if let onDismiss {
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12))
                        .foregroundStyle(tint.content.opacity(0.7))
                }
            }
        }
        .padding(12) // spacing/3
        .background(tint.container, in: RoundedRectangle(cornerRadius: 8, style: .continuous)) // radius/md
    }
}

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
    @Environment(\.kinetixRadii) private var radii
    private let text: String
    private let variant: KinetixInformVariant
    private let actionLabel: String?
    private let onAction: (() -> Void)?
    private let onDismiss: (() -> Void)?
    private let dismissIcon: AnyView?

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
        self.dismissIcon = nil
    }

    /// Replaces the default dismiss mark (the `xmark` SF Symbol) with any view — another SF Symbol, an asset
    /// image, your company's icon view. The control keeps the "Dismiss" accessibility label and tints the view
    /// with the inform's content colour; SF Symbols are sized by the same 12pt font as the default, and
    /// the view is laid out in a 14×14 frame (use `.resizable()` on an asset `Image`). See /docs/icons.
    public init<DismissIcon: View>(
        _ text: String,
        variant: KinetixInformVariant = .information,
        actionLabel: String? = nil,
        onAction: (() -> Void)? = nil,
        onDismiss: (() -> Void)? = nil,
        @ViewBuilder dismissIcon: () -> DismissIcon
    ) {
        self.text = text
        self.variant = variant
        self.actionLabel = actionLabel
        self.onAction = onAction
        self.onDismiss = onDismiss
        self.dismissIcon = AnyView(dismissIcon())
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
                    Group {
                        if let dismissIcon {
                            dismissIcon.frame(width: 14, height: 14)
                        } else {
                            Image(systemName: "xmark")
                        }
                    }
                    .font(.system(size: 12))
                    .foregroundStyle(tint.content.opacity(0.7))
                }
                // Named for what it does, not for the symbol: VoiceOver's built-in name for "xmark" is
                // "Close", and a replacement view may have no name at all.
                .accessibilityLabel("Dismiss")
            }
        }
        .padding(12) // spacing/3
        .background(tint.container, in: RoundedRectangle(cornerRadius: radii.control, style: .continuous)) // radius/md
    }
}

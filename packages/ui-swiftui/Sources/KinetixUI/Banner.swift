//
// Banner.swift — KinetixBanner.
//
// Mirrors packages/ui/src/components/banner.tsx: a full-bleed, page-level
// notice, optionally dismissible. Distinct from KinetixAlert (in-flow,
// static) and KinetixToaster (transient): persistent, edge-to-edge, no
// rounded corners (compare KinetixInform's rounded inline card). No icon
// library wired in yet, same gap as
// KinetixAlert. The web version's `sticky` prop has no SwiftUI component-
// level equivalent — pin it to the top by placement instead (outside a
// ScrollView, or via `.safeAreaInset(edge: .top)`), same as KinetixAppBar.
//

import SwiftUI

public enum KinetixBannerVariant {
    case information, warning, success, error, action
}

public struct KinetixBanner: View {
    @Environment(\.kinetixColors) private var colors
    private let text: String
    private let variant: KinetixBannerVariant
    private let actionLabel: String?
    private let onAction: (() -> Void)?
    private let onDismiss: (() -> Void)?
    private let dismissIcon: AnyView?

    public init(
        _ text: String,
        variant: KinetixBannerVariant = .information,
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
    /// with the banner's content colour; SF Symbols are sized by the same 12pt font as the default, and
    /// the view is laid out in a 14×14 frame (use `.resizable()` on an asset `Image`). See /docs/icons.
    public init<DismissIcon: View>(
        _ text: String,
        variant: KinetixBannerVariant = .information,
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
        case .information: return (colors.info.opacity(0.1), colors.onInfoContainer)
        case .warning: return (colors.warning.opacity(0.15), colors.warning)
        case .success: return (colors.success.opacity(0.15), colors.success)
        case .error: return (colors.destructive.opacity(0.1), colors.destructive)
        case .action: return (colors.foreground, colors.background)
        }
    }

    public var body: some View {
        HStack(spacing: 12) { // spacing/3
            Text(text)
                .font(.kinetixBodySm)
                .foregroundStyle(tint.content)
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)

            if let actionLabel {
                Button(action: { onAction?() }) {
                    Text(actionLabel)
                        .font(.kinetixLabelMd.weight(.medium))
                        .foregroundStyle(tint.content)
                }
            }

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
                    .foregroundStyle(tint.content)
                }
                // Named for what it does, not for the symbol: VoiceOver's built-in name for "xmark" is
                // "Close", and a replacement view may have no name at all.
                .accessibilityLabel("Dismiss")
            }
        }
        .padding(.horizontal, 16) // spacing/4
        .padding(.vertical, 12) // spacing/3
        .frame(maxWidth: .infinity)
        .background(tint.container)
    }
}

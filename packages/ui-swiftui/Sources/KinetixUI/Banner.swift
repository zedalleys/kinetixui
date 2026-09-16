//
// Banner.swift — KinetixBanner.
//
// Mirrors packages/ui/src/components/banner.tsx: a full-bleed, page-level
// notice, optionally dismissible. Distinct from KinetixAlert (in-flow,
// static) and KinetixToaster (transient): persistent, edge-to-edge, no
// rounded corners (compare KinetixInform's rounded inline card — not yet
// ported to SwiftUI). No icon library wired in yet, same gap as
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
                    Image(systemName: "xmark")
                        .font(.system(size: 12))
                        .foregroundStyle(tint.content)
                }
            }
        }
        .padding(.horizontal, 16) // spacing/4
        .padding(.vertical, 12) // spacing/3
        .frame(maxWidth: .infinity)
        .background(tint.container)
    }
}

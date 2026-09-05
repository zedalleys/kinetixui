//
// Tag.swift — KinetixTag.
//
// Mirrors packages/ui/src/components/tag.tsx (`tagVariants`). Distinct
// from KinetixBadge: a container-tinted, dismissible chip — `rounded-sm`
// (not a full pill), Label Medium type, optional close button. Figma
// source: node 54855:14021.
//
// Like the React source, `.destructive` and `.warning` swap
// container/content (`bg-destructive-foreground text-destructive`,
// `bg-warning-foreground text-warning`) rather than the usual
// foreground-on-colour pattern — a deliberate "soft" treatment.
//
// `onRemove` renders an SF Symbol `xmark` (the React source uses lucide's
// `X`).
//

import SwiftUI

public enum KinetixTagVariant {
    case `default`, secondary, destructive, warning, outline
}

public struct KinetixTag: View {
    @Environment(\.kinetixColors) private var colors

    private let text: String
    private let variant: KinetixTagVariant
    private let onRemove: (() -> Void)?

    public init(
        _ text: String,
        variant: KinetixTagVariant = .default,
        onRemove: (() -> Void)? = nil
    ) {
        self.text = text
        self.variant = variant
        self.onRemove = onRemove
    }

    public var body: some View {
        let (bg, fg, border) = palette
        HStack(spacing: 4) {
            Text(text)
                .font(.system(size: 12, weight: .medium))
                .tracking(0.5)
            if let onRemove {
                Button(action: onRemove) {
                    Image(systemName: "xmark")
                        .font(.system(size: 10, weight: .semibold))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Remove")
            }
        }
        .foregroundStyle(fg)
        .padding(.horizontal, 8) // spacing/2
        .padding(.vertical, 4)   // spacing/1
        .background(bg, in: RoundedRectangle(cornerRadius: 4, style: .continuous)) // radius/sm
        .overlay {
            if let border {
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .strokeBorder(border, lineWidth: 1)
            }
        }
    }

    private var palette: (bg: Color, fg: Color, border: Color?) {
        switch variant {
        case .default:     return (colors.accent, colors.accentForeground, nil)
        case .secondary:   return (colors.secondary, colors.secondaryForeground, nil)
        case .destructive: return (colors.destructiveForeground, colors.destructive, nil)
        case .warning:     return (colors.warningForeground, colors.warning, nil)
        case .outline:     return (.clear, colors.foreground, colors.border)
        }
    }
}

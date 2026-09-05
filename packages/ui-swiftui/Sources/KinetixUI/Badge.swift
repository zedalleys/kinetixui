//
// Badge.swift — KinetixBadge.
//
// Mirrors packages/ui/src/components/badge.tsx's `badgeVariants` CVA.
// Figma source: node 54855:13995. Solid pill status marker, Label Medium
// type (12 / 16, +0.5 tracking).
//
// Carried over from the React source: the design's "secondary" badge is
// the saturated sage, which in this token contract is
// `--secondary-foreground` (`--secondary` is its pale container) — hence
// the swapped container/content colours on that one variant.
//

import SwiftUI

public enum KinetixBadgeVariant {
    case `default`, secondary, destructive, outline, subtle
}

public struct KinetixBadge: View {
    @Environment(\.kinetixColors) private var colors

    private let text: String
    private let variant: KinetixBadgeVariant

    public init(_ text: String, variant: KinetixBadgeVariant = .default) {
        self.text = text
        self.variant = variant
    }

    public var body: some View {
        let (bg, fg, border) = palette
        Text(text)
            .font(.system(size: 12, weight: .medium))
            .tracking(0.5)
            // px-2.5 isn't on the shared spacing scale (0/4/8/12/16/…) —
            // 10 mirrors the React `px-2.5` literally, same call as Compose.
            .padding(.horizontal, 10)
            .padding(.vertical, 4) // spacing/1
            .foregroundStyle(fg)
            .background(bg, in: Capsule())
            .overlay {
                if let border {
                    Capsule().strokeBorder(border, lineWidth: 1)
                }
            }
    }

    private var palette: (bg: Color, fg: Color, border: Color?) {
        switch variant {
        case .default:     return (colors.primary, colors.primaryForeground, nil)
        case .secondary:   return (colors.secondaryForeground, colors.secondary, nil)
        case .destructive: return (colors.destructive, colors.destructiveForeground, nil)
        case .outline:     return (.clear, colors.foreground, colors.border)
        case .subtle:      return (colors.accent, colors.accentForeground, nil)
        }
    }
}

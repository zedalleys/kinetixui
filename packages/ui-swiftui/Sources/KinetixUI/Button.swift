//
// Button.swift — KinetixButton.
//
// Mirrors packages/ui/src/components/button.tsx's `buttonVariants` CVA 1:1
// (variant × size × corners). Figma source: "KinetixUI" › UI Components ›
// 02. Controls & Actions › Button (node 54863:351). Same contract as
// `KinetixButton` in packages/ui-compose.
//
// Not ported from the React source: the `state` CVA axis (Hover/Focus/Active
// are docs/snapshot-only there — SwiftUI gives real press feedback for
// free) and the `sr-only` text treatment on the `icon` size (pass an
// icon-only `label` yourself; nothing is auto-hidden).
//
// Numbers (padding, radii, type) are hardcoded from the Figma spacing /
// radius / type scale — there's no `dimensionResource` equivalent for a
// plain SwiftPM target. Each is annotated with the token it maps to, the
// same convention the Compose port uses.
//

import SwiftUI

public enum KinetixButtonVariant {
    case primary, secondary, outline, destructive, ghost, link
}

public enum KinetixButtonSize {
    case sm, md, lg, icon
}

public enum KinetixCorners {
    case sharp, `default`, pill
}

private struct KinetixButtonSizeSpec {
    let horizontal: CGFloat
    let vertical: CGFloat
    let fontSize: CGFloat
    let tracking: CGFloat
    /// icon size renders square (equal padding, min width matches height)
    let square: Bool
}

private func spec(for size: KinetixButtonSize) -> KinetixButtonSizeSpec {
    switch size {
    // padding = spacing/3 + spacing/2 ; Label Small (11, +0.5 tracking)
    case .sm:
        return .init(horizontal: 12, vertical: 8, fontSize: 11, tracking: 0.5, square: false)
    // spacing/4 + spacing/3 ; Label Medium (12, +0.5)
    case .md:
        return .init(horizontal: 16, vertical: 12, fontSize: 12, tracking: 0.5, square: false)
    // spacing/6 + spacing/3 ; Label Large (14, +0.1)
    case .lg:
        return .init(horizontal: 24, vertical: 12, fontSize: 14, tracking: 0.1, square: false)
    // spacing/3 all round, square — same type scale as md
    case .icon:
        return .init(horizontal: 12, vertical: 12, fontSize: 12, tracking: 0.5, square: true)
    }
}

private func cornerRadius(_ corners: KinetixCorners) -> CGFloat {
    switch corners {
    case .sharp:    return 0        // radius/none
    case .default:  return 8        // radius/md — React's `rounded-md`
    case .pill:     return 9999     // radius/full
    }
}

/// A styled button. Provide an `action` and a `label` view builder, exactly
/// like SwiftUI's own `Button`.
///
/// ```swift
/// KinetixButton(action: save) { Text("Save") }
/// KinetixButton(variant: .outline, size: .sm, action: {}) { Text("Cancel") }
/// ```
public struct KinetixButton<Label: View>: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled

    private let variant: KinetixButtonVariant
    private let size: KinetixButtonSize
    private let corners: KinetixCorners
    private let action: () -> Void
    private let label: Label

    public init(
        variant: KinetixButtonVariant = .primary,
        size: KinetixButtonSize = .md,
        corners: KinetixCorners = .default,
        action: @escaping () -> Void,
        @ViewBuilder label: () -> Label
    ) {
        self.variant = variant
        self.size = size
        self.corners = corners
        self.action = action
        self.label = label()
    }

    public var body: some View {
        let s = spec(for: size)
        let isLink = variant == .link
        let radius = isLink ? 0 : cornerRadius(corners)

        Button(action: action) {
            label
                .font(.system(size: s.fontSize, weight: .medium))
                .tracking(s.tracking)
                .padding(.horizontal, isLink ? 0 : s.horizontal)   // Link drops its own x-padding (`px-0`)
                .padding(.vertical, isLink ? 0 : s.vertical)
                // icon size renders square — floor the width to the button height
                .frame(minWidth: s.square ? (s.fontSize + s.vertical * 2) : nil)
                .foregroundStyle(foreground)
                .background(background)
                .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
                .overlay(alignment: .center) { borderOverlay(radius: radius) }
        }
        .buttonStyle(.plain)
    }

    // MARK: - per-variant colour resolution (matches button.tsx resting state)

    private var foreground: Color {
        guard isEnabled else {
            // every disabled variant → muted-foreground text
            return colors.mutedForeground
        }
        switch variant {
        case .primary:     return colors.primaryForeground
        case .secondary:   return colors.secondaryForeground
        case .outline:     return colors.foreground
        case .destructive: return colors.destructiveForeground
        case .ghost:       return colors.foreground
        case .link:        return colors.primary
        }
    }

    private var background: Color {
        guard isEnabled else {
            switch variant {
            case .outline, .ghost, .link: return .clear      // stay transparent when disabled
            default:                       return colors.border // primary/secondary/destructive → border grey
            }
        }
        switch variant {
        case .primary:     return colors.primary
        case .secondary:   return colors.secondary
        case .destructive: return colors.destructive
        case .outline, .ghost, .link: return .clear
        }
    }

    @ViewBuilder
    private func borderOverlay(radius: CGFloat) -> some View {
        if variant == .outline {
            RoundedRectangle(cornerRadius: radius, style: .continuous)
                .strokeBorder(colors.input, lineWidth: 1) // border/width/default
        }
    }
}

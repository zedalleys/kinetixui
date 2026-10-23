//
// Button.swift — KinetixButton.
//
// Mirrors packages/ui/src/components/button.tsx's `buttonVariants` CVA 1:1
// (variant × size × corners). Figma source: "KinetixUI" › UI Components ›
// 02. Controls & Actions › Button (node 54863:351). Same contract as
// `KinetixButton` in packages/ui-compose.
//
// The primary variant follows the React `hover:bg-action/90` / `active:bg-action/85`
// states through the explicit `actionHover` / `actionPressed` tokens (hover is pointer-only:
// macOS and iPadOS). Not ported from the React source: the `state` CVA axis (Hover/Focus/Active
// are docs/snapshot-only there) and the `sr-only` text treatment on the `icon` size (pass an
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

private func kinetixCornerRadius(_ corners: KinetixCorners) -> CGFloat {
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
/// KinetixButton(pending: isSaving, action: save) { Text("Save") }
/// ```
///
/// `pending` says the action this button started is in flight. It is deliberately NOT `.disabled()`:
/// a disabled control loses its accessibility traits and VoiceOver stops naming it, and on top of
/// that the focus the user just placed is moved. While `pending`:
///
/// * the `action` closure is gated, so a second press cannot start the work twice;
/// * the label keeps its own text, and the status is exposed as the element's accessibility VALUE —
///   separate from the name, read by VoiceOver on the element and on a value change;
/// * a `ProgressView` is drawn in a slot that is sized in both states, so the label does not shift;
/// * the control keeps its normal colours. Dimmed means unavailable; this one is working.
///
/// `.allowsHitTesting(false)` was considered and rejected: it removes the view from hit testing
/// altogether, which also takes hover with it and can affect focus. Gating the closure suppresses
/// every input device — pointer, keyboard and switch control all arrive through the same action.
///
/// NOT VERIFIED AT RUNTIME. Nothing here was exercised against VoiceOver on a device or simulator;
/// the container has no Apple toolchain. This is the source-level shape, and the accessibility
/// behaviour it describes is a claim about the modifiers used, not a measurement of the result.
public struct KinetixButton<Label: View>: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled
    @State private var isHovering = false

    private let variant: KinetixButtonVariant
    private let size: KinetixButtonSize
    private let corners: KinetixCorners
    private let pending: Bool?
    private let pendingLabel: String
    private let action: () -> Void
    private let label: Label

    /// The default status wording. English, like every other default label in this package.
    public static var defaultPendingLabel: String { "Working…" }

    public init(
        variant: KinetixButtonVariant = .primary,
        size: KinetixButtonSize = .md,
        corners: KinetixCorners = .default,
        pending: Bool? = nil,
        pendingLabel: String = KinetixButton.defaultPendingLabel,
        action: @escaping () -> Void,
        @ViewBuilder label: () -> Label
    ) {
        self.variant = variant
        self.size = size
        self.corners = corners
        self.pending = pending
        self.pendingLabel = pendingLabel
        self.action = action
        self.label = label()
    }

    /// Opted in at all. `nil` — the default — means this call site never mentioned `pending`, and the
    /// button renders exactly as it did before this parameter existed: no indicator slot, no spacing.
    private var pendingAware: Bool { pending != nil }
    private var isPending: Bool { pending == true }

    public var body: some View {
        let s = spec(for: size)
        let isLink = variant == .link
        let radius: CGFloat = isLink ? 0 : kinetixCornerRadius(corners)

        Button(action: { if !isPending { action() } }) {
            HStack(spacing: pendingAware ? 4 : 0) {
                // The indicator slot, reserved at a constant 18pt whenever this call site uses
                // `pending` at all — occupied by the ring only while pending, so the label does not
                // move when it appears. 18pt matches the React `[&_svg]:size-[18px]` icon slot. A
                // button that passes no `pending` gets no slot and no spacing.
                if pendingAware {
                    ZStack {
                        if isPending {
                            ProgressView()
                                .progressViewStyle(.circular)
                                .controlSize(.small)
                        }
                    }
                    .frame(width: 18, height: 18)
                    .accessibilityHidden(true)   // the status is on the button's own value, not here
                }
                label
            }
            .font(.system(size: s.fontSize, weight: .medium))
            .tracking(s.tracking)
            .padding(.horizontal, isLink ? 0 : s.horizontal)   // Link drops its own x-padding (`px-0`)
            .padding(.vertical, isLink ? 0 : s.vertical)
            // icon size renders square — floor the width to the button height
            .frame(minWidth: s.square ? (s.fontSize + s.vertical * 2) : nil)
            .foregroundStyle(foreground)
        }
        .buttonStyle(KinetixButtonStyle(radius: radius, resting: background, hover: hoverBackground, pressed: pressedBackground, showsBorder: variant == .outline, border: colors.input))
        .onHover { isHovering = $0 }
        // Separate from the name, which stays whatever the label says. `.updatesFrequently` tells
        // VoiceOver the element is working, the way `aria-busy` does on the web. Both are applied
        // unconditionally with empty arguments when not pending — an empty value and an empty trait
        // set — rather than wrapped in an `AnyView` to apply them conditionally.
        .accessibilityValue(isPending ? pendingLabel : "")
        .accessibilityAddTraits(isPending ? .updatesFrequently : [])
    }

    // MARK: - per-variant colour resolution (matches button.tsx resting state)

    private var foreground: Color {
        guard isEnabled else {
            // every disabled variant → muted-foreground text
            return colors.mutedForeground
        }
        switch variant {
        case .primary:     return colors.actionForeground
        case .secondary:   return colors.secondaryForeground
        case .outline:     return colors.foreground
        case .destructive: return colors.destructiveForeground
        case .ghost:       return colors.foreground
        case .link:        return colors.link
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
        case .primary:     return colors.action
        case .secondary:   return colors.secondary
        case .destructive: return colors.destructive
        case .outline, .ghost, .link: return .clear
        }
    }

    /// Only the enabled primary variant has explicit hover / pressed fills; the rest keep their resting fill.
    private var hoverBackground: Color {
        isEnabled && variant == .primary && isHovering ? colors.actionHover : background
    }

    private var pressedBackground: Color {
        isEnabled && variant == .primary ? colors.actionPressed : background
    }
}

/// Draws the fill (resting, hovered or pressed), the clip and the outline border.
private struct KinetixButtonStyle: ButtonStyle {
    let radius: CGFloat
    let resting: Color
    let hover: Color
    let pressed: Color
    let showsBorder: Bool
    let border: Color

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .background(configuration.isPressed ? pressed : hover)
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .overlay(alignment: .center) {
                if showsBorder {
                    RoundedRectangle(cornerRadius: radius, style: .continuous)
                        .strokeBorder(border, lineWidth: 1) // border/width/default
                }
            }
    }
}

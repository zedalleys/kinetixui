//
// Theme.swift — the KinetixTheme wrapper.
//
// The SwiftUI analogue of packages/ui-compose's KinetixColorScheme /
// KinetixTheme: a small semantic colour set every `Kinetix*` view reads
// from `@Environment(\.kinetixColors)`, plus a `KinetixTheme { … }`
// wrapper that picks light or dark off the system `colorScheme`.
//
// The colour VALUES come from the generated, vendored
// KinetixColorsSwiftUI / KinetixColorsSwiftUIDark enums
// (KinetixColorsSwiftUI.swift / .dark.swift — do not hand-edit those;
// re-run `node scripts/vendor-swiftui-tokens.mjs` after `pnpm build:tokens`).
// Those are SwiftUI `Color`, not `UIColor`: UIColor is UIKit-only and won't
// compile on macOS, so the token engine emits this parallel Color set for
// the library (the existing KinetixColors.swift / Theme.swift UIColor
// output is untouched, for existing consumers).
//

import SwiftUI

/// The semantic colour set a KinetixUI component resolves to — the same
/// handful of tokens every variant in the React source
/// (packages/ui/src/components) maps to (bg-primary, text-foreground, …).
/// Matches `KinetixColors` in packages/ui-compose/.../Theme.kt field-for-field.
public struct KinetixColors {
    public let primary: Color
    public let primaryForeground: Color
    public let secondary: Color
    public let secondaryForeground: Color
    public let destructive: Color
    public let destructiveForeground: Color
    public let foreground: Color
    public let background: Color
    public let border: Color
    public let input: Color
    public let ring: Color
    public let muted: Color
    public let mutedForeground: Color
    public let accent: Color
    public let accentForeground: Color
    public let tertiary: Color
    public let tertiaryForeground: Color
    public let warning: Color
    public let warningForeground: Color
    public let card: Color
    public let cardForeground: Color
    public let success: Color
    public let successForeground: Color
    public let info: Color
    public let infoForeground: Color
    public let popover: Color
    public let popoverForeground: Color
    /// The 5-stop categorical chart palette (`--chart-1` … `--chart-5`).
    public let chart: [Color]

    public init(
        primary: Color,
        primaryForeground: Color,
        secondary: Color,
        secondaryForeground: Color,
        destructive: Color,
        destructiveForeground: Color,
        foreground: Color,
        background: Color,
        border: Color,
        input: Color,
        ring: Color,
        muted: Color,
        mutedForeground: Color,
        accent: Color,
        accentForeground: Color,
        tertiary: Color,
        tertiaryForeground: Color,
        warning: Color,
        warningForeground: Color,
        card: Color,
        cardForeground: Color,
        success: Color,
        successForeground: Color,
        info: Color,
        infoForeground: Color,
        popover: Color,
        popoverForeground: Color,
        chart: [Color]
    ) {
        self.primary = primary
        self.primaryForeground = primaryForeground
        self.secondary = secondary
        self.secondaryForeground = secondaryForeground
        self.destructive = destructive
        self.destructiveForeground = destructiveForeground
        self.foreground = foreground
        self.background = background
        self.border = border
        self.input = input
        self.ring = ring
        self.muted = muted
        self.mutedForeground = mutedForeground
        self.accent = accent
        self.accentForeground = accentForeground
        self.tertiary = tertiary
        self.tertiaryForeground = tertiaryForeground
        self.warning = warning
        self.warningForeground = warningForeground
        self.card = card
        self.cardForeground = cardForeground
        self.success = success
        self.successForeground = successForeground
        self.info = info
        self.infoForeground = infoForeground
        self.popover = popover
        self.popoverForeground = popoverForeground
        self.chart = chart
    }
}

public extension KinetixColors {
    /// Built from the generated light enum — `pnpm build:tokens`.
    static let light = KinetixColors(
        primary: KinetixColorsSwiftUI.primary,
        primaryForeground: KinetixColorsSwiftUI.primaryForeground,
        secondary: KinetixColorsSwiftUI.secondary,
        secondaryForeground: KinetixColorsSwiftUI.secondaryForeground,
        destructive: KinetixColorsSwiftUI.destructive,
        destructiveForeground: KinetixColorsSwiftUI.destructiveForeground,
        foreground: KinetixColorsSwiftUI.foreground,
        background: KinetixColorsSwiftUI.background,
        border: KinetixColorsSwiftUI.border,
        input: KinetixColorsSwiftUI.input,
        ring: KinetixColorsSwiftUI.ring,
        muted: KinetixColorsSwiftUI.muted,
        mutedForeground: KinetixColorsSwiftUI.mutedForeground,
        accent: KinetixColorsSwiftUI.accent,
        accentForeground: KinetixColorsSwiftUI.accentForeground,
        tertiary: KinetixColorsSwiftUI.tertiary,
        tertiaryForeground: KinetixColorsSwiftUI.tertiaryForeground,
        warning: KinetixColorsSwiftUI.warning,
        warningForeground: KinetixColorsSwiftUI.warningForeground,
        card: KinetixColorsSwiftUI.card,
        cardForeground: KinetixColorsSwiftUI.cardForeground,
        success: KinetixColorsSwiftUI.success,
        successForeground: KinetixColorsSwiftUI.successForeground,
        info: KinetixColorsSwiftUI.info,
        infoForeground: KinetixColorsSwiftUI.infoForeground,
        popover: KinetixColorsSwiftUI.popover,
        popoverForeground: KinetixColorsSwiftUI.popoverForeground,
        chart: [
            KinetixColorsSwiftUI.chart1,
            KinetixColorsSwiftUI.chart2,
            KinetixColorsSwiftUI.chart3,
            KinetixColorsSwiftUI.chart4,
            KinetixColorsSwiftUI.chart5,
        ]
    )

    /// Built from the generated dark enum — the real dark pass, same as the
    /// web `.dark` selector (nothing else native consumes a dark pass yet).
    static let dark = KinetixColors(
        primary: KinetixColorsSwiftUIDark.primary,
        primaryForeground: KinetixColorsSwiftUIDark.primaryForeground,
        secondary: KinetixColorsSwiftUIDark.secondary,
        secondaryForeground: KinetixColorsSwiftUIDark.secondaryForeground,
        destructive: KinetixColorsSwiftUIDark.destructive,
        destructiveForeground: KinetixColorsSwiftUIDark.destructiveForeground,
        foreground: KinetixColorsSwiftUIDark.foreground,
        background: KinetixColorsSwiftUIDark.background,
        border: KinetixColorsSwiftUIDark.border,
        input: KinetixColorsSwiftUIDark.input,
        ring: KinetixColorsSwiftUIDark.ring,
        muted: KinetixColorsSwiftUIDark.muted,
        mutedForeground: KinetixColorsSwiftUIDark.mutedForeground,
        accent: KinetixColorsSwiftUIDark.accent,
        accentForeground: KinetixColorsSwiftUIDark.accentForeground,
        tertiary: KinetixColorsSwiftUIDark.tertiary,
        tertiaryForeground: KinetixColorsSwiftUIDark.tertiaryForeground,
        warning: KinetixColorsSwiftUIDark.warning,
        warningForeground: KinetixColorsSwiftUIDark.warningForeground,
        card: KinetixColorsSwiftUIDark.card,
        cardForeground: KinetixColorsSwiftUIDark.cardForeground,
        success: KinetixColorsSwiftUIDark.success,
        successForeground: KinetixColorsSwiftUIDark.successForeground,
        info: KinetixColorsSwiftUIDark.info,
        infoForeground: KinetixColorsSwiftUIDark.infoForeground,
        popover: KinetixColorsSwiftUIDark.popover,
        popoverForeground: KinetixColorsSwiftUIDark.popoverForeground,
        chart: [
            KinetixColorsSwiftUIDark.chart1,
            KinetixColorsSwiftUIDark.chart2,
            KinetixColorsSwiftUIDark.chart3,
            KinetixColorsSwiftUIDark.chart4,
            KinetixColorsSwiftUIDark.chart5,
        ]
    )
}

private struct KinetixColorsKey: EnvironmentKey {
    static let defaultValue = KinetixColors.light
}

public extension EnvironmentValues {
    var kinetixColors: KinetixColors {
        get { self[KinetixColorsKey.self] }
        set { self[KinetixColorsKey.self] = newValue }
    }
}

/// Wrap a screen (or a preview) in `KinetixTheme { … }` so every `Kinetix*`
/// view resolves to the right light/dark value set. Defaults to the system
/// `colorScheme`, the same behaviour as the web `next-themes` "system" mode
/// and Compose's `KinetixTheme(darkTheme: isSystemInDarkTheme())`.
///
/// ```swift
/// KinetixTheme {
///     KinetixButton(action: {}) { Text("Save") }
/// }
/// ```
public struct KinetixTheme<Content: View>: View {
    @Environment(\.colorScheme) private var colorScheme
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        content.environment(\.kinetixColors, colorScheme == .dark ? .dark : .light)
    }
}

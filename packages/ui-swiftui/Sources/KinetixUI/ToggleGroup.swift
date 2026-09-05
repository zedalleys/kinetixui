//
// ToggleGroup.swift — KinetixToggleGroup / KinetixToggleGroupItem.
//
// Mirrors packages/ui/src/components/toggle-group.tsx. The React version
// shares `variant` / `size` from the group to each item through React
// Context; custom EnvironmentKeys play the same role here — items don't
// repeat those. KinetixToggleGroupItem is a thin pass-through to
// KinetixToggle with the shared values injected (same call as the Compose
// port). Single- vs multi-select is the caller's to enforce via the
// per-item bindings.
//

import SwiftUI

private struct KinetixToggleGroupVariantKey: EnvironmentKey {
    static let defaultValue = KinetixToggleVariant.default
}

private struct KinetixToggleGroupSizeKey: EnvironmentKey {
    static let defaultValue = KinetixToggleSize.default
}

extension EnvironmentValues {
    var kinetixToggleGroupVariant: KinetixToggleVariant {
        get { self[KinetixToggleGroupVariantKey.self] }
        set { self[KinetixToggleGroupVariantKey.self] = newValue }
    }
    var kinetixToggleGroupSize: KinetixToggleSize {
        get { self[KinetixToggleGroupSizeKey.self] }
        set { self[KinetixToggleGroupSizeKey.self] = newValue }
    }
}

public struct KinetixToggleGroup<Content: View>: View {
    private let variant: KinetixToggleVariant
    private let size: KinetixToggleSize
    private let content: Content

    public init(
        variant: KinetixToggleVariant = .default,
        size: KinetixToggleSize = .default,
        @ViewBuilder content: () -> Content
    ) {
        self.variant = variant
        self.size = size
        self.content = content()
    }

    public var body: some View {
        HStack(spacing: 4) { content } // gap-1
            .environment(\.kinetixToggleGroupVariant, variant)
            .environment(\.kinetixToggleGroupSize, size)
    }
}

public struct KinetixToggleGroupItem<Label: View>: View {
    @Environment(\.kinetixToggleGroupVariant) private var variant
    @Environment(\.kinetixToggleGroupSize) private var size

    @Binding private var isOn: Bool
    private let label: Label

    public init(isOn: Binding<Bool>, @ViewBuilder label: () -> Label) {
        self._isOn = isOn
        self.label = label()
    }

    public var body: some View {
        KinetixToggle(isOn: $isOn, variant: variant, size: size) { label }
    }
}

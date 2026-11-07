//
// RadioGroup.swift — KinetixRadioGroup / KinetixRadioButton.
//
// Mirror packages/ui/src/components/radio-group.tsx (`grid gap-3` group,
// 18pt / 2pt-border circle items, 10pt dot). Figma-literal 18 and 10
// aren't on the shared spacing scale — hardcoded, same as the Compose
// port. Selection state is the caller's (`isSelected` + `action`) — the
// group only supplies layout, same division as Radix's own
// Root / Item split.
//

import SwiftUI

public struct KinetixRadioGroup<Content: View>: View {
    private let content: Content
    private let accessibilityLabel: String?

    /// `accessibilityLabel` is defaulted, so every existing call site compiles unchanged. It exists
    /// because a radio group with no name is announced as a bare container: VoiceOver can tell the
    /// reader they are inside a group of three, but not what the group is asking. The web port gets
    /// the name from the `<fieldset>`'s legend; SwiftUI has no equivalent to infer it from.
    public init(accessibilityLabel: String? = nil, @ViewBuilder content: () -> Content) {
        self.content = content()
        self.accessibilityLabel = accessibilityLabel
    }

    // `.contain`, not `.combine`: the items stay individually focusable and individually selectable
    // — merging them into one element would make the group announceable and the choices
    // unreachable, which is a worse trade than the gap it fixes.
    private var grouped: some View {
        VStack(alignment: .leading, spacing: 12) { content } // grid gap-3
            .accessibilityElement(children: .contain)
    }

    @ViewBuilder
    public var body: some View {
        // Applied only when there is one: `.accessibilityLabel("")` on an unnamed group would
        // replace whatever the platform had inferred with nothing.
        if let accessibilityLabel {
            grouped.accessibilityLabel(accessibilityLabel)
        } else {
            grouped
        }
    }
}

public struct KinetixRadioButton: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private let isSelected: Bool
    private let isError: Bool
    private let action: () -> Void

    public init(isSelected: Bool, isError: Bool = false, action: @escaping () -> Void) {
        self.isSelected = isSelected
        self.isError = isError
        self.action = action
    }

    private var borderColor: Color {
        if isError { return colors.destructive }
        return isSelected ? colors.action : colors.input
    }

    public var body: some View {
        Button(action: action) {
            Circle()
                .strokeBorder(borderColor, lineWidth: 2)
                .frame(width: 18, height: 18)
                .overlay {
                    if isSelected {
                        Circle()
                            .fill(isError ? colors.destructive : colors.action)
                            .frame(width: 10, height: 10)
                    }
                }
                // selection-state (fast · standard): the border colour and the dot settle. `nil`
                // under Reduce Motion, which still leaves the dot where the selection is.
                .animation(KinetixSelectionMotion.animation(reduceMotion: reduceMotion), value: isSelected)
        }
        .buttonStyle(.plain)
        .opacity(isEnabled ? 1 : 0.5)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

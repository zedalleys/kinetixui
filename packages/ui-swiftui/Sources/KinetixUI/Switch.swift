//
// Switch.swift — KinetixSwitch.
//
// Mirrors packages/ui/src/components/switch.tsx. Figma source: node
// 54855:13984. 48×24 track, 20pt `--background` thumb, 24pt travel — the
// design's literal pixel spec (off the shared spacing scale, same as the
// React source's own comment). Off = `--tertiary`, on = `--primary`.
//

import SwiftUI

public struct KinetixSwitch: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled

    @Binding private var isOn: Bool

    public init(isOn: Binding<Bool>) {
        self._isOn = isOn
    }

    public var body: some View {
        Button {
            isOn.toggle()
        } label: {
            ZStack(alignment: isOn ? .trailing : .leading) {
                Capsule()
                    .fill(isOn ? colors.primary : colors.tertiary)
                    .frame(width: 48, height: 24)
                Circle()
                    .fill(colors.background)
                    .frame(width: 20, height: 20)
                    .shadow(color: .black.opacity(0.2), radius: 2, y: 1)
                    .padding(.horizontal, 2)
            }
            .animation(.easeInOut(duration: 0.15), value: isOn)
        }
        .buttonStyle(.plain)
        .opacity(isEnabled ? 1 : 0.5)
        .accessibilityValue(isOn ? "On" : "Off")
    }
}

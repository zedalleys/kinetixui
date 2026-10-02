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
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    @Binding private var isOn: Bool

    public init(isOn: Binding<Bool>) {
        self._isOn = isOn
    }

    public var body: some View {
        Button {
            isOn.toggle()
        } label: {
            ZStack(alignment: KinetixSwitchMotion.thumbAlignment(isOn: isOn)) {
                Capsule()
                    .fill(isOn ? colors.action : colors.tertiary)
                    .frame(width: 48, height: 24)
                Circle()
                    .fill(colors.background)
                    .frame(width: 20, height: 20)
                    // Not on the elevation ladder on purpose: this is the knob's own
                    // depth inside the track, a control detail rather than a surface
                    // floating above the page. `sm` would read as a card edge here.
                    .shadow(color: .black.opacity(0.2), radius: 2, y: 1)
                    .padding(.horizontal, 2)
            }
            // Was a literal 0.15s easeInOut while KinetixMotion.swift carried `instant` (100ms) and
            // the `standard` curve the React port already uses. The thumb still lands on the correct
            // side when motion is reduced — the position is the state — it just stops travelling.
            .animation(KinetixSwitchMotion.animation(reduceMotion: reduceMotion), value: isOn)
        }
        .buttonStyle(.plain)
        .opacity(isEnabled ? 1 : 0.5)
        .accessibilityValue(isOn ? "On" : "Off")
    }
}

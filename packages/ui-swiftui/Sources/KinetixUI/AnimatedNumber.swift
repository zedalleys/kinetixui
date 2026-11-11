import SwiftUI

/// An opt-in value transition. VoiceOver reads the target, never the interpolated frames.
public struct KinetixAnimatedNumber: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    private let value: Double
    private let format: (Double) -> String

    public init(value: Double, format: @escaping (Double) -> String) {
        self.value = value
        self.format = format
    }

    public var body: some View {
        // Identity resets when the preference changes so an in-flight interpolation cannot continue.
        if !value.isFinite {
            Text(format(value))
        } else {
            NumberText(value: value, format: format)
                .animation(KinetixNumberMotion.animation(reduceMotion: reduceMotion), value: value)
                .id(reduceMotion)
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(format(value))
        }
    }
}

private struct NumberText: View, Animatable {
    var value: Double
    let format: (Double) -> String
    var animatableData: Double {
        get { value }
        set { value = newValue }
    }
    var body: some View { Text(format(value)).monospacedDigit() }
}

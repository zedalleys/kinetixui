//
// NumberInput.swift — KinetixNumberInput.
//
// Mirrors packages/ui/src/components/number-input.tsx: a numeric value
// flanked by decrement / increment buttons. Modeled on `Int` (like the
// Compose port) — the common case; a fractional variant is a mechanical
// follow-up. `h-10` / `w-9` (40 / 36) are off the shared spacing scale.
// Buttons are the `minus` / `plus` SF Symbols.
//
// Free-text entry (the React `<input type=number>`) isn't ported — the
// value is display-only between the steppers, which is the primary
// interaction anyway.
//

import SwiftUI

public struct KinetixNumberInput: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled

    @Binding private var value: Int
    private let range: ClosedRange<Int>?
    private let step: Int

    public init(value: Binding<Int>, in range: ClosedRange<Int>? = nil, step: Int = 1) {
        self._value = value
        self.range = range
        self.step = step
    }

    private func clamp(_ n: Int) -> Int {
        guard let range else { return n }
        return Swift.min(Swift.max(n, range.lowerBound), range.upperBound)
    }

    private var canDecrement: Bool { range.map { value > $0.lowerBound } ?? true }
    private var canIncrement: Bool { range.map { value < $0.upperBound } ?? true }

    public var body: some View {
        HStack(spacing: 0) {
            stepButton(symbol: "minus", enabled: canDecrement) { value = clamp(value - step) }
            Rectangle().fill(colors.input).frame(width: 1)
            Text("\(value)")
                .font(.system(size: 14))
                .foregroundStyle(colors.foreground)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 8)
            Rectangle().fill(colors.input).frame(width: 1)
            stepButton(symbol: "plus", enabled: canIncrement) { value = clamp(value + step) }
        }
        .frame(height: 40) // h-10
        .background(colors.background, in: RoundedRectangle(cornerRadius: 8, style: .continuous)) // radius/md
        .overlay {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .strokeBorder(colors.input, lineWidth: 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .opacity(isEnabled ? 1 : 0.5)
    }

    @ViewBuilder
    private func stepButton(symbol: String, enabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 14))
                .foregroundStyle(colors.mutedForeground)
                .frame(width: 36, height: 40) // w-9
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
        .opacity(enabled ? 1 : 0.4)
    }
}

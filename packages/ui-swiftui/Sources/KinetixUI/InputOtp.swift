//
// InputOtp.swift — KinetixInputOtp.
//
// Mirrors packages/ui/src/components/input-otp.tsx: a segmented
// one-character-per-box code field. A hidden `TextField` holds the real
// value (digits only, capped at `length`); the boxes render each
// character with the next empty box marked as the cursor position.
// `.keyboardType(.numberPad)` is omitted (iOS-only) — the setter filters
// to digits instead.
//

import SwiftUI

public struct KinetixInputOtp: View {
    @Environment(\.kinetixColors) private var colors
    @FocusState private var focused: Bool

    @Binding private var text: String
    private let length: Int

    public init(text: Binding<String>, length: Int = 6) {
        self._text = text
        self.length = length
    }

    private var proxy: Binding<String> {
        Binding(
            get: { text },
            set: { text = String($0.filter(\.isNumber).prefix(length)) }
        )
    }

    public var body: some View {
        ZStack {
            TextField("", text: proxy)
                .focused($focused)
                .textFieldStyle(.plain)
                .tint(.clear)
                .foregroundStyle(.clear)
                .frame(width: 1, height: 1)
                .opacity(0.02)

            HStack(spacing: 8) {
                ForEach(0..<length, id: \.self) { i in
                    let chars = Array(text)
                    let isCursor = i == chars.count && focused
                    Text(i < chars.count ? String(chars[i]) : "")
                        .font(.system(size: 18, weight: .medium, design: .monospaced))
                        .foregroundStyle(colors.foreground)
                        .frame(width: 40, height: 48)
                        .background(colors.background, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
                        .overlay {
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .strokeBorder(
                                    isCursor ? colors.primary : colors.input,
                                    lineWidth: isCursor ? 2 : 1
                                )
                        }
                }
            }
            .contentShape(Rectangle())
            .onTapGesture { focused = true }
        }
    }
}

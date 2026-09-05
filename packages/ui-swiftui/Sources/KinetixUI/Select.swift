//
// Select.swift — KinetixSelect.
//
// Mirrors packages/ui/src/components/select.tsx. The Radix trigger +
// portalled listbox collapses onto a native `Menu` with a styled trigger
// label (border / chevron matching KinetixInput) — the same "reuse the
// platform machinery" call the Compose port made building on Material3's
// `DropdownMenu`. `min-h-[44px]` is Figma-literal. Options are a value +
// label list; selection is a `Value?` binding.
//

import SwiftUI

public struct KinetixSelectOption<Value: Hashable>: Identifiable {
    public let id: Value
    public let label: String
    public var value: Value { id }

    public init(value: Value, label: String) {
        self.id = value
        self.label = label
    }
}

public struct KinetixSelect<Value: Hashable>: View {
    @Environment(\.kinetixColors) private var colors
    @Environment(\.isEnabled) private var isEnabled

    @Binding private var selection: Value?
    private let options: [KinetixSelectOption<Value>]
    private let placeholder: String
    private let isError: Bool

    public init(
        selection: Binding<Value?>,
        options: [KinetixSelectOption<Value>],
        placeholder: String = "Select…",
        isError: Bool = false
    ) {
        self._selection = selection
        self.options = options
        self.placeholder = placeholder
        self.isError = isError
    }

    private var currentLabel: String {
        options.first { $0.value == selection }?.label ?? placeholder
    }

    public var body: some View {
        Menu {
            ForEach(options) { opt in
                Button {
                    selection = opt.value
                } label: {
                    if selection == opt.value {
                        Label(opt.label, systemImage: "checkmark")
                    } else {
                        Text(opt.label)
                    }
                }
            }
        } label: {
            HStack {
                Text(currentLabel)
                    .font(.system(size: 14))
                    .foregroundStyle(selection == nil ? colors.mutedForeground : colors.foreground)
                    .lineLimit(1)
                Spacer(minLength: 8)
                Image(systemName: "chevron.down")
                    .font(.system(size: 14))
                    .foregroundStyle(colors.foreground.opacity(0.6))
            }
            .padding(.horizontal, 12) // spacing/3
            .padding(.vertical, 12)
            .frame(minHeight: 44, alignment: .leading)
            .frame(maxWidth: .infinity)
            .background(colors.background, in: RoundedRectangle(cornerRadius: 4, style: .continuous)) // radius/sm
            .overlay {
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .strokeBorder(isError ? colors.destructive : colors.input, lineWidth: 1)
            }
            .contentShape(Rectangle())
        }
        .opacity(isEnabled ? 1 : 0.5)
    }
}

//
// MultiSelect.swift — KinetixMultiSelect.
//
// Mirrors packages/ui/src/components/multi-select.tsx: a Combobox-like
// field that keeps multiple KinetixTag chips, with a `creatable`
// free-entry mode. Built directly on KinetixPopover with KinetixInput as
// the search field — no new text-entry mechanism. Chips scroll
// horizontally in a single row rather than wrapping to multiple lines —
// SwiftUI has no built-in flow layout the way Compose's `FlowRow` is, and
// a custom `Layout` conformance felt like more machinery than this
// gap-fill component warrants. A documented simplification, not a
// silent one. Filtering is a plain `localizedCaseInsensitiveContains`
// check — the web version's `cmdk`-driven search has no SwiftUI
// equivalent to lean on.
//

import SwiftUI

public struct KinetixMultiSelectOption: Identifiable {
    public let value: String
    public let label: String
    public var id: String { value }

    public init(value: String, label: String) {
        self.value = value
        self.label = label
    }
}

public struct KinetixMultiSelect: View {
    @Environment(\.kinetixColors) private var colors

    private let options: [KinetixMultiSelectOption]
    @Binding private var selected: Set<String>
    private let placeholder: String
    private let creatable: Bool

    @State private var isOpen = false
    @State private var query = ""

    public init(
        options: [KinetixMultiSelectOption],
        selected: Binding<Set<String>>,
        placeholder: String = "Select…",
        creatable: Bool = false
    ) {
        self.options = options
        self._selected = selected
        self.placeholder = placeholder
        self.creatable = creatable
    }

    private func toggle(_ value: String) {
        if selected.contains(value) { selected.remove(value) } else { selected.insert(value) }
    }

    private func label(for value: String) -> String {
        options.first { $0.value == value }?.label ?? value
    }

    private var trimmed: String { query.trimmingCharacters(in: .whitespacesAndNewlines) }

    private var canCreate: Bool {
        creatable && !trimmed.isEmpty && !options.contains { $0.label.localizedCaseInsensitiveCompare(trimmed) == .orderedSame }
    }

    private var visibleOptions: [KinetixMultiSelectOption] {
        creatable ? options.filter { trimmed.isEmpty || $0.label.localizedCaseInsensitiveContains(trimmed) } : options
    }

    public var body: some View {
        KinetixPopover(isPresented: $isOpen) {
            Button(action: { isOpen = true }) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) { // spacing/1.5, off-scale — same call as KinetixBadge
                        if selected.isEmpty {
                            Text(placeholder)
                                .font(.kinetixBodySm)
                                .foregroundStyle(colors.mutedForeground)
                        }
                        ForEach(Array(selected), id: \.self) { value in
                            KinetixTag(label(for: value), variant: .secondary, onRemove: { toggle(value) })
                        }
                    }
                }
            }
            .buttonStyle(.plain)
            .padding(12) // spacing/3
            .frame(minHeight: 44, alignment: .leading)
            .overlay {
                RoundedRectangle(cornerRadius: 4, style: .continuous)
                    .strokeBorder(colors.border, lineWidth: 1)
            }
        } content: {
            VStack(alignment: .leading, spacing: 0) {
                KinetixInput(text: $query, placeholder: "Search…")
                    .padding(.bottom, 8) // spacing/2

                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        if visibleOptions.isEmpty {
                            if canCreate {
                                Button {
                                    toggle(trimmed)
                                    query = ""
                                } label: {
                                    Text("Create “\(trimmed)”")
                                        .font(.kinetixBodySm)
                                        .foregroundStyle(colors.foreground)
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                }
                                .buttonStyle(.plain)
                            } else {
                                Text("No results.")
                                    .font(.kinetixBodySm)
                                    .foregroundStyle(colors.mutedForeground)
                            }
                        }
                        ForEach(visibleOptions) { option in
                            Button(action: { toggle(option.value) }) {
                                HStack(spacing: 8) { // spacing/2
                                    Text(selected.contains(option.value) ? "✓" : "")
                                        .foregroundStyle(colors.primary)
                                        .frame(width: 16)
                                    Text(option.label)
                                        .font(.kinetixBodySm)
                                        .foregroundStyle(colors.foreground)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 8) // spacing/2
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .frame(maxHeight: 240)
            }
            .frame(minWidth: 240)
        }
    }
}

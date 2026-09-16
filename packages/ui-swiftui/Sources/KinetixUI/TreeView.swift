//
// TreeView.swift — KinetixTreeView / KinetixTreeItemRow.
//
// Mirrors packages/ui/src/components/tree-view.tsx: nested expand/
// collapse rows with optional checkboxes. Data-driven (KinetixTreeNode
// tree) rather than the React composition API, same call as the Compose
// port — recursion over a plain data structure is far simpler than
// threading state through arbitrarily-nested view children. Bindings
// (expanded/selected/checkedValues), not the uncontrolled+callback shape
// the web version also supports — SwiftUI's own convention, same as
// KinetixSlider/KinetixSelect. Tap-to-expand/select only: the web
// version's keyboard roving tabindex isn't ported, a documented
// scope-down (touch is primary here). `checkable` checkboxes are
// independent per node — no parent-selects-all-children propagation,
// same simplification as the web source.
//

import SwiftUI

public struct KinetixTreeNode: Identifiable {
    public let value: String
    public let label: String
    public let children: [KinetixTreeNode]

    public var id: String { value }

    public init(value: String, label: String, children: [KinetixTreeNode] = []) {
        self.value = value
        self.label = label
        self.children = children
    }
}

public struct KinetixTreeView: View {
    private let nodes: [KinetixTreeNode]
    private let checkable: Bool
    @Binding private var expanded: Set<String>
    @Binding private var selected: String?
    @Binding private var checkedValues: Set<String>

    public init(
        nodes: [KinetixTreeNode],
        checkable: Bool = false,
        expanded: Binding<Set<String>>,
        selected: Binding<String?>,
        checkedValues: Binding<Set<String>> = .constant([])
    ) {
        self.nodes = nodes
        self.checkable = checkable
        self._expanded = expanded
        self._selected = selected
        self._checkedValues = checkedValues
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ForEach(nodes) { node in
                KinetixTreeItemRow(
                    node: node,
                    level: 0,
                    checkable: checkable,
                    expanded: $expanded,
                    selected: $selected,
                    checkedValues: $checkedValues
                )
            }
        }
    }
}

private struct KinetixTreeItemRow: View {
    @Environment(\.kinetixColors) private var colors

    let node: KinetixTreeNode
    let level: Int
    let checkable: Bool
    @Binding var expanded: Set<String>
    @Binding var selected: String?
    @Binding var checkedValues: Set<String>

    private var hasChildren: Bool { !node.children.isEmpty }
    private var isExpanded: Bool { expanded.contains(node.value) }
    private var isSelected: Bool { selected == node.value }
    private var isChecked: Bool { checkedValues.contains(node.value) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                if hasChildren {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 12))
                        .foregroundStyle(colors.mutedForeground)
                        .rotationEffect(.degrees(isExpanded ? 90 : 0))
                        .frame(width: 16, height: 16)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            if isExpanded { expanded.remove(node.value) } else { expanded.insert(node.value) }
                        }
                } else {
                    Color.clear.frame(width: 16, height: 16)
                }

                if checkable {
                    KinetixCheckbox(isOn: Binding(
                        get: { isChecked },
                        set: { newValue in
                            if newValue { checkedValues.insert(node.value) } else { checkedValues.remove(node.value) }
                        }
                    ))
                }

                Text(node.label)
                    .font(.kinetixBodySm)
                    .foregroundStyle(colors.foreground)
                    .lineLimit(1)

                Spacer(minLength: 0)
            }
            .padding(.leading, CGFloat(level * 20 + 8))
            .padding(.vertical, 6)
            .padding(.trailing, 8)
            .background(isSelected ? colors.accent : .clear, in: RoundedRectangle(cornerRadius: 4, style: .continuous))
            .contentShape(Rectangle())
            .onTapGesture {
                selected = node.value
                if checkable {
                    if isChecked { checkedValues.remove(node.value) } else { checkedValues.insert(node.value) }
                }
            }

            if hasChildren && isExpanded {
                ForEach(node.children) { child in
                    KinetixTreeItemRow(
                        node: child,
                        level: level + 1,
                        checkable: checkable,
                        expanded: $expanded,
                        selected: $selected,
                        checkedValues: $checkedValues
                    )
                }
            }
        }
    }
}

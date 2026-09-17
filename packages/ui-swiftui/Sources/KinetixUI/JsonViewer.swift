//
// JsonViewer.swift — KinetixJsonViewer.
//
// Mirrors packages/ui/src/components/json-viewer.tsx: a collapsible,
// syntax-colored tree over arbitrary JSON-shaped data. Swift's strong
// typing has no equivalent to TypeScript's `unknown` for this, so
// `KinetixJSONValue` is a small recursive enum instead — `.object` keeps
// an ordered `[(String, KinetixJSONValue)]` rather than a `[String: Any]`
// dictionary, since Swift dictionaries don't preserve key order and the
// web/Compose versions both render keys in their original order. `.number`
// always stores a `Double` (what `JSONSerialization` produces for every
// JSON number, integers included), so display formatting trims a
// spurious trailing ".0" for whole numbers. Unlike KinetixDataGrid, a
// recursive expand/collapse tree needs no gesture or layout primitive iOS
// lacks, so this ships with the same feature set as web.
//

import SwiftUI

public enum KinetixJSONValue {
    case string(String)
    case number(Double)
    case bool(Bool)
    case null
    case array([KinetixJSONValue])
    case object([(String, KinetixJSONValue)])
}

public struct KinetixJsonViewer: View {
    private let value: KinetixJSONValue
    private let expandDepth: Int

    public init(value: KinetixJSONValue, expandDepth: Int = 1) {
        self.value = value
        self.expandDepth = expandDepth
    }

    public var body: some View {
        ScrollView([.horizontal, .vertical]) {
            VStack(alignment: .leading, spacing: 2) {
                JsonNode(name: nil, value: value, depth: 0, expandDepth: expandDepth, isLast: true)
            }
            .padding(8)
        }
    }
}

private struct JsonNode: View {
    @Environment(\.kinetixColors) private var colors
    let name: String?
    let value: KinetixJSONValue
    let depth: Int
    let expandDepth: Int
    let isLast: Bool

    @State private var expanded: Bool

    init(name: String?, value: KinetixJSONValue, depth: Int, expandDepth: Int, isLast: Bool) {
        self.name = name
        self.value = value
        self.depth = depth
        self.expandDepth = expandDepth
        self.isLast = isLast
        _expanded = State(initialValue: depth < expandDepth)
    }

    private func formatNumber(_ n: Double) -> String {
        n.truncatingRemainder(dividingBy: 1) == 0 ? String(Int(n)) : String(n)
    }

    var body: some View {
        switch value {
        case .string, .number, .bool, .null:
            HStack(spacing: 0) {
                if let name {
                    Text("\"\(name)\": ").foregroundStyle(colors.mutedForeground)
                }
                primitiveText
                if !isLast {
                    Text(",").foregroundStyle(colors.mutedForeground)
                }
            }
            .padding(.leading, CGFloat(depth * 16))
            .font(.system(size: 12, design: .monospaced))

        case .array(let items):
            containerView(entries: items.enumerated().map { (String($0.offset), $0.element) }, isArray: true)

        case .object(let entries):
            containerView(entries: entries, isArray: false)
        }
    }

    @ViewBuilder
    private var primitiveText: some View {
        switch value {
        case .null:
            Text("null").italic().foregroundStyle(colors.mutedForeground)
        case .string(let s):
            Text("\"\(s)\"").foregroundStyle(colors.success)
        case .number(let n):
            Text(formatNumber(n)).foregroundStyle(colors.info)
        case .bool(let b):
            Text(b ? "true" : "false").foregroundStyle(colors.warning)
        default:
            EmptyView()
        }
    }

    @ViewBuilder
    private func containerView(entries: [(String, KinetixJSONValue)], isArray: Bool) -> some View {
        let openBracket = isArray ? "[" : "{"
        let closeBracket = isArray ? "]" : "}"

        if entries.isEmpty {
            HStack(spacing: 0) {
                if let name {
                    Text("\"\(name)\": ").foregroundStyle(colors.mutedForeground)
                }
                Text("\(openBracket)\(closeBracket)")
                if !isLast {
                    Text(",").foregroundStyle(colors.mutedForeground)
                }
            }
            .padding(.leading, CGFloat(depth * 16 + 20))
            .font(.system(size: 12, design: .monospaced))
        } else {
            VStack(alignment: .leading, spacing: 0) {
                Button {
                    expanded.toggle()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 9))
                            .foregroundStyle(colors.mutedForeground)
                            .rotationEffect(.degrees(expanded ? 90 : 0))
                        if let name {
                            Text("\"\(name)\": ").foregroundStyle(colors.mutedForeground)
                        }
                        Text(openBracket)
                        if !expanded {
                            Text(" \(entries.count) \(isArray ? "item" : "key")\(entries.count == 1 ? "" : "s") ")
                                .foregroundStyle(colors.mutedForeground)
                            Text(closeBracket)
                            if !isLast {
                                Text(",").foregroundStyle(colors.mutedForeground)
                            }
                        }
                    }
                }
                .buttonStyle(.plain)
                .padding(.leading, CGFloat(depth * 16))
                .font(.system(size: 12, design: .monospaced))

                if expanded {
                    ForEach(Array(entries.enumerated()), id: \.offset) { index, entry in
                        JsonNode(
                            name: isArray ? nil : entry.0,
                            value: entry.1,
                            depth: depth + 1,
                            expandDepth: expandDepth,
                            isLast: index == entries.count - 1
                        )
                    }
                    HStack(spacing: 0) {
                        Text(closeBracket)
                        if !isLast {
                            Text(",").foregroundStyle(colors.mutedForeground)
                        }
                    }
                    .padding(.leading, CGFloat(depth * 16))
                    .font(.system(size: 12, design: .monospaced))
                }
            }
        }
    }
}

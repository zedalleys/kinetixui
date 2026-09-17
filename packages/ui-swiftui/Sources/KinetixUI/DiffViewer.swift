//
// DiffViewer.swift — KinetixDiffViewer.
//
// Mirrors packages/ui/src/components/diff-viewer.tsx: a side-by-side or
// unified text diff with gutter line numbers, over the same hand-rolled
// LCS line diff (not a package — it needs to behave identically to the
// web/Compose versions, and a ~30-line DP table is easier to keep in
// lockstep across four platforms than four bindings to someone else's
// diff library). O(n·m) time and space — fine for a config file or a
// token snapshot, not multi-thousand-line files. `.split` mode doesn't
// pair adjacent remove/add runs onto the same row the way GitHub's split
// view does — each op renders in its own column, blank on the other side,
// same simplification as the web version.
//

import SwiftUI

public struct KinetixDiffLine: Identifiable {
    public enum Kind { case equal, add, remove }

    public let id = UUID()
    public let kind: Kind
    public let oldLine: Int?
    public let newLine: Int?
    public let text: String
}

public enum KinetixDiffMode {
    case unified
    case split
}

public func kinetixComputeLineDiff(oldText: String, newText: String) -> [KinetixDiffLine] {
    let oldLines = oldText.components(separatedBy: "\n")
    let newLines = newText.components(separatedBy: "\n")
    let n = oldLines.count
    let m = newLines.count

    var dp = Array(repeating: Array(repeating: 0, count: m + 1), count: n + 1)
    if n > 0 && m > 0 {
        for i in stride(from: n - 1, through: 0, by: -1) {
            for j in stride(from: m - 1, through: 0, by: -1) {
                dp[i][j] = oldLines[i] == newLines[j] ? dp[i + 1][j + 1] + 1 : max(dp[i + 1][j], dp[i][j + 1])
            }
        }
    }

    var ops: [KinetixDiffLine] = []
    var i = 0
    var j = 0
    while i < n && j < m {
        if oldLines[i] == newLines[j] {
            ops.append(KinetixDiffLine(kind: .equal, oldLine: i + 1, newLine: j + 1, text: oldLines[i]))
            i += 1
            j += 1
        } else if dp[i + 1][j] >= dp[i][j + 1] {
            ops.append(KinetixDiffLine(kind: .remove, oldLine: i + 1, newLine: nil, text: oldLines[i]))
            i += 1
        } else {
            ops.append(KinetixDiffLine(kind: .add, oldLine: nil, newLine: j + 1, text: newLines[j]))
            j += 1
        }
    }
    while i < n {
        ops.append(KinetixDiffLine(kind: .remove, oldLine: i + 1, newLine: nil, text: oldLines[i]))
        i += 1
    }
    while j < m {
        ops.append(KinetixDiffLine(kind: .add, oldLine: nil, newLine: j + 1, text: newLines[j]))
        j += 1
    }
    return ops
}

public struct KinetixDiffViewer: View {
    @Environment(\.kinetixColors) private var colors

    private let ops: [KinetixDiffLine]
    private let mode: KinetixDiffMode
    private let oldLabel: String
    private let newLabel: String

    public init(
        oldText: String,
        newText: String,
        mode: KinetixDiffMode = .unified,
        oldLabel: String = "Before",
        newLabel: String = "After"
    ) {
        self.ops = kinetixComputeLineDiff(oldText: oldText, newText: newText)
        self.mode = mode
        self.oldLabel = oldLabel
        self.newLabel = newLabel
    }

    public var body: some View {
        ScrollView([.horizontal, .vertical]) {
            VStack(alignment: .leading, spacing: 0) {
                if mode == .split {
                    HStack(spacing: 0) {
                        Text(oldLabel).frame(maxWidth: .infinity, alignment: .leading)
                        Text(newLabel).frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(colors.mutedForeground)
                    .padding(4)
                    .background(colors.muted)
                }
                ForEach(ops) { op in
                    if mode == .unified {
                        unifiedRow(op)
                    } else {
                        splitRow(op)
                    }
                }
            }
        }
        .border(colors.border)
    }

    @ViewBuilder
    private func unifiedRow(_ op: KinetixDiffLine) -> some View {
        let background: Color = {
            switch op.kind {
            case .add: return colors.success.opacity(0.1)
            case .remove: return colors.destructive.opacity(0.1)
            case .equal: return .clear
            }
        }()
        HStack(spacing: 0) {
            Text(op.oldLine.map(String.init) ?? "").frame(width: 28, alignment: .trailing)
            Text(op.newLine.map(String.init) ?? "").frame(width: 28, alignment: .trailing)
            Text(op.kind == .add ? "+" : op.kind == .remove ? "\u{2212}" : "")
                .foregroundStyle(op.kind == .add ? colors.success : op.kind == .remove ? colors.destructive : colors.foreground)
                .frame(width: 14)
            Text(op.text)
                .foregroundStyle(colors.foreground)
        }
        .font(.system(size: 11, design: .monospaced))
        .foregroundStyle(colors.mutedForeground)
        .background(background)
    }

    @ViewBuilder
    private func splitRow(_ op: KinetixDiffLine) -> some View {
        HStack(spacing: 0) {
            HStack(spacing: 0) {
                Text(op.oldLine.map(String.init) ?? "").frame(width: 28, alignment: .trailing)
                Text(op.kind != .add ? op.text : "").foregroundStyle(colors.foreground)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(op.kind == .remove ? colors.destructive.opacity(0.1) : .clear)

            HStack(spacing: 0) {
                Text(op.newLine.map(String.init) ?? "").frame(width: 28, alignment: .trailing)
                Text(op.kind != .remove ? op.text : "").foregroundStyle(colors.foreground)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(op.kind == .add ? colors.success.opacity(0.1) : .clear)
        }
        .font(.system(size: 11, design: .monospaced))
        .foregroundStyle(colors.mutedForeground)
    }
}

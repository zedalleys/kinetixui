//
// DataTable.swift — KinetixDataTable.
//
// Mirrors packages/ui/src/components/data-table.tsx (a @tanstack/
// react-table wrapper over the KinetixUI Table). No @tanstack equivalent,
// so sort + pagination state is hand-held here, but the rendering reuses
// KinetixTable / KinetixTableRow / KinetixTableCell and KinetixButton
// outright. A `KinetixDataColumn` gives a header, a `String` cell mapper,
// an optional `width`, and an optional `sortKey` (nil ⇒ not sortable;
// sorts lexicographically on the returned string — zero-pad numbers).
// Tapping a sortable header cycles asc → desc.
//

import SwiftUI

public struct KinetixDataColumn<Row>: Identifiable {
    public let id = UUID()
    public let header: String
    public let width: CGFloat?
    public let sortKey: ((Row) -> String)?
    public let cell: (Row) -> String

    public init(
        header: String,
        width: CGFloat? = nil,
        sortKey: ((Row) -> String)? = nil,
        cell: @escaping (Row) -> String
    ) {
        self.header = header
        self.width = width
        self.sortKey = sortKey
        self.cell = cell
    }
}

public struct KinetixDataTable<Row: Identifiable>: View {
    @Environment(\.kinetixColors) private var colors

    private let columns: [KinetixDataColumn<Row>]
    private let rows: [Row]
    private let pageSize: Int

    @State private var sortColumn: UUID?
    @State private var sortAscending = true
    @State private var page = 0

    public init(columns: [KinetixDataColumn<Row>], rows: [Row], pageSize: Int = 10) {
        self.columns = columns
        self.rows = rows
        self.pageSize = pageSize
    }

    private var sortedRows: [Row] {
        guard
            let sortColumn,
            let col = columns.first(where: { $0.id == sortColumn }),
            let key = col.sortKey
        else { return rows }
        let ascending = rows.sorted { key($0) < key($1) }
        return sortAscending ? ascending : ascending.reversed()
    }

    private var pageCount: Int {
        max(1, Int(ceil(Double(rows.count) / Double(pageSize))))
    }

    private var pageRows: [Row] {
        let start = page * pageSize
        let all = sortedRows
        guard start < all.count else { return [] }
        return Array(all[start ..< min(start + pageSize, all.count)])
    }

    private func toggleSort(_ col: KinetixDataColumn<Row>) {
        guard col.sortKey != nil else { return }
        if sortColumn == col.id {
            sortAscending.toggle()
        } else {
            sortColumn = col.id
            sortAscending = true
        }
        page = 0
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            KinetixTable {
                KinetixTableRow(isHeader: true) {
                    ForEach(columns) { col in
                        Button {
                            toggleSort(col)
                        } label: {
                            HStack(spacing: 4) {
                                Text(col.header)
                                    .font(.system(size: 14, weight: .medium))
                                if sortColumn == col.id {
                                    Image(systemName: sortAscending ? "chevron.up" : "chevron.down")
                                        .font(.system(size: 10))
                                }
                            }
                            .foregroundStyle(colors.mutedForeground)
                            .frame(maxWidth: col.width == nil ? .infinity : nil, alignment: .leading)
                            .frame(width: col.width, alignment: .leading)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 8)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .disabled(col.sortKey == nil)
                    }
                }
                ForEach(pageRows) { row in
                    KinetixTableRow {
                        ForEach(columns) { col in
                            KinetixTableCell(width: col.width) {
                                Text(col.cell(row))
                                    .font(.system(size: 14))
                                    .foregroundStyle(colors.foreground)
                            }
                        }
                    }
                }
            }

            HStack {
                Text("Page \(page + 1) of \(pageCount)")
                    .font(.system(size: 13))
                    .foregroundStyle(colors.mutedForeground)
                Spacer()
                KinetixButton(variant: .outline, size: .sm, action: { if page > 0 { page -= 1 } }) {
                    Text("Previous")
                }
                KinetixButton(variant: .outline, size: .sm, action: { if page < pageCount - 1 { page += 1 } }) {
                    Text("Next")
                }
            }
        }
    }
}

//
// DataGrid.swift — KinetixDataGrid.
//
// Mirrors packages/ui/src/components/data-grid.tsx's row-virtualized grid.
// Column resize, drag-to-reorder, and column pin are web-only: no
// touch-friendly drag-a-column-border gesture convention on iOS, and a
// sticky column needs a custom layout `ScrollView` doesn't give for free.
// Ships the three features that map directly onto SwiftUI primitives
// instead: a `LazyVStack` inside a `ScrollView` only instantiates rows near
// the viewport (bind the viewport via `.frame(height:)` at the call site,
// same as KinetixVirtualList), a `Section` header pinned via
// `pinnedViews: [.sectionHeaders]` stays fixed at the top while the whole
// `ScrollView` pans in both directions — free horizontal sync between
// header and body, no manual scroll-offset bridging needed — and editable
// cells swap to a `TextField` on tap, committing on Return (`.onSubmit`)
// rather than the web's blur-also-commits.
//

import SwiftUI

public struct KinetixDataGridColumn<Row> {
    public let id: String
    public let header: String
    public let width: CGFloat
    public let sortable: Bool
    public let editable: Bool
    public let cellText: (Row) -> String
    public let onCellEdit: ((Row, Int, String) -> Void)?

    public init(
        id: String,
        header: String,
        width: CGFloat = 120,
        sortable: Bool = false,
        editable: Bool = false,
        cellText: @escaping (Row) -> String,
        onCellEdit: ((Row, Int, String) -> Void)? = nil
    ) {
        self.id = id
        self.header = header
        self.width = width
        self.sortable = sortable
        self.editable = editable
        self.cellText = cellText
        self.onCellEdit = onCellEdit
    }
}

public struct KinetixDataGrid<Row>: View {
    @Environment(\.kinetixColors) private var colors

    private let columns: [KinetixDataGridColumn<Row>]
    private let rows: [Row]
    private let rowHeight: CGFloat

    @State private var sortColumnId: String?
    @State private var sortAscending = true
    @State private var editing: (rowIndex: Int, columnId: String)?
    @State private var draft: String = ""

    public init(columns: [KinetixDataGridColumn<Row>], rows: [Row], rowHeight: CGFloat = 40) {
        self.columns = columns
        self.rows = rows
        self.rowHeight = rowHeight
    }

    private var sortedRows: [Row] {
        guard
            let sortColumnId,
            let column = columns.first(where: { $0.id == sortColumnId })
        else { return rows }
        let ascending = rows.sorted { column.cellText($0) < column.cellText($1) }
        return sortAscending ? ascending : ascending.reversed()
    }

    private func toggleSort(_ column: KinetixDataGridColumn<Row>) {
        guard column.sortable else { return }
        if sortColumnId == column.id {
            sortAscending.toggle()
        } else {
            sortColumnId = column.id
            sortAscending = true
        }
    }

    private var headerRow: some View {
        HStack(spacing: 0) {
            ForEach(columns, id: \.id) { column in
                Button {
                    toggleSort(column)
                } label: {
                    HStack(spacing: 4) {
                        Text(column.header)
                            .font(.kinetixLabelLg)
                        if sortColumnId == column.id {
                            Image(systemName: sortAscending ? "chevron.up" : "chevron.down")
                                .font(.system(size: 10))
                        }
                    }
                    .foregroundStyle(colors.mutedForeground)
                    .frame(width: column.width, height: rowHeight, alignment: .leading)
                    .padding(.horizontal, 8)
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(!column.sortable)
            }
        }
        .background(colors.background)
        .overlay(alignment: .bottom) {
            Rectangle().fill(colors.border).frame(height: 1)
        }
    }

    @ViewBuilder
    private func cell(column: KinetixDataGridColumn<Row>, row: Row, rowIndex: Int) -> some View {
        let isEditing = editing?.rowIndex == rowIndex && editing?.columnId == column.id
        Group {
            if isEditing {
                TextField("", text: $draft)
                    .font(.kinetixBody)
                    .textFieldStyle(.plain)
                    .onSubmit {
                        column.onCellEdit?(row, rowIndex, draft)
                        editing = nil
                    }
            } else {
                Text(column.cellText(row))
                    .font(.kinetixBody)
                    .foregroundStyle(colors.foreground)
                    .lineLimit(1)
                    .onTapGesture {
                        guard column.editable else { return }
                        draft = column.cellText(row)
                        editing = (rowIndex, column.id)
                    }
            }
        }
        .frame(width: column.width, alignment: .leading)
        .padding(.horizontal, 8)
    }

    public var body: some View {
        ScrollView([.horizontal, .vertical]) {
            LazyVStack(alignment: .leading, spacing: 0, pinnedViews: [.sectionHeaders]) {
                Section(header: headerRow) {
                    ForEach(Array(sortedRows.enumerated()), id: \.offset) { rowIndex, row in
                        HStack(spacing: 0) {
                            ForEach(columns, id: \.id) { column in
                                cell(column: column, row: row, rowIndex: rowIndex)
                            }
                        }
                        .frame(height: rowHeight)
                        .overlay(alignment: .bottom) {
                            Rectangle().fill(colors.border).frame(height: 1)
                        }
                    }
                }
            }
        }
        .border(colors.border)
    }
}

//
// VirtualList.swift — KinetixVirtualList.
//
// Mirrors packages/ui/src/components/virtual-list.tsx: a windowed-rendering
// primitive. Like KinetixVirtualList on Compose (LazyColumn), this maps
// cleanly onto a native mechanism — SwiftUI's `List` already only
// instantiates the rows near the visible viewport, so there's no manual
// scrollTop/ResizeObserver math to port and no fixed-row-height
// restriction. `id` is an explicit key path (rather than requiring
// `T: Identifiable`) so this accepts the same shape of plain data the web
// and Compose versions do.
//

import SwiftUI

public struct KinetixVirtualList<Data: RandomAccessCollection, ID: Hashable, Content: View>: View {
    private let data: Data
    private let id: KeyPath<Data.Element, ID>
    private let content: (Data.Element) -> Content

    public init(
        _ data: Data,
        id: KeyPath<Data.Element, ID>,
        @ViewBuilder content: @escaping (Data.Element) -> Content
    ) {
        self.data = data
        self.id = id
        self.content = content
    }

    public var body: some View {
        List(data, id: id) { item in
            content(item)
                .listRowInsets(EdgeInsets())
                .listRowSeparator(.hidden)
        }
        .listStyle(.plain)
    }
}

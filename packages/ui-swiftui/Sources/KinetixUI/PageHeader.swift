//
// PageHeader.swift — KinetixPageHeader.
//
// Mirrors packages/ui/src/components/page-header.tsx: title + optional
// breadcrumb + description + action cluster + optional tabs row, closed
// off with a KinetixSeparator. breadcrumb/actions/tabs are plain
// ViewBuilder slots (defaulting to EmptyView, the standard SwiftUI
// pattern for an optional generic child) so callers compose their own
// navigation/button/tab views into them.
//

import SwiftUI

public struct KinetixPageHeader<Breadcrumb: View, Actions: View, Tabs: View>: View {
    @Environment(\.kinetixColors) private var colors

    private let title: String
    private let description: String?
    private let breadcrumb: () -> Breadcrumb
    private let actions: () -> Actions
    private let tabs: () -> Tabs

    public init(
        _ title: String,
        description: String? = nil,
        @ViewBuilder breadcrumb: @escaping () -> Breadcrumb = { EmptyView() },
        @ViewBuilder actions: @escaping () -> Actions = { EmptyView() },
        @ViewBuilder tabs: @escaping () -> Tabs = { EmptyView() }
    ) {
        self.title = title
        self.description = description
        self.breadcrumb = breadcrumb
        self.actions = actions
        self.tabs = tabs
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 16) { // spacing/4
                breadcrumb()

                HStack(alignment: .top, spacing: 16) { // spacing/4
                    VStack(alignment: .leading, spacing: 2) {
                        Text(title)
                            .font(.kinetixHeadlineSm.weight(.medium))
                            .foregroundStyle(colors.foreground)
                        if let description {
                            Text(description)
                                .font(.kinetixBody)
                                .foregroundStyle(colors.mutedForeground)
                        }
                    }
                    Spacer(minLength: 0)
                    HStack(spacing: 8) { actions() } // spacing/2
                }

                tabs()
            }
            .padding(.bottom, 24) // spacing/6

            KinetixSeparator()
        }
    }
}

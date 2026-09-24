import SwiftUI
import XCTest
import KinetixUI

/// The "Table toolbar" block — see SignInBlockTests.swift for how block fixtures work.
///
/// This is the block that adapts most, and the adaptation is the point rather than a shortfall.
///
/// The web version is a search field, a status filter and an action above a three-column table. A table with
/// column headers is a desktop reading pattern: on a phone it becomes three columns of about 100 points each,
/// and at larger text sizes it stops being readable at all. So the rows here are `KinetixListItem`s — the
/// identifier as the title, status and amount as the trailing detail — which is how iOS itself renders a
/// list of records. `KinetixTable` exists in the package and is the right choice on iPad; this fixture shows
/// the phone case, because that is the one the web version cannot express.
///
/// What is shared: a dataset, a way to narrow it, an action that adds to it, and one row per record. What is
/// not: the column grid.
///
/// Accessibility: the filter is a real `Picker`, so it gets the platform's own wheel or menu and announces
/// its selection; the search field is labelled rather than relying on placeholder text, which VoiceOver
/// treats as a value and not a name.
///
// kx-block:start
struct TableToolbarBlock: View {
    private struct Invoice: Identifiable {
        let id: String
        let status: String
        let amount: String
    }

    private let invoices = [
        Invoice(id: "INV-001", status: "Paid", amount: "$250.00"),
        Invoice(id: "INV-002", status: "Pending", amount: "$150.00"),
        Invoice(id: "INV-003", status: "Paid", amount: "$350.00"),
    ]

    @State private var query = ""
    @State private var status = "All statuses"
    var onAdd: () -> Void = {}

    private var visible: [Invoice] {
        invoices.filter { invoice in
            (query.isEmpty || invoice.id.localizedCaseInsensitiveContains(query))
                && (status == "All statuses" || invoice.status == status)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 8) {
                KinetixLabel("Search invoices")
                KinetixInput(text: $query, placeholder: "INV-001")
                HStack(spacing: 8) {
                    Picker("Filter by status", selection: $status) {
                        Text("All statuses").tag("All statuses")
                        Text("Paid").tag("Paid")
                        Text("Pending").tag("Pending")
                    }
                    .pickerStyle(.menu)
                    Spacer()
                    KinetixButton(action: onAdd) { Text("Add invoice") }
                }
            }

            KinetixList {
                ForEach(visible) { invoice in
                    KinetixListItem(title: invoice.id, description: invoice.amount) {
                        KinetixBadge(invoice.status, variant: invoice.status == "Paid" ? .subtle : .outline)
                    } trailing: {
                        EmptyView()
                    }
                }
            }
        }
    }
}
// kx-block:end

final class TableToolbarBlockTests: XCTestCase {
    func testTableToolbarBlockCompiles() {
        XCTAssertNotNil(TableToolbarBlock().body)
    }
}

//
// AccessibilityTree.swift — read the accessibility tree a SwiftUI view actually produces.
//
// ── Why this exists, and why it is not ViewInspector ──────────────────────────
//
// Flutter's `test/semantics_test.dart` works in two layers: the `Semantics` a widget declares, and
// one end-to-end check of the merged node a platform accessibility service sees. SwiftUI has no
// first-party way to read back a declared modifier — `.accessibilityValue(_:)` is opaque once
// applied — so the first layer has no SwiftUI equivalent at any price, and the second layer is the
// only one available. It is also the one that matters: it is what VoiceOver receives.
//
// The route is AppKit. `NSHostingView` renders the SwiftUI view into a real AppKit view hierarchy,
// and that hierarchy answers the NSAccessibility protocol — in-process method calls, so no
// accessibility permission and no separate process is involved, and no simulator is needed. The
// test target already reaches for AppKit this way: `ContrastTests.swift` is fenced the same way and
// converts `Color` through `NSColor`.
//
// `Package.swift` records view-level accessibility testing as needing "a library such as
// ViewInspector, or an XCUITest host app". This is a third route it did not consider. It adds no
// dependency and needs no host app, and it is strictly stronger than ViewInspector for this job:
// ViewInspector would read back the modifier we wrote, which is the thing we already know, whereas
// this reads what the platform built from it.
//
// ── The vacuous-pass guard ───────────────────────────────────────────────────
//
// The danger of a tree walk is that it finds nothing, asserts nothing about nothing, and reports
// success — a gate that passes over exactly the gap it was built to close. So `elements(of:)` fails
// the test when the walk yields no accessibility element at all, and every lookup that finds no
// match dumps the whole tree it did search. A broken harness is therefore a red test with the real
// shape printed, never a green one.
//

#if canImport(AppKit)
import AppKit
import SwiftUI
import XCTest

/// One node of the accessibility tree, flattened to the things an assistive technology is told.
struct AXNode {
    let role: NSAccessibility.Role?
    let label: String?
    let value: String?
    let selected: Bool
    let enabled: Bool
    let depth: Int
    /// The element itself, so a test can perform an action on it.
    let element: NSAccessibilityProtocol & NSObjectProtocol

    var described: String {
        let r = role?.rawValue ?? "nil"
        return "\(String(repeating: "  ", count: depth))role=\(r) label=\(label.map { "\"\($0)\"" } ?? "nil") "
            + "value=\(value.map { "\"\($0)\"" } ?? "nil") selected=\(selected) enabled=\(enabled)"
    }
}

enum AccessibilityTree {
    /// Hosts `view`, forces layout, and returns every accessibility element beneath it.
    ///
    /// No `NSWindow`: a hosting view lays out and answers accessibility without being on screen, and a
    /// command-line `swift test` process has no window-server session to rely on. Layout is forced
    /// explicitly because an un-laid-out hierarchy has no elements to find.
    static func elements<V: View>(
        of view: V,
        size: CGSize = CGSize(width: 320, height: 240),
        file: StaticString = #filePath,
        line: UInt = #line
    ) -> [AXNode] {
        let host = NSHostingView(rootView: view)
        host.frame = CGRect(origin: .zero, size: size)
        host.layoutSubtreeIfNeeded()
        // A second pass: SwiftUI resolves environment-dependent content on the first layout, and the
        // accessibility hierarchy is built from the resolved one.
        host.needsLayout = true
        host.layoutSubtreeIfNeeded()

        var found: [AXNode] = []
        walk(host, depth: 0, into: &found)

        if found.isEmpty {
            XCTFail(
                """
                The accessibility walk found no elements at all under NSHostingView.
                That is a broken harness, not a passing component: nothing was verified.
                Hosted view: \(V.self)
                """,
                file: file,
                line: line
            )
        }
        return found
    }

    /// Depth-first over `accessibilityChildren()`, which is what an assistive technology itself walks.
    /// The cap is a loop guard, not a semantic limit — these fixtures are a handful of levels deep.
    private static func walk(_ element: Any, depth: Int, into found: inout [AXNode]) {
        guard depth < 24 else { return }
        guard let node = element as? (NSAccessibilityProtocol & NSObjectProtocol) else { return }

        let role = node.accessibilityRole()
        // An element with a role, a label or a value is something a reader is told about. A bare
        // container with none of the three is a layout artefact and is walked through, not recorded.
        let label = node.accessibilityLabel()
        let value = node.accessibilityValue() as? String
            ?? (node.accessibilityValue() as? NSNumber)?.stringValue
        if role != nil || label != nil || value != nil {
            found.append(
                AXNode(
                    role: role,
                    label: label,
                    value: value,
                    selected: node.isAccessibilitySelected(),
                    enabled: node.isAccessibilityEnabled(),
                    depth: depth,
                    element: node
                )
            )
        }

        for child in node.accessibilityChildren() ?? [] {
            walk(child, depth: depth + 1, into: &found)
        }
    }

    /// The one element matching `predicate`, or a failure that prints the tree that was searched.
    ///
    /// Deliberately strict about there being exactly one: two matches mean the fixture is ambiguous and
    /// an assertion about "the checkbox" would be asserting about whichever came first.
    static func one(
        in nodes: [AXNode],
        _ what: String,
        file: StaticString = #filePath,
        line: UInt = #line,
        where predicate: (AXNode) -> Bool
    ) -> AXNode? {
        let matches = nodes.filter(predicate)
        guard matches.count == 1 else {
            XCTFail(
                """
                Expected exactly one \(what) in the accessibility tree, found \(matches.count).
                The tree that was searched:
                \(nodes.map(\.described).joined(separator: "\n"))
                """,
                file: file,
                line: line
            )
            return matches.first
        }
        return matches[0]
    }
}
#endif

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
// ── What a headless `swift test` actually gives you ──────────────────────────
//
// Measured on macos-latest, 2026-11-09: a bare `NSHostingView` that has been sized and laid out
// but never attached to an `NSWindow` answers `AXGroup` with **no children at all**. All 14
// lookups failed with "found 0" over a one-line tree. The first version of this file asserted in
// its own comments that no window was needed. That was wrong, and the guard below is the only
// reason it cost one CI run instead of shipping as a green no-op.
//
// So the host now goes into an off-screen `NSWindow`, `NSApplication` is brought up first, and the
// run loop is pumped briefly, because AppKit builds this hierarchy during a display cycle.
//
// The walk also descends `subviews` where `accessibilityChildren()` gives nothing. Those are the
// same elements answering the same NSAccessibility methods, so each node's role, value and state
// is still AppKit's own answer rather than anything read off the SwiftUI source. It is weaker in
// exactly one way, and the weakness is worth stating: it shows each element answers correctly when
// asked, not that AppKit would volunteer this hierarchy to an assistive technology in this
// configuration. `AXNode.viaSubviews` records which path found each node, and `described` prints
// it, so a reader of a failure can see which proof they are looking at.
//
// `Package.swift` records view-level accessibility testing as needing "a library such as
// ViewInspector, or an XCUITest host app". This is a third route it did not consider: no dependency,
// no host app. It is still the better of the two for this job, because ViewInspector reads back the
// modifier we wrote — the thing we already know — whereas this reads what AppKit built from it. But
// after the measurement above, do not call it "strictly stronger": an XCUITest host app would prove
// the one thing this cannot, which is that a real accessibility client is handed the hierarchy. If
// that becomes the thing worth proving, this is the wrong tool and should be replaced rather than
// stretched.
//
// ── The vacuous-pass guard ───────────────────────────────────────────────────
//
// The danger of a tree walk is that it finds nothing, asserts nothing about nothing, and reports
// success — a gate that passes over exactly the gap it was built to close. So `elements(of:)` fails
// the test when the walk reaches nothing below the host, and every lookup that finds no match dumps
// the whole tree it did search. A broken harness is therefore a red test with the real shape
// printed, never a green one. This is not hypothetical: it is what happened on the first run, and
// the printed one-line tree is why the cause took one run to find rather than a guess.
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
    /// True when this node was reached through `subviews` at a step where `accessibilityChildren()`
    /// volunteered nothing. The node's own role, value and state are AppKit's answers either way —
    /// what this flag qualifies is how it was found, not how it was read. See the file header.
    let viaSubviews: Bool
    /// The element itself, so a test can perform an action on it.
    let element: NSAccessibilityProtocol & NSObjectProtocol

    var described: String {
        let r = role?.rawValue ?? "nil"
        return "\(String(repeating: "  ", count: depth))role=\(r) label=\(label.map { "\"\($0)\"" } ?? "nil") "
            + "value=\(value.map { "\"\($0)\"" } ?? "nil") selected=\(selected) enabled=\(enabled)"
            + (viaSubviews ? " [via subviews]" : "")
    }
}

enum AccessibilityTree {
    /// Hosts `view` in an off-screen window, forces a display cycle, and returns every
    /// accessibility element beneath it.
    ///
    /// Every step here is load-bearing, and was added because the step before it was not enough —
    /// see the file header for what a bare hosting view returns.
    static func elements<V: View>(
        of view: V,
        size: CGSize = CGSize(width: 320, height: 240),
        file: StaticString = #filePath,
        line: UInt = #line
    ) -> [AXNode] {
        // AppKit's accessibility machinery belongs to an application. Touching `NSApplication.shared`
        // is what brings it up in a command-line process; `.accessory` keeps it off the Dock and out
        // of the foreground, which matters on a shared runner.
        let app = NSApplication.shared
        app.setActivationPolicy(.accessory)

        let host = NSHostingView(rootView: view)
        host.frame = CGRect(origin: .zero, size: size)

        // Off-screen, not hidden: a window positioned outside every display is still a window AppKit
        // will lay out, draw and build an accessibility hierarchy for, which `isHidden` or no window
        // at all is not. `orderFrontRegardless` because an accessory app is never "active".
        let window = NSWindow(
            contentRect: CGRect(origin: CGPoint(x: -10_000, y: -10_000), size: size),
            styleMask: [.titled],
            backing: .buffered,
            defer: false
        )
        window.contentView = host
        window.orderFrontRegardless()

        host.layoutSubtreeIfNeeded()
        // A second pass: SwiftUI resolves environment-dependent content on the first layout, and the
        // hierarchy is built from the resolved one.
        host.needsLayout = true
        host.layoutSubtreeIfNeeded()
        host.displayIfNeeded()
        // SwiftUI schedules its own work on the run loop, so laying out synchronously is not enough.
        // A short pump is the cheapest way to let that work land without waiting on a real frame.
        RunLoop.current.run(until: Date().addingTimeInterval(0.05))

        var found: [AXNode] = []
        var seen = Set<ObjectIdentifier>()
        walk(host, depth: 0, into: &found, seen: &seen, viaSubviews: false)

        // The host answers `AXGroup` and so records as a node itself. Counting it would let a walk
        // that found nothing else look like it found something, so the guard asks specifically
        // whether anything BELOW the host was reached — not for a count, which the host inflates by
        // one and which would also reject a legitimate single-element find.
        let hostID = ObjectIdentifier(host)
        if found.allSatisfy({ ObjectIdentifier($0.element) == hostID }) {
            XCTFail(
                """
                The accessibility walk reached nothing below the hosted view. That is a broken
                harness, not a passing component: nothing about \(V.self) was verified.
                What the walk did find:
                \(found.isEmpty ? "  (nothing at all)" : found.map(\.described).joined(separator: "\n"))
                """,
                file: file,
                line: line
            )
        }

        window.orderOut(nil)
        return found
    }

    /// Depth-first over `accessibilityChildren()`, falling back to `subviews` where that is empty.
    /// The cap is a loop guard, not a semantic limit — these fixtures are a handful of levels deep.
    /// `seen` keeps an element recorded once when both paths reach it.
    private static func walk(
        _ element: Any,
        depth: Int,
        into found: inout [AXNode],
        seen: inout Set<ObjectIdentifier>,
        viaSubviews: Bool
    ) {
        guard depth < 24 else { return }
        guard let node = element as? (NSAccessibilityProtocol & NSObjectProtocol) else { return }
        guard seen.insert(ObjectIdentifier(node)).inserted else { return }

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
                    viaSubviews: viaSubviews,
                    element: node
                )
            )
        }

        let children = node.accessibilityChildren() ?? []
        for child in children {
            walk(child, depth: depth + 1, into: &found, seen: &seen, viaSubviews: viaSubviews)
        }
        // Subviews are walked always, not only when `accessibilityChildren()` came back empty: a node
        // can expose some children and still host views it does not list, and `seen` makes the
        // overlap free. What the flag records is whether THIS step was the one AppKit declined to
        // volunteer — see the file header for what that distinction does and does not prove.
        if let view = node as? NSView {
            for sub in view.subviews {
                walk(sub, depth: depth + 1, into: &found, seen: &seen, viaSubviews: children.isEmpty || viaSubviews)
            }
        }
    }

    /// The one element matching `predicate`, or a failure that prints the tree that was searched.
    ///
    /// Deliberately strict about there being exactly one: two matches mean the fixture is ambiguous and
    /// an assertion about "the checkbox" would be asserting about whichever came first.
    ///
    /// Every caller passes the predicate INSIDE the parentheses, as `where: { ... }`, and must keep
    /// doing so. Written as a trailing closure it reads better — but every call here sits in a `guard`
    /// condition, where Swift parses `{ ... }` as the start of the statement body rather than as an
    /// argument, and the call then fails to compile with "missing argument for parameter 'where'".
    /// That is a parsing rule about conditions, not about this signature: a trailing closure is fine
    /// in an ordinary expression, which is why `KinetixButton(action: {}) { Text("Save") }` compiles
    /// in these same files.
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

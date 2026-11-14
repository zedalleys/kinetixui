//
// KinetixSlideMotion.swift — how Sheet, Sidebar and Toaster arrive and leave on SwiftUI.
//
// ── The concrete defect this fixes ─────────────────────────────────────────
//
// Each of these three presented itself with `.transition(.move(edge:))`, a slide across the screen, and
// none read Reduce Motion. Sheet and Sidebar animate when the caller wraps the state change in
// `withAnimation`, but the kind of movement was the library's choice, so a caller who did the documented
// thing slid a full-height panel in for a reader who had asked for less. Toaster was worse: it dismissed
// itself with its own `withAnimation { toast = nil }`, so the slide happened with no caller involved.
//
// ── What the reduced form is ───────────────────────────────────────────────
//
// A cross-fade, not nothing. Sliding is positional movement across the screen, which is what Reduce
// Motion exists to remove; fading carries the same fact ("this appeared / went away") without it, and is
// what Apple's own guidance recommends in its place. The presented state is the same either way: the
// panel is on screen when `isPresented` is true, and off it when false. `Dialog` already used `.opacity`
// and is untouched.
//
// The preference is read exactly where the other families read it: `@Environment(\.accessibilityReduceMotion)`
// in the view. Nothing here detects anything.
//

import SwiftUI

public enum KinetixSlideMotion {
    public enum NavigationDirection: Sendable {
        case forward
        case backward

        var edges: (insertion: Edge, removal: Edge) {
            switch self {
            case .forward: return (.trailing, .leading)
            case .backward: return (.leading, .trailing)
            }
        }
    }

    /// A navigation transition with edges relative to the view's layout direction.
    public static func transition(navigating direction: NavigationDirection, reduceMotion: Bool) -> AnyTransition {
        let edges = direction.edges
        return transition(insertingFrom: edges.insertion, removingTo: edges.removal, reduceMotion: reduceMotion)
    }

    /// A panel enters from and exits toward the same edge. SwiftUI resolves horizontal
    /// `.leading` and `.trailing` edges from the view's layout direction.
    public static func transition(from edge: Edge, reduceMotion: Bool) -> AnyTransition {
        transition(insertingFrom: edge, removingTo: edge, reduceMotion: reduceMotion)
    }

    /// Edges describe where a view starts on insertion and where it ends on removal.
    /// For forward navigation, insert from trailing and remove toward leading. For
    /// backward navigation, insert from leading and remove toward trailing.
    /// Pass logical edges directly so SwiftUI can mirror them in RTL.
    public static func transition(
        insertingFrom insertionEdge: Edge,
        removingTo removalEdge: Edge,
        reduceMotion: Bool
    ) -> AnyTransition {
        guard slides(reduceMotion: reduceMotion) else { return .opacity }
        if insertionEdge == removalEdge { return .move(edge: insertionEdge) }
        return .asymmetric(insertion: .move(edge: insertionEdge), removal: .move(edge: removalEdge))
    }

    /// Whether panels travel across the screen. Split out of `transition` because `AnyTransition` is not
    /// `Equatable`, so the decision, not the opaque value built from it, is what a test can assert.
    public static func slides(reduceMotion: Bool) -> Bool { !reduceMotion }

    /// The animation the library applies when IT dismisses something (Toaster's auto-dismiss). `nil`
    /// would drop the transition entirely, which loses the fade and makes the toast vanish in a frame;
    /// reduced motion keeps a short fade on the `instant` token instead.
    public static func dismissAnimation(reduceMotion: Bool) -> Animation {
        reduceMotion ? .linear(duration: KinetixSwitchMotion.durationSeconds) : .default
    }
}

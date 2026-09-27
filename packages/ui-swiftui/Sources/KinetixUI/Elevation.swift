//
// Elevation.swift — the themeable shadow ladder.
//
// The gap this closes was written down in Card.swift before it existed:
// "`shadow-sm` has no token in this package (no elevation scale yet) — a small
// literal shadow". Nine components carried a hand-tuned `.shadow(...)`, two of
// them labelled "approx", and none could be themed.
//
// The model follows Flutter's, which is the port that already has one: an
// elevation step is an ORDERED LIST of layers, not a single shadow, because
// the shared token source says so — `md` and `lg` are two layers each, and
// flattening them to one would lose the near/far pair that gives a raised
// surface its shape. SwiftUI has no multi-layer shadow primitive, but
// `.shadow` composes: applying it twice stacks, which is what `kinetixElevation`
// does.
//
// ONE THING DOES NOT SURVIVE THE PORT. CSS shadows have `spread`; SwiftUI's
// `.shadow` has no equivalent and no way to synthesise one. The canonical `lg`
// uses -1 and -2 spread to pull its layers in slightly, so the SwiftUI `lg`
// renders a touch larger than the web's. That is a real difference, stated
// here and in /docs/swiftui rather than quietly absorbed.
//

import SwiftUI

/// One shadow layer: the four things SwiftUI's `.shadow` can express.
///
/// Deliberately not a mirror of the CSS layer, which also has `spread` — see
/// the file header. A type with a field the renderer ignores would be the
/// more dishonest shape.
public struct KinetixShadowLayer: Equatable, Sendable {
    public let color: Color
    public let radius: CGFloat
    public let x: CGFloat
    public let y: CGFloat

    public init(color: Color, radius: CGFloat, x: CGFloat = 0, y: CGFloat = 0) {
        self.color = color
        self.radius = radius
        self.x = x
        self.y = y
    }

    /// The same layer casting upward — for a surface that rises from the
    /// bottom of the screen, where a downward shadow would fall behind it.
    public var flippedVertically: KinetixShadowLayer {
        KinetixShadowLayer(color: color, radius: radius, x: x, y: -y)
    }
}

/// One step on the ladder: zero or more layers, applied in order.
public struct KinetixElevation: Equatable, Sendable {
    public let layers: [KinetixShadowLayer]

    public init(_ layers: [KinetixShadowLayer]) { self.layers = layers }

    /// No shadow at all. Distinct from a transparent layer: this draws nothing.
    public static let none = KinetixElevation([])

    /// See `KinetixShadowLayer.flippedVertically`.
    public var flippedVertically: KinetixElevation {
        KinetixElevation(layers.map(\.flippedVertically))
    }
}

/// The four elevation steps, by how far the surface sits above the page.
///
/// | sm | resting surfaces — cards, a raised tab |
/// | md | lifted controls — a floating action button |
/// | lg | transient surfaces — toasts, popovers |
/// | xl | modal surfaces — dialogs, sheets |
public struct KinetixElevations: Equatable, Sendable {
    public let sm: KinetixElevation
    public let md: KinetixElevation
    public let lg: KinetixElevation
    public let xl: KinetixElevation

    public init(sm: KinetixElevation, md: KinetixElevation, lg: KinetixElevation, xl: KinetixElevation) {
        self.sm = sm
        self.md = md
        self.lg = lg
        self.xl = xl
    }
}

public extension KinetixElevations {
    /// The shipped ladder — the same four steps, with the same layers, that
    /// `KinetixShadow` gives Flutter and `--shadow-*` gives the web.
    ///
    /// Written out rather than generated: unlike colours and radii there is no
    /// Style Dictionary SwiftUI shadow format yet, so these are transcribed
    /// from the token source and `ElevationTests` asserts they still match the
    /// numbers the other ports use. Generating them is the natural follow-up.
    static let `default` = KinetixElevations(
        sm: KinetixElevation([
            KinetixShadowLayer(color: .black.opacity(0.05), radius: 2, y: 1),
        ]),
        md: KinetixElevation([
            KinetixShadowLayer(color: .black.opacity(0.12), radius: 1, y: 1),
            KinetixShadowLayer(color: Color(red: 0.404, green: 0.431, blue: 0.463).opacity(0.08), radius: 5, y: 2),
        ]),
        lg: KinetixElevation([
            KinetixShadowLayer(color: .black.opacity(0.07), radius: 6, y: 4),
            KinetixShadowLayer(color: .black.opacity(0.06), radius: 4, y: 2),
        ]),
        xl: KinetixElevation([
            KinetixShadowLayer(color: .black.opacity(0.12), radius: 24, y: 4),
        ])
    )

    /// Nothing casts a shadow. The cheapest way for a test to prove a component
    /// reads the environment, and a real option for a flat design.
    static let flat = KinetixElevations(sm: .none, md: .none, lg: .none, xl: .none)
}

private struct KinetixElevationsKey: EnvironmentKey {
    static let defaultValue = KinetixElevations.default
}

public extension EnvironmentValues {
    var kinetixElevations: KinetixElevations {
        get { self[KinetixElevationsKey.self] }
        set { self[KinetixElevationsKey.self] = newValue }
    }
}

public extension View {
    /// Apply every layer of an elevation step, in order.
    ///
    /// `.shadow` stacks, so two layers means two calls. An empty step adds no
    /// modifier at all rather than a transparent one, which keeps
    /// `KinetixElevations.flat` genuinely free.
    func kinetixElevation(_ elevation: KinetixElevation) -> some View {
        elevation.layers.reduce(AnyView(self)) { view, layer in
            AnyView(view.shadow(color: layer.color, radius: layer.radius, x: layer.x, y: layer.y))
        }
    }

    /// Override the elevation ladder for this subtree.
    func kinetixElevations(_ elevations: KinetixElevations) -> some View {
        environment(\.kinetixElevations, elevations)
    }
}

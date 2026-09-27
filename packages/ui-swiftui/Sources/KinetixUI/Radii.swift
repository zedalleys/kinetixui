//
// Radii.swift — the themeable corner-radius set.
//
// `KinetixRadius` (generated, in KinetixMotion.swift) is the shipped ladder:
// constants, compiled in, the same numbers web / Compose / Flutter get. This
// is the runtime layer over it, and the relationship is exactly the one
// `KinetixColorsSwiftUI` has with `KinetixColors` — generated values on one
// side, an overridable set on the other.
//
// Until this existed, every `Kinetix*` view wrote its corner radius as a
// literal, so a design could not change one. That is why the SwiftUI exporter
// says radius does not travel: there was nowhere for it to land. There is now.
//
// The field names are the semantic aliases the token source already defines —
// `field`, `control`, `container`, `surface` — not a new `sm`/`md`/`lg`/`xl`
// vocabulary invented here. Flutter documents the same four
// (`KinetixRadius.container` (12)), so a value means the same thing on both.
//
// ONE EXCEPTION, and it is a real one. Eight corners in five components
// (AppBar, ColorPicker, FileUpload, InputOtp, Sidebar) are `6`, which is not a
// step on the ladder — the ladder is 4 / 8 / 12 / 16. They stay literal. This
// pull request moves corners onto tokens; deciding that five components should
// look different is a separate question, and answering it silently inside a
// refactor is how a "no visual change" claim stops being true. AppBar's is the
// clearest case for a later fix: its own comment says `rounded-md`, and
// `radius-md` is 8. `RadiiTests` pins the list so it cannot grow quietly.
//

import SwiftUI

/// The corner radii a KinetixUI component resolves to, by the role the corner
/// plays rather than by size. Read from `@Environment(\.kinetixRadii)`.
///
/// | field | 4 | inputs, checkboxes, tags, tree rows |
/// | control | 8 | buttons, tabs, toggles, segmented controls |
/// | container | 12 | alerts, grouped panels |
/// | surface | 16 | cards, dialogs, sheets, message bubbles |
///
/// `full` is a large number rather than a shape: a view that wants a pill uses
/// `Capsule()` directly, which most of this package already does. It is here
/// for the cases that need a radius value in a `RoundedRectangle`.
public struct KinetixRadii: Equatable, Sendable {
    public let none: CGFloat
    public let field: CGFloat
    public let control: CGFloat
    public let container: CGFloat
    public let surface: CGFloat
    public let full: CGFloat

    public init(
        none: CGFloat = 0,
        field: CGFloat,
        control: CGFloat,
        container: CGFloat,
        surface: CGFloat,
        full: CGFloat = 9999
    ) {
        self.none = none
        self.field = field
        self.control = control
        self.container = container
        self.surface = surface
        self.full = full
    }
}

public extension KinetixRadii {
    /// The shipped ladder, read from the generated constants rather than
    /// restated — `pnpm build:tokens` moves this, nothing here does.
    static let `default` = KinetixRadii(
        none: KinetixRadius.none,
        field: KinetixRadius.field,
        control: KinetixRadius.control,
        container: KinetixRadius.container,
        surface: KinetixRadius.surface,
        full: KinetixRadius.full
    )

    /// Every corner square. Useful for a chrome-less embedded surface, and for
    /// proving in a test that a component reads the environment at all.
    static let sharp = KinetixRadii(none: 0, field: 0, control: 0, container: 0, surface: 0, full: 0)
}

private struct KinetixRadiiKey: EnvironmentKey {
    static let defaultValue = KinetixRadii.default
}

public extension EnvironmentValues {
    var kinetixRadii: KinetixRadii {
        get { self[KinetixRadiiKey.self] }
        set { self[KinetixRadiiKey.self] = newValue }
    }
}

public extension View {
    /// Override the corner radii for this subtree.
    ///
    /// `KinetixTheme(radii:)` is the usual way in; this is the escape hatch for
    /// one branch of a screen, and the direct analogue of setting
    /// `\.kinetixColors` by hand.
    func kinetixRadii(_ radii: KinetixRadii) -> some View {
        environment(\.kinetixRadii, radii)
    }
}

import SwiftUI
import XCTest
@testable import KinetixUI

/// Radius and elevation became themeable in this package; these hold the three
/// things that could quietly stop being true.
///
/// 1. The defaults still are the shipped tokens, so nothing moved visually.
/// 2. Every existing way of calling `KinetixTheme` still compiles.
/// 3. The values match the ladder the other ports ship, rather than drifting
///    into a SwiftUI-only approximation — which is what they were before.
final class ThemeTokensTests: XCTestCase {

    // MARK: radii

    func testDefaultRadiiAreTheGeneratedTokens() {
        let radii = KinetixRadii.default
        XCTAssertEqual(radii.field, KinetixRadius.field)
        XCTAssertEqual(radii.control, KinetixRadius.control)
        XCTAssertEqual(radii.container, KinetixRadius.container)
        XCTAssertEqual(radii.surface, KinetixRadius.surface)
        XCTAssertEqual(radii.full, KinetixRadius.full)
        XCTAssertEqual(radii.none, 0)
    }

    /// The semantic aliases are the sm/md/lg/xl ladder under another name. If
    /// they ever diverge, a component asking for `container` stops getting the
    /// radius the design system means by `lg`.
    func testSemanticRadiiTrackTheSizeLadder() {
        XCTAssertEqual(KinetixRadii.default.field, KinetixRadius.sm)
        XCTAssertEqual(KinetixRadii.default.control, KinetixRadius.md)
        XCTAssertEqual(KinetixRadii.default.container, KinetixRadius.lg)
        XCTAssertEqual(KinetixRadii.default.surface, KinetixRadius.xl)
    }

    func testRadiiLadderIsIncreasing() {
        let r = KinetixRadii.default
        XCTAssertLessThan(r.field, r.control)
        XCTAssertLessThan(r.control, r.container)
        XCTAssertLessThan(r.container, r.surface)
        XCTAssertLessThan(r.surface, r.full)
    }

    func testCustomRadiiAreCarriedWhole() {
        let custom = KinetixRadii(field: 1, control: 2, container: 3, surface: 4)
        XCTAssertEqual(custom.field, 1)
        XCTAssertEqual(custom.surface, 4)
        XCTAssertNotEqual(custom, .default)
        XCTAssertEqual(KinetixRadii.sharp.surface, 0, "sharp is the flat-corner set")
    }

    // MARK: elevation

    /// The canonical ladder, transcribed from the token source. These are the
    /// same numbers `KinetixShadow` gives Flutter — asserted here because the
    /// SwiftUI values are hand-written rather than generated, which is exactly
    /// the condition under which they would drift.
    func testDefaultElevationMatchesTheSharedLadder() {
        let e = KinetixElevations.default
        XCTAssertEqual(e.sm.layers.count, 1, "sm is one layer")
        XCTAssertEqual(e.md.layers.count, 2, "md is two layers")
        XCTAssertEqual(e.lg.layers.count, 2, "lg is two layers")
        XCTAssertEqual(e.xl.layers.count, 1, "xl is one layer")

        XCTAssertEqual(e.sm.layers[0].radius, 2)
        XCTAssertEqual(e.sm.layers[0].y, 1)
        XCTAssertEqual(e.lg.layers[0].radius, 6)
        XCTAssertEqual(e.lg.layers[0].y, 4)
        XCTAssertEqual(e.xl.layers[0].radius, 24)
        XCTAssertEqual(e.xl.layers[0].y, 4)
    }

    /// Blur grows with the step. A ladder whose middle rung is wider than its
    /// top one is not a ladder, and the previous hand-tuned literals were on
    /// their way there — the Fab's "shadow-lg approx" was blurrier than the
    /// toast above it.
    func testElevationBlurIncreasesWithTheStep() {
        let e = KinetixElevations.default
        let widest = { (step: KinetixElevation) in step.layers.map(\.radius).max() ?? 0 }
        XCTAssertLessThan(widest(e.sm), widest(e.lg))
        XCTAssertLessThan(widest(e.lg), widest(e.xl))
    }

    func testNoneDrawsNothingAndFlatIsAllNone() {
        XCTAssertTrue(KinetixElevation.none.layers.isEmpty)
        // Written out rather than `[.flat.sm, .flat.md, …]`: the array's element type is
        // KinetixElevation, so the leading-dot shorthand would look for `flat` on the step.
        let flat = KinetixElevations.flat
        for step in [flat.sm, flat.md, flat.lg, flat.xl] {
            XCTAssertTrue(step.layers.isEmpty)
        }
    }

    /// A sheet rises from the bottom edge, so its shadow casts up. Flipping is
    /// a sign change on y and nothing else — the colour and blur must survive,
    /// or the flipped shadow is a different shadow.
    func testFlippingOnlyChangesDirection() {
        let step = KinetixElevations.default.xl
        let flipped = step.flippedVertically
        XCTAssertEqual(flipped.layers.count, step.layers.count)
        for (a, b) in zip(step.layers, flipped.layers) {
            XCTAssertEqual(b.y, -a.y)
            XCTAssertEqual(b.radius, a.radius)
            XCTAssertEqual(b.color, a.color)
        }
        XCTAssertEqual(flipped.flippedVertically, step, "flipping twice is the original")
    }

    // MARK: KinetixTheme source compatibility

    /// Every call shape that compiled before this change still compiles. These
    /// assert nothing at runtime on purpose: the compiler is the assertion, and
    /// a missing default argument would fail the build rather than a test.
    func testExistingInitializersStillCompile() {
        _ = KinetixTheme { EmptyView() }
        _ = KinetixTheme(light: .light, dark: .dark) { EmptyView() }
        _ = KinetixTheme(light: .light) { EmptyView() }
        _ = KinetixTheme(dark: .dark) { EmptyView() }
    }

    func testNewInitializersCompose() {
        _ = KinetixTheme(radii: .sharp) { EmptyView() }
        _ = KinetixTheme(elevations: .flat) { EmptyView() }
        _ = KinetixTheme(radii: .sharp, elevations: .flat) { EmptyView() }
        _ = KinetixTheme(
            light: .light,
            dark: .dark,
            radii: KinetixRadii(field: 2, control: 4, container: 6, surface: 8),
            elevations: .flat
        ) { EmptyView() }
    }

    func testViewModifiersExist() {
        _ = EmptyView().kinetixRadii(.sharp)
        _ = EmptyView().kinetixElevations(.flat)
        _ = EmptyView().kinetixElevation(KinetixElevations.default.sm)
        _ = EmptyView().kinetixElevation(.none)
    }

    // MARK: the environment actually carries the override

    /// `EnvironmentValues` is a value type, so the round trip can be checked
    /// without rendering — which is the part SwiftUI makes hard to test.
    func testEnvironmentCarriesCustomTokens() {
        var values = EnvironmentValues()
        XCTAssertEqual(values.kinetixRadii, .default)
        XCTAssertEqual(values.kinetixElevations, .default)

        let radii = KinetixRadii(field: 9, control: 9, container: 9, surface: 9)
        values.kinetixRadii = radii
        values.kinetixElevations = .flat

        XCTAssertEqual(values.kinetixRadii, radii)
        XCTAssertEqual(values.kinetixRadii.surface, 9)
        XCTAssertEqual(values.kinetixElevations, .flat)
        XCTAssertTrue(values.kinetixElevations.xl.layers.isEmpty)
    }

    /// Colours were already themeable and must stay that way — this change adds
    /// two environment keys beside that one rather than reworking it.
    func testColoursAreUntouched() {
        var values = EnvironmentValues()
        values.kinetixColors = .dark
        XCTAssertEqual(values.kinetixColors.background, KinetixColors.dark.background)
    }
}

/// The generated theme, compiled.
///
/// `Generated/CreateThemeFixture.swift` is written by `kinetixui preset swiftui` and committed so the
/// macOS runner type-checks it — `ContrastTests` then runs WCAG AA over its colours. These cover the
/// other two thirds: that the exporter's radii and elevation are values this package's initializers
/// actually accept, and that the four-argument `KinetixTheme` the generated header recommends is real.
///
/// Nothing here asserts a number. The compiler is the assertion — a generated `KinetixRadii(field:…)`
/// whose labels or types drifted would fail the build, which is the failure worth catching, and it
/// would fail here rather than in someone's app.
final class GeneratedThemeTests: XCTestCase {
    func testGeneratedRadiiAndElevationsAreTheRealTypes() {
        let radii: KinetixRadii = CreateThemeFixture.radii
        let elevations: KinetixElevations = CreateThemeFixture.elevations
        XCTAssertGreaterThan(radii.surface, 0, "the fixture design softens its corners")
        XCTAssertFalse(elevations.sm.layers.isEmpty, "the fixture design raises its surfaces")
    }

    /// The exact call the generated file's own header tells the reader to write.
    func testTheSuggestedInitializerCompiles() {
        _ = KinetixTheme(
            light: CreateThemeFixture.light,
            dark: CreateThemeFixture.dark,
            radii: CreateThemeFixture.radii,
            elevations: CreateThemeFixture.elevations
        ) {
            EmptyView()
        }
    }

    /// A generated theme is still a theme: every layer has to survive the modifier that applies it.
    func testGeneratedElevationApplies() {
        _ = EmptyView().kinetixElevation(CreateThemeFixture.elevations.lg)
        _ = EmptyView().kinetixRadii(CreateThemeFixture.radii)
    }
}

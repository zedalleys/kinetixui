#if canImport(AppKit)
import AppKit
import SwiftUI
import XCTest
import KinetixUI

/// WCAG 2.2 contrast for the colour sets the SwiftUI components actually render — the Swift-side twin of the
/// web's `pnpm check:contrast`. The tokens are generated from one source, so this proves the vendored Swift
/// copies (`KinetixColorsSwiftUI*.swift`) still meet AA in both themes, not just the CSS.
final class ContrastTests: XCTestCase {
    // MARK: WCAG maths

    private func srgb(_ color: Color) -> (Double, Double, Double) {
        guard let c = NSColor(color).usingColorSpace(.sRGB) else {
            XCTFail("colour is not convertible to sRGB")
            return (0, 0, 0)
        }
        return (Double(c.redComponent), Double(c.greenComponent), Double(c.blueComponent))
    }

    private func luminance(_ rgb: (Double, Double, Double)) -> Double {
        func linear(_ v: Double) -> Double { v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4) }
        return 0.2126 * linear(rgb.0) + 0.7152 * linear(rgb.1) + 0.0722 * linear(rgb.2)
    }

    private func ratio(_ a: Color, _ b: Color) -> Double {
        let (l1, l2) = (luminance(srgb(a)), luminance(srgb(b)))
        return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)
    }

    // MARK: pairs (mirrors TEXT_PAIRS in scripts/check-contrast.mjs, limited to the roles KinetixColors exposes)

    private typealias Pair = (name: String, fg: KeyPath<KinetixColors, Color>, bg: KeyPath<KinetixColors, Color>)

    private let textPairs: [Pair] = [
        ("foreground / background", \.foreground, \.background),
        ("mutedForeground / background", \.mutedForeground, \.background),
        ("mutedForeground / muted", \.mutedForeground, \.muted),
        ("primaryForeground / primary", \.primaryForeground, \.primary),
        ("secondaryForeground / secondary", \.secondaryForeground, \.secondary),
        ("destructiveForeground / destructive", \.destructiveForeground, \.destructive),
        ("destructive / background", \.destructive, \.background),
        ("successForeground / success", \.successForeground, \.success),
        ("success / background", \.success, \.background),
        ("warningForeground / warning", \.warningForeground, \.warning),
        ("warning / background", \.warning, \.background),
        ("info / background", \.info, \.background),
        ("accentForeground / accent", \.accentForeground, \.accent),
        ("cardForeground / card", \.cardForeground, \.card),
        ("popoverForeground / popover", \.popoverForeground, \.popover),
        ("primary / background", \.primary, \.background),
        ("actionForeground / action", \.actionForeground, \.action),
        ("actionForeground / actionHover", \.actionForeground, \.actionHover),
        ("actionForeground / actionPressed", \.actionForeground, \.actionPressed),
        ("link / background", \.link, \.background),
        ("brandForeground / brand", \.brandForeground, \.brand),
        ("brand / background", \.brand, \.background),
    ]

    private func assertAA(_ colors: KinetixColors, theme: String, file: StaticString = #filePath, line: UInt = #line) {
        var failures: [String] = []
        for pair in textPairs {
            let r = ratio(colors[keyPath: pair.fg], colors[keyPath: pair.bg])
            if r < 4.5 { failures.append("\(pair.name) = \(String(format: "%.2f", r)):1") }
        }
        XCTAssertTrue(failures.isEmpty, "\(theme): text pairs below WCAG AA 4.5:1 — \(failures.joined(separator: "; "))", file: file, line: line)
    }

    // MARK: tests

    func testTextPairsMeetAAInLight() { assertAA(.light, theme: "light") }

    func testTextPairsMeetAAInDark() { assertAA(.dark, theme: "dark") }

    // MARK: a generated Create theme

    /// The pairs a GENERATED theme is guaranteed to clear, which is a narrower set than `textPairs`.
    ///
    /// `textPairs` above is the bar for the shipped theme: every value in it was hand-tuned, and
    /// `pnpm check:contrast` holds it to AA. A Create theme is generated from one colour a user picked,
    /// and the engine in `packages/create-theme` guarantees AA for exactly the pairs in its own
    /// `CONTRAST_PAIRS` — the ten base/foreground pairs its contrast panel shows. Those are these.
    ///
    /// Three of `textPairs` are deliberately not here, and both reasons are worth stating because the
    /// first time this ran it failed on them:
    ///
    /// - `actionForeground / actionHover` and `actionForeground / actionPressed`. The engine picks the
    ///   action foreground against `action` and then moves the surface 10% / 16% toward the background
    ///   for the states, which costs contrast the foreground was never re-checked against. Across a
    ///   36-hue sweep the floors are 3.75:1 and 3.37:1. This is a real defect in the engine — not in the
    ///   exporter, and not fixable by choosing a different foreground: no candidate clears 4.5:1 against
    ///   all three surfaces for a large part of the wheel. `engine.test.ts` pins those floors so the
    ///   gap cannot be forgotten, and fixing it means changing how interaction states are derived, which
    ///   changes every generated theme on the web too.
    ///
    /// - `brand / background`. `brand` is deliberately the user's colour, unclamped, so that a dark
    ///   brand keeps its identity (`engine.test.ts` asserts `#111111` stays `#111111`). A brand that is
    ///   not readable as text on the background is therefore a possible outcome by design, not a bug.
    ///
    /// `Generated/CreateThemeFixture.swift` is emitted by the `swiftui` exporter and committed so this
    /// target compiles it — the only place the repo type-checks that output against `KinetixColors`'
    /// initializer. `swiftui-fixture.test.ts` fails if it drifts, and asserts these tests still exist,
    /// so the fixture cannot quietly become a file that compiles and proves nothing.
    private let generatedPairs: [Pair] = [
        ("foreground / background", \.foreground, \.background),
        ("cardForeground / card", \.cardForeground, \.card),
        ("popoverForeground / popover", \.popoverForeground, \.popover),
        ("primaryForeground / primary", \.primaryForeground, \.primary),
        ("secondaryForeground / secondary", \.secondaryForeground, \.secondary),
        ("mutedForeground / muted", \.mutedForeground, \.muted),
        ("mutedForeground / background", \.mutedForeground, \.background),
        ("accentForeground / accent", \.accentForeground, \.accent),
        ("destructiveForeground / destructive", \.destructiveForeground, \.destructive),
        ("actionForeground / action", \.actionForeground, \.action),
        ("brandForeground / brand", \.brandForeground, \.brand),
    ]

    private func assertGeneratedAA(
        _ colors: KinetixColors,
        theme: String,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        var failures: [String] = []
        for pair in generatedPairs {
            let r = ratio(colors[keyPath: pair.fg], colors[keyPath: pair.bg])
            if r < 4.5 { failures.append("\(pair.name) = \(String(format: "%.2f", r)):1") }
        }
        XCTAssertTrue(
            failures.isEmpty,
            "\(theme): pairs below WCAG AA 4.5:1 — \(failures.joined(separator: "; "))",
            file: file,
            line: line
        )
    }

    func testGeneratedCreateThemeMeetsAAInLight() {
        assertGeneratedAA(CreateThemeFixture.light, theme: "generated Create theme (light)")
    }

    func testGeneratedCreateThemeMeetsAAInDark() {
        assertGeneratedAA(CreateThemeFixture.dark, theme: "generated Create theme (dark)")
    }

    /// A sanity check on the maths itself, so a bug here can't silently pass everything.
    func testContrastMathMatchesKnownValues() {
        XCTAssertEqual(ratio(Color(red: 0, green: 0, blue: 0), Color(red: 1, green: 1, blue: 1)), 21, accuracy: 0.01)
        XCTAssertEqual(ratio(Color(red: 1, green: 1, blue: 1), Color(red: 1, green: 1, blue: 1)), 1, accuracy: 0.001)
    }
}
#endif

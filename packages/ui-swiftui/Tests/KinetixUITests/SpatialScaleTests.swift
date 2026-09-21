import XCTest
import KinetixUI

/// The spatial scale reaches SwiftUI as `KinetixSpacing` / `KinetixRadius`, generated from the same tokens as web,
/// Compose and Flutter. KinetixUI's grid is 8-unit with a 4-unit half-step, so every value is a multiple of 4.
final class SpatialScaleTests: XCTestCase {
    private let spacing: [(String, Double)] = [
        ("space0", KinetixSpacing.space0), ("space1", KinetixSpacing.space1), ("space2", KinetixSpacing.space2),
        ("space3", KinetixSpacing.space3), ("space4", KinetixSpacing.space4), ("space5", KinetixSpacing.space5),
        ("space6", KinetixSpacing.space6), ("space7", KinetixSpacing.space7), ("space8", KinetixSpacing.space8),
        ("space10", KinetixSpacing.space10), ("space12", KinetixSpacing.space12), ("space16", KinetixSpacing.space16),
        ("space20", KinetixSpacing.space20), ("space24", KinetixSpacing.space24), ("space32", KinetixSpacing.space32),
    ]

    func testEverySpacingStepIsAMultipleOfFour() {
        for (name, value) in spacing {
            XCTAssertEqual(value.truncatingRemainder(dividingBy: 4), 0, "\(name) = \(value) is off the 4-unit grid")
        }
    }

    func testSpacingStepNumberIsValueOverFour() {
        // `spaceN` is N × 4 (the same numbering Tailwind uses), so a token name always tells you its value
        let expected: [String: Double] = [
            "space0": 0, "space1": 4, "space2": 8, "space3": 12, "space4": 16, "space5": 20, "space6": 24, "space7": 28,
            "space8": 32, "space10": 40, "space12": 48, "space16": 64, "space20": 80, "space24": 96, "space32": 128,
        ]
        for (name, value) in spacing { XCTAssertEqual(value, expected[name], "\(name)") }
    }

    func testSpacingIsStrictlyIncreasing() {
        let values = spacing.map(\.1)
        XCTAssertEqual(values, values.sorted())
        XCTAssertEqual(Set(values).count, values.count, "no duplicate steps")
    }

    func testRadiiAreOnTheGridExceptNoneAndFull() {
        let radii: [(String, Double)] = [
            ("sm", KinetixRadius.sm), ("md", KinetixRadius.md), ("lg", KinetixRadius.lg),
            ("xl", KinetixRadius.xl), ("xxl", KinetixRadius.xxl),
        ]
        for (name, value) in radii {
            XCTAssertEqual(value.truncatingRemainder(dividingBy: 4), 0, "radius \(name) = \(value) is off the 4-unit grid")
        }
        XCTAssertEqual(KinetixRadius.none, 0)
        XCTAssertGreaterThan(KinetixRadius.full, KinetixRadius.xxl, "full is a pill / circle")
    }

    func testRadiusRoleAliasesPointAtTheirSteps() {
        XCTAssertEqual(KinetixRadius.field, KinetixRadius.sm)
        XCTAssertEqual(KinetixRadius.control, KinetixRadius.md)
        XCTAssertEqual(KinetixRadius.container, KinetixRadius.lg)
        XCTAssertEqual(KinetixRadius.surface, KinetixRadius.xl)
    }

    func testMotionDurationsAreOrdered() {
        XCTAssertTrue(KinetixDuration.instant < KinetixDuration.fast)
        XCTAssertTrue(KinetixDuration.fast < KinetixDuration.base)
        XCTAssertTrue(KinetixDuration.base < KinetixDuration.slow)
        XCTAssertTrue(KinetixDuration.slow < KinetixDuration.slower)
    }
}

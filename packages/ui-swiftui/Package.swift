// swift-tools-version: 5.9
import PackageDescription

// KinetixUI — SwiftUI port. Standalone SwiftPM package, deliberately NOT a
// pnpm/npm workspace member (no package.json), so it's invisible to
// `pnpm install` / Turborepo — same setup as packages/ui-compose.
//
// .macOS(.v13) is what lets `swift build` succeed on a macOS CI runner
// with no simulator (SwiftUI compiles for macOS directly). The floor is
// 13 / iOS 16 because KinetixButton uses the View-level `.tracking(_:)`
// text modifier, which is iOS 16 / macOS 13+.
let package = Package(
    name: "KinetixUI",
    platforms: [
        .iOS(.v16),
        .macOS(.v13),
    ],
    products: [
        .library(name: "KinetixUI", targets: ["KinetixUI"]),
    ],
    targets: [
        .target(name: "KinetixUI"),
    ]
)

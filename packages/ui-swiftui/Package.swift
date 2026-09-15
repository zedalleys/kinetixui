// swift-tools-version: 6.0
import PackageDescription

// KinetixUI — SwiftUI port. Standalone SwiftPM package, deliberately NOT a
// pnpm/npm workspace member (no package.json), so it's invisible to
// `pnpm install` / Turborepo — same setup as packages/ui-compose.
//
// .macOS(.v13) is what lets `swift build` succeed on a macOS CI runner
// with no simulator (SwiftUI compiles for macOS directly). The floor is
// 13 / iOS 16 because KinetixButton uses the View-level `.tracking(_:)`
// text modifier, which is iOS 16 / macOS 13+.
//
// Manifest bumped to the tools-version 6.0 format (latest CI toolchain is
// Swift 6.3+) but the package opts back into the Swift 5 language mode —
// tools-version 6.0 defaults to the Swift 6 language mode, which turns on
// strict concurrency checking across every file. That's a real, separate
// migration (actor isolation / Sendable audits) this dependency-version
// pass doesn't attempt; revisit as its own effort.
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
    ],
    swiftLanguageModes: [.v5]
)

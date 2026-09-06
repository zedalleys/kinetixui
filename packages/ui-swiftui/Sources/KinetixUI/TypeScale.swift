import SwiftUI

/// Named `Font`s from the KinetixUI type scale (`KinetixType.swift`,
/// generated — `pnpm build:tokens` / `pnpm vendor:swiftui`). Each carries
/// the token's family + size + weight; apply with `.font(.kinetixBody)`
/// etc. Letter-spacing stays a sibling `.tracking(…)` on the `Text`
/// (SwiftUI has no single "text style" that also carries tracking).
public extension Font {
    static var kinetixDisplayLg: Font { KinetixType.displayLg.font }
    static var kinetixDisplayMd: Font { KinetixType.displayMd.font }
    static var kinetixDisplaySm: Font { KinetixType.displaySm.font }
    static var kinetixHeadlineLg: Font { KinetixType.headlineLg.font }
    static var kinetixHeadlineMd: Font { KinetixType.headlineMd.font }
    static var kinetixHeadlineSm: Font { KinetixType.headlineSm.font }
    static var kinetixTitleLg: Font { KinetixType.titleLg.font }
    static var kinetixTitleMd: Font { KinetixType.titleMd.font }
    static var kinetixTitleSm: Font { KinetixType.titleSm.font }
    static var kinetixTitleDialog: Font { KinetixType.titleDialog.font }
    static var kinetixLabelLg: Font { KinetixType.labelLg.font }
    static var kinetixLabelMd: Font { KinetixType.labelMd.font }
    static var kinetixLabelSm: Font { KinetixType.labelSm.font }
    static var kinetixBody: Font { KinetixType.bodyMd.font }
    static var kinetixBodyLg: Font { KinetixType.bodyLg.font }
    static var kinetixBodySm: Font { KinetixType.bodySm.font }
}

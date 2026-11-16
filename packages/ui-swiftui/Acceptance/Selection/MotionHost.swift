import KinetixUI
import SwiftUI

@main
struct SelectionLab: App {
    var body: some Scene { WindowGroup { SelectionHost() } }
}

struct SelectionHost: View {
    private let args = ProcessInfo.processInfo.arguments
    @State private var selected = 0
    @State private var stage = 0

    var body: some View {
        VStack(spacing: 65) {
            KinetixTabsList {
                KinetixTabsTrigger("First tab", isSelected: selected == 0) { selected = 0 }
                KinetixTabsTrigger("Middle tab", isSelected: selected == 1) { selected = 1 }
                    .disabled(!args.contains("--timeline"))
                KinetixTabsTrigger("Last tab", isSelected: selected == 2) { selected = 2 }
            }
            KinetixSegmentedControl {
                KinetixSegmentedControlItem("First segment", isSelected: selected == 0) { selected = 0 }
                KinetixSegmentedControlItem("Middle segment", isSelected: selected == 1) { selected = 1 }
                    .disabled(!args.contains("--timeline"))
                KinetixSegmentedControlItem("Last segment", isSelected: selected == 2) { selected = 2 }
            }
            Text("Selected: \(selected)").foregroundStyle(.white).accessibilityIdentifier("selected-index")
        }
        .frame(maxWidth: 345)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.black, ignoresSafeAreaEdges: .all)
        .environment(\.kinetixColors, palette)
        .environment(\.layoutDirection, args.contains("--rtl") ? .rightToLeft : .leftToRight)
        .environment(\._accessibilityReduceMotion, args.contains("--reduce"))
        .overlay(alignment: .topLeading) {
            if args.contains("--timeline") {
                Color(red: 0, green: 1, blue: 0)
                    .frame(width: CGFloat(20 + stage * 20), height: 12)
                    .padding(.top, 16)
                    .padding(.leading, 8)
                    .accessibilityHidden(true)
            }
        }
        .task {
            guard args.contains("--timeline") else { return }
            do {
                try await Task.sleep(for: .milliseconds(1200))
                step(1, 2)
                try await Task.sleep(for: .milliseconds(700))
                step(2, 0)
                try await Task.sleep(for: .milliseconds(700))
                step(3, 2)
                try await Task.sleep(for: .milliseconds(100))
                step(4, 1)
                try await Task.sleep(for: .milliseconds(700))
                step(5, 0)
                try await Task.sleep(for: .milliseconds(700))
                step(6, 0)
            } catch { return }
        }
    }

    private func step(_ stage: Int, _ selected: Int) {
        self.stage = stage
        self.selected = selected
    }

    private var palette: KinetixColors {
        let c = KinetixColors.light
        return KinetixColors(
            primary: c.primary, primaryForeground: c.primaryForeground,
            action: c.action, actionForeground: c.actionForeground, actionHover: c.actionHover,
            actionPressed: c.actionPressed, link: c.link, focus: c.focus, brand: c.brand,
            brandForeground: c.brandForeground, secondary: c.secondary,
            secondaryForeground: c.secondaryForeground, destructive: c.destructive,
            destructiveForeground: c.destructiveForeground, foreground: .black,
            background: Color(red: 1, green: 0, blue: 1), border: c.border, input: c.input,
            ring: c.ring, muted: .gray, mutedForeground: .black, accent: c.accent,
            accentForeground: c.accentForeground, tertiary: c.tertiary,
            tertiaryForeground: c.tertiaryForeground, warning: c.warning,
            warningForeground: c.warningForeground, card: c.card, cardForeground: c.cardForeground,
            success: c.success, successForeground: c.successForeground, info: c.info,
            infoForeground: c.infoForeground, popover: c.popover, popoverForeground: c.popoverForeground,
            chart: c.chart
        )
    }
}

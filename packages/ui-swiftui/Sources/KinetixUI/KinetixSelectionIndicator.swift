import SwiftUI

private struct SelectionIndicatorScope: EnvironmentKey {
    static let defaultValue: Namespace.ID? = nil
}

private extension EnvironmentValues {
    var selectionIndicatorScope: Namespace.ID? {
        get { self[SelectionIndicatorScope.self] }
        set { self[SelectionIndicatorScope.self] = newValue }
    }
}

private struct IndicatorItem: Equatable {
    let scope: Namespace.ID
    let id: Namespace.ID
    let selected: Bool
    let enabled: Bool
    let frame: CGRect
}

private struct IndicatorItems: PreferenceKey {
    static var defaultValue: [IndicatorItem] { [] }

    static func reduce(value: inout [IndicatorItem], nextValue: () -> [IndicatorItem]) {
        value.append(contentsOf: nextValue())
    }
}

struct KinetixSelectionIndicatorItem: ViewModifier {
    @Environment(\.selectionIndicatorScope) private var scope
    @Environment(\.kinetixColors) private var colors
    @Environment(\.kinetixRadii) private var radii
    @Environment(\.kinetixElevations) private var elevations
    @Environment(\.isEnabled) private var isEnabled
    @Namespace private var id
    let selected: Bool

    func body(content: Content) -> some View {
        let drawsLocalSurface = selected && scope == nil
        content
            .background(
                drawsLocalSurface ? colors.background : .clear,
                in: RoundedRectangle(cornerRadius: radii.control, style: .continuous)
            )
            .kinetixElevation(drawsLocalSurface ? elevations.sm : .none)
            .background {
                if let scope {
                    GeometryReader { proxy in
                        Color.clear.preference(key: IndicatorItems.self, value: [
                            IndicatorItem(scope: scope, id: id, selected: selected, enabled: isEnabled, frame: proxy.frame(in: .named(scope)))
                        ])
                    }
                }
            }
    }
}

struct KinetixSelectionIndicator: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.layoutDirection) private var direction
    @Environment(\.kinetixColors) private var colors
    @Environment(\.kinetixRadii) private var radii
    @Environment(\.kinetixElevations) private var elevations
    @Namespace private var scope
    @State private var items: [IndicatorItem] = []
    @State private var previousDirection: LayoutDirection?
    @State private var resetsIndicator = false

    static func animation(reduceMotion: Bool, stableGeometry: Bool) -> Animation? {
        guard !reduceMotion && stableGeometry else { return nil }
        let duration = KinetixDuration.base.components
        let seconds = Double(duration.seconds) + Double(duration.attoseconds) / 1e18
        let curve = KinetixEasing.emphasized
        return .timingCurve(curve.0, curve.1, curve.2, curve.3, duration: seconds)
    }

    func body(content: Content) -> some View {
        content
            .environment(\.selectionIndicatorScope, scope)
            .coordinateSpace(name: scope)
            .background(alignment: .topLeading) {
                // Keep the coordinate system physical so RTL offsets are applied once.
                ZStack(alignment: .topLeading) {
                    Color.clear
                    let selected = items.filter(\.selected)
                    if selected.count == 1, let item = selected.first {
                        surface(item: item)
                    } else {
                        ForEach(selected, id: \.id) { item in
                            surface(item: item)
                        }
                    }
                }
                .environment(\.layoutDirection, .leftToRight)
                .allowsHitTesting(false)
                .accessibilityHidden(true)
            }
            .onPreferenceChange(IndicatorItems.self) { reported in
                let next = reported.filter { $0.scope == scope }
                let stableGeometry = previousDirection == direction &&
                    next.count == items.count &&
                    zip(next, items).allSatisfy { $0.id == $1.id && $0.frame == $1.frame }
                let canTravel = stableGeometry &&
                    next.filter(\.selected).count == 1 && items.filter(\.selected).count == 1
                withAnimation(Self.animation(reduceMotion: reduceMotion, stableGeometry: canTravel)) {
                    items = next
                    previousDirection = direction
                }
                if !canTravel { resetsIndicator.toggle() }
            }
            .onChange(of: reduceMotion) { _ in
                // Replacing only the decorative surface cancels its in-flight presentation.
                resetsIndicator.toggle()
            }
    }

    private func surface(item: IndicatorItem) -> some View {
        RoundedRectangle(cornerRadius: radii.control, style: .continuous)
            .fill(colors.background)
            .kinetixElevation(elevations.sm)
            .frame(width: item.frame.width, height: item.frame.height)
            .offset(x: item.frame.minX, y: item.frame.minY)
            .opacity(item.enabled ? 1 : 0.5)
            .id(resetsIndicator)
    }
}

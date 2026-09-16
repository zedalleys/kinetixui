//
// ButtonGroup.swift — KinetixButtonGroup / KinetixButtonGroupSeparator / KinetixButtonGroupText.
//
// Mirrors packages/ui/src/components/button-group.tsx. Visually joins a
// row (or column) of independent KinetixButtons into a connected cluster.
// The web port uses CSS arbitrary-child-selectors to override each
// `<Button>`'s own border/radius; SwiftUI has no equivalent cross-child
// override without changing KinetixButton's own API, so this port takes
// the same documented simplification as the Compose port: a shared outer
// clip + border around the whole group (squares off the group's *outer*
// corners), while each child keeps drawing its own full corner radius at
// the internal seams — subtle in practice for the icon-toolbar use case
// this is built for. Gap-fill addition (not in the original Figma source)
// — matches the shadcn/ui Button Group API shape.
//

import SwiftUI

public enum KinetixButtonGroupOrientation {
    case horizontal, vertical
}

public struct KinetixButtonGroup<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let orientation: KinetixButtonGroupOrientation
    private let content: Content

    public init(orientation: KinetixButtonGroupOrientation = .horizontal, @ViewBuilder content: () -> Content) {
        self.orientation = orientation
        self.content = content()
    }

    public var body: some View {
        let shape = RoundedRectangle(cornerRadius: 8, style: .continuous) // radius/md
        Group {
            if orientation == .horizontal {
                HStack(spacing: 0) { content }
            } else {
                VStack(spacing: 0) { content }
            }
        }
        .clipShape(shape)
        .overlay { shape.strokeBorder(colors.border, lineWidth: 1) }
    }
}

public struct KinetixButtonGroupSeparator: View {
    @Environment(\.kinetixColors) private var colors
    private let orientation: KinetixButtonGroupOrientation

    public init(orientation: KinetixButtonGroupOrientation = .vertical) {
        self.orientation = orientation
    }

    public var body: some View {
        if orientation == .vertical {
            colors.border.frame(width: 1).padding(.vertical, 4) // spacing/1
        } else {
            colors.border.frame(height: 1).padding(.horizontal, 4) // spacing/1
        }
    }
}

/// A static, non-interactive label segment inside a group — e.g. a unit or a prefix next to steppers.
public struct KinetixButtonGroupText<Content: View>: View {
    @Environment(\.kinetixColors) private var colors
    private let content: Content

    public init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    public var body: some View {
        let shape = RoundedRectangle(cornerRadius: 8, style: .continuous) // radius/md
        HStack(spacing: 6) { content } // gap-1.5, off the shared spacing scale — same call as KinetixBadge
            .padding(.horizontal, 12) // spacing/3
            .background(colors.muted, in: shape)
            .overlay { shape.strokeBorder(colors.border, lineWidth: 1) }
    }
}

extension KinetixButtonGroupText where Content == Text {
    public init(_ text: String) {
        self.init { Text(text).font(.kinetixLabelMd).foregroundStyle(.primary) }
    }
}

//
// NotificationCenter.swift — KinetixNotificationCenter family.
//
// Mirrors packages/ui/src/components/notification-center.tsx: a bell
// trigger opening a popover list of read/unread items with a "mark all
// read" action. Built directly on SwiftUI's `.popover` (same as
// KinetixPopover) rather than a hand-rolled overlay. Unlike the Compose/
// Flutter ports, SF Symbols give a real system bell glyph — no "no icon
// library" gap to document here.
//

import SwiftUI

public struct KinetixNotificationCenterTrigger: View {
    @Environment(\.kinetixColors) private var colors
    private let unreadCount: Int
    private let action: () -> Void

    public init(unreadCount: Int = 0, action: @escaping () -> Void) {
        self.unreadCount = unreadCount
        self.action = action
    }

    public var body: some View {
        Button(action: action) {
            Image(systemName: "bell")
                .font(.system(size: 18))
                .foregroundStyle(colors.foreground)
                .frame(width: 36, height: 36)
        }
        .buttonStyle(.plain)
        .overlay(alignment: .topTrailing) {
            if unreadCount > 0 {
                Circle()
                    .fill(colors.destructive)
                    .frame(width: 8, height: 8)
                    .overlay(Circle().strokeBorder(colors.background, lineWidth: 2))
            }
        }
    }
}

public struct KinetixNotificationCenter<Anchor: View, Content: View>: View {
    @Environment(\.kinetixColors) private var colors

    @Binding private var isPresented: Bool
    private let onMarkAllRead: (() -> Void)?
    private let anchor: Anchor
    private let content: Content

    public init(
        isPresented: Binding<Bool>,
        onMarkAllRead: (() -> Void)? = nil,
        @ViewBuilder anchor: () -> Anchor,
        @ViewBuilder content: () -> Content
    ) {
        self._isPresented = isPresented
        self.onMarkAllRead = onMarkAllRead
        self.anchor = anchor()
        self.content = content()
    }

    public var body: some View {
        anchor
            .popover(isPresented: $isPresented) {
                VStack(alignment: .leading, spacing: 0) {
                    HStack {
                        Text("Notifications")
                            .font(.kinetixTitleSm.weight(.medium))
                            .foregroundStyle(colors.foreground)
                        Spacer()
                        if let onMarkAllRead {
                            Button("Mark all read", action: onMarkAllRead)
                                .font(.kinetixLabelMd.weight(.medium))
                                .foregroundStyle(colors.primary)
                                .buttonStyle(.plain)
                        }
                    }
                    .padding(16) // spacing/4

                    ScrollView {
                        VStack(spacing: 0) { content }
                    }
                    .frame(maxHeight: 320)
                }
                .frame(minWidth: 320) // off the shared spacing scale
                .background(colors.popover)
            }
    }
}

public struct KinetixNotificationItem: View {
    @Environment(\.kinetixColors) private var colors

    private let title: String
    private let description: String?
    private let time: String?
    private let unread: Bool
    private let onSelect: (() -> Void)?

    public init(
        _ title: String,
        description: String? = nil,
        time: String? = nil,
        unread: Bool = false,
        onSelect: (() -> Void)? = nil
    ) {
        self.title = title
        self.description = description
        self.time = time
        self.unread = unread
        self.onSelect = onSelect
    }

    public var body: some View {
        Button(action: { onSelect?() }) {
            HStack(alignment: .top, spacing: 12) { // spacing/3
                Circle()
                    .fill(unread ? colors.primary : .clear)
                    .frame(width: 8, height: 8)
                    .padding(.top, 6)

                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.kinetixBodySm)
                        .fontWeight(unread ? .medium : .regular)
                        .foregroundStyle(colors.foreground)
                        .lineLimit(1)
                    if let description {
                        Text(description)
                            .font(.kinetixBodySm)
                            .foregroundStyle(colors.mutedForeground)
                            .lineLimit(1)
                    }
                    if let time {
                        Text(time)
                            .font(.kinetixLabelSm)
                            .foregroundStyle(colors.mutedForeground)
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 16) // spacing/4
            .padding(.vertical, 12) // spacing/3
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(onSelect == nil)
    }
}

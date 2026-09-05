//
// FileUpload.swift — KinetixFileUpload family.
//
// Mirrors packages/ui/src/components/file-upload.tsx. Presentational only
// (same as the source and the Compose port): it reports "browse" intent
// via `onBrowse` and renders whatever `files` you hand back, each with
// its own status. Web drag-and-drop has no touch idiom — the drop zone
// is a large tap target; wire `onBrowse` to a `.fileImporter` yourself.
//

import SwiftUI

public enum KinetixFileStatus {
    case pending, uploading, done, error
}

public struct KinetixFileItem: Identifiable {
    public let id = UUID()
    public let name: String
    public let status: KinetixFileStatus
    public let detail: String?

    public init(name: String, status: KinetixFileStatus = .pending, detail: String? = nil) {
        self.name = name
        self.status = status
        self.detail = detail
    }
}

public struct KinetixFileUpload: View {
    @Environment(\.kinetixColors) private var colors

    private let files: [KinetixFileItem]
    private let prompt: String
    private let onBrowse: () -> Void
    private let onRemove: (KinetixFileItem) -> Void

    public init(
        files: [KinetixFileItem] = [],
        prompt: String = "Tap to choose files",
        onBrowse: @escaping () -> Void,
        onRemove: @escaping (KinetixFileItem) -> Void = { _ in }
    ) {
        self.files = files
        self.prompt = prompt
        self.onBrowse = onBrowse
        self.onRemove = onRemove
    }

    private func statusSymbol(_ s: KinetixFileStatus) -> String {
        switch s {
        case .pending:   return "doc"
        case .uploading: return "arrow.up.circle"
        case .done:      return "checkmark.circle"
        case .error:     return "exclamationmark.circle"
        }
    }

    private func statusColor(_ s: KinetixFileStatus) -> Color {
        switch s {
        case .done:  return colors.success
        case .error: return colors.destructive
        default:     return colors.mutedForeground
        }
    }

    public var body: some View {
        VStack(spacing: 12) {
            Button(action: onBrowse) {
                VStack(spacing: 8) {
                    Image(systemName: "arrow.up.doc")
                        .font(.system(size: 28))
                    Text(prompt)
                        .font(.system(size: 14))
                }
                .foregroundStyle(colors.mutedForeground)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 32)
                .background(colors.muted.opacity(0.4))
                .overlay {
                    RoundedRectangle(cornerRadius: 8, style: .continuous)
                        .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [6]))
                        .foregroundStyle(colors.border)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            ForEach(files) { file in
                HStack(spacing: 8) {
                    Image(systemName: statusSymbol(file.status))
                        .foregroundStyle(statusColor(file.status))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(file.name)
                            .font(.system(size: 14))
                            .foregroundStyle(colors.foreground)
                            .lineLimit(1)
                        if let detail = file.detail {
                            Text(detail)
                                .font(.system(size: 12))
                                .foregroundStyle(colors.mutedForeground)
                        }
                    }
                    Spacer(minLength: 0)
                    Button { onRemove(file) } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 12))
                            .foregroundStyle(colors.mutedForeground)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Remove")
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 10)
                .background(colors.background, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
                .overlay {
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .strokeBorder(colors.border, lineWidth: 1)
                }
            }
        }
    }
}

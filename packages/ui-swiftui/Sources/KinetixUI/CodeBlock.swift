//
// CodeBlock.swift — KinetixCodeBlock.
//
// Mirrors packages/ui/src/components/code-block.tsx: a monospaced code
// display with a copy button and, for more than one file, a tab strip.
// Presentational — no syntax highlighting (same as the web and the
// Compose port). The copy target is the platform pasteboard.
//

import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

private func kinetixCopyToPasteboard(_ string: String) {
    #if canImport(UIKit)
    UIPasteboard.general.string = string
    #elseif canImport(AppKit)
    NSPasteboard.general.clearContents()
    NSPasteboard.general.setString(string, forType: .string)
    #endif
}

public struct KinetixCodeBlockFile {
    public let name: String
    public let code: String

    public init(name: String, code: String) {
        self.name = name
        self.code = code
    }
}

public struct KinetixCodeBlock: View {
    @Environment(\.kinetixColors) private var colors
    @State private var activeTab = 0
    @State private var copied = false

    private let files: [KinetixCodeBlockFile]
    private let hideCopy: Bool

    public init(code: String, filename: String = "", hideCopy: Bool = false) {
        self.files = [KinetixCodeBlockFile(name: filename, code: code)]
        self.hideCopy = hideCopy
    }

    public init(files: [KinetixCodeBlockFile], hideCopy: Bool = false) {
        self.files = files.isEmpty ? [KinetixCodeBlockFile(name: "", code: "")] : files
        self.hideCopy = hideCopy
    }

    private var current: KinetixCodeBlockFile {
        files[min(activeTab, files.count - 1)]
    }

    private var hasHeader: Bool {
        files.count > 1 || !current.name.isEmpty
    }

    public var body: some View {
        VStack(spacing: 0) {
            if hasHeader {
                HStack(spacing: 0) {
                    ForEach(Array(files.enumerated()), id: \.offset) { idx, file in
                        Button {
                            activeTab = idx
                        } label: {
                            Text(file.name.isEmpty ? "code" : file.name)
                                .font(.system(size: 13))
                                .foregroundStyle(idx == activeTab ? colors.foreground : colors.mutedForeground)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .overlay(alignment: .bottom) {
                                    Rectangle()
                                        .fill(idx == activeTab ? colors.primary : Color.clear)
                                        .frame(height: 2)
                                }
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                    Spacer(minLength: 0)
                    if !hideCopy { copyButton }
                }
                .background(colors.background)
                .overlay(alignment: .bottom) {
                    Rectangle().fill(colors.input).frame(height: 1)
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                Text(current.code)
                    .font(.system(size: 13, design: .monospaced))
                    .foregroundStyle(colors.foreground)
                    .textSelection(.enabled)
                    .padding(12)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .overlay(alignment: .topTrailing) {
                if !hasHeader && !hideCopy {
                    copyButton.padding(6)
                }
            }
        }
        .background(colors.muted)
        .overlay {
            RoundedRectangle(cornerRadius: 8, style: .continuous)
                .strokeBorder(colors.input, lineWidth: 1)
        }
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    private var copyButton: some View {
        Button {
            kinetixCopyToPasteboard(current.code)
            copied = true
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { copied = false }
        } label: {
            Image(systemName: copied ? "checkmark" : "doc.on.doc")
                .font(.kinetixBody)
                .foregroundStyle(colors.mutedForeground)
                .padding(6)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Copy code")
    }
}

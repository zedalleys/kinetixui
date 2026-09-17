//
// MarkdownEditor.swift — KinetixMarkdownEditor.
//
// Mirrors packages/ui/src/components/markdown-editor.tsx: a formatting
// toolbar over a plain text field (never a `contenteditable`-style rich
// view — no native platform has that, so it would've been a web-only,
// eighth standing non-port).
//
// Scope-down, documented: SwiftUI's `TextEditor(text:)` has no selection
// API before iOS 17's `TextEditor(text:selection:)` overload, and this
// package's floor is iOS 16 (KinetixButton's `.tracking(_:)` usage).
// Dropping to a `UITextView`/`NSTextView`-backed `UIViewRepresentable` for
// cursor-precise insertion is possible but out of scope here — toolbar
// actions append the snippet at the end of the text instead of at the
// cursor, unlike the web/Compose/Flutter versions' selection-aware
// insertion.
//

import SwiftUI

public struct KinetixMarkdownEditor: View {
    @Environment(\.kinetixColors) private var colors

    private let value: String
    private let onChange: (String) -> Void

    @State private var showPreview = false

    public init(value: String, onChange: @escaping (String) -> Void) {
        self.value = value
        self.onChange = onChange
    }

    private func appendSnippet(_ snippet: String) {
        let separator = value.isEmpty || value.hasSuffix("\n") ? "" : "\n"
        onChange(value + separator + snippet)
    }

    private var toolbar: some View {
        HStack(spacing: 2) {
            toolbarLabel("B", weight: .bold) { appendSnippet("**bold text**") }
            toolbarLabel("I", italic: true) { appendSnippet("*italic text*") }
            toolbarLabel("H2") { appendSnippet("## Heading") }
            toolbarLabel("Link") { appendSnippet("[link text](https://)") }
            toolbarLabel("\u{2022}") { appendSnippet("- list item") }
            toolbarLabel("1.") { appendSnippet("1. list item") }
            toolbarLabel("<>") { appendSnippet("`code`") }
            toolbarLabel("\u{201C}\u{201D}") { appendSnippet("> quote") }
            Spacer()
            toolbarLabel(showPreview ? "Editor" : "Preview") { showPreview.toggle() }
        }
        .padding(6)
        .background(colors.muted)
    }

    public var body: some View {
        VStack(spacing: 0) {
            toolbar
            if showPreview {
                HStack(spacing: 0) {
                    TextEditor(text: Binding(get: { value }, set: onChange))
                        .font(.system(size: 13, design: .monospaced))
                        .scrollContentBackground(.hidden)
                        .frame(maxWidth: .infinity)
                        .padding(4)
                    Divider()
                    ScrollView {
                        KinetixMarkdownPreview(source: value)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(8)
                    }
                    .frame(maxWidth: .infinity)
                }
                .frame(minHeight: 180)
            } else {
                TextEditor(text: Binding(get: { value }, set: onChange))
                    .font(.system(size: 13, design: .monospaced))
                    .scrollContentBackground(.hidden)
                    .frame(minHeight: 180)
                    .padding(4)
            }
        }
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(colors.border, lineWidth: 1))
    }

    @ViewBuilder
    private func toolbarLabel(_ text: String, weight: Font.Weight = .regular, italic: Bool = false, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(text)
                .font(italic ? .system(size: 12, weight: weight).italic() : .system(size: 12, weight: weight))
                .foregroundStyle(colors.mutedForeground)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }
}

/// A hand-rolled Markdown renderer covering exactly the syntax the toolbar
/// produces — not full CommonMark, same scope as the web version's
/// `renderMarkdown`.
private struct KinetixMarkdownPreview: View {
    @Environment(\.kinetixColors) private var colors
    let source: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            ForEach(Array(source.components(separatedBy: "\n").enumerated()), id: \.offset) { _, line in
                lineView(line)
            }
        }
    }

    @ViewBuilder
    private func lineView(_ line: String) -> some View {
        if line.hasPrefix("### ") {
            inlineText(String(line.dropFirst(4))).font(.system(size: 15, weight: .semibold))
        } else if line.hasPrefix("## ") {
            inlineText(String(line.dropFirst(3))).font(.system(size: 17, weight: .semibold))
        } else if line.hasPrefix("# ") {
            inlineText(String(line.dropFirst(2))).font(.system(size: 20, weight: .bold))
        } else if line.hasPrefix("> ") {
            inlineText(String(line.dropFirst(2))).font(.system(size: 13).italic()).foregroundStyle(colors.mutedForeground)
        } else if line.hasPrefix("- ") || line.hasPrefix("* ") {
            Text("\u{2022} " + line.dropFirst(2)).font(.system(size: 13))
        } else if line.range(of: #"^\d+\.\s"#, options: .regularExpression) != nil {
            Text(line).font(.system(size: 13))
        } else if line.trimmingCharacters(in: .whitespaces).isEmpty {
            Text(" ").font(.system(size: 4))
        } else {
            inlineText(line).font(.system(size: 13))
        }
    }

    private func inlineText(_ text: String) -> Text {
        var result = Text("")
        var chars = Substring(text)
        while !chars.isEmpty {
            if chars.hasPrefix("**"), let range = chars.dropFirst(2).range(of: "**") {
                result = result + Text(chars[chars.index(chars.startIndex, offsetBy: 2)..<range.lowerBound]).bold()
                chars = chars[range.upperBound...]
            } else if chars.hasPrefix("*"), let range = chars.dropFirst(1).range(of: "*") {
                result = result + Text(chars[chars.index(chars.startIndex, offsetBy: 1)..<range.lowerBound]).italic()
                chars = chars[range.upperBound...]
            } else if chars.hasPrefix("`"), let range = chars.dropFirst(1).range(of: "`") {
                result = result + Text(chars[chars.index(chars.startIndex, offsetBy: 1)..<range.lowerBound]).font(.system(.body, design: .monospaced))
                chars = chars[range.upperBound...]
            } else {
                result = result + Text(String(chars.first!))
                chars = chars.dropFirst()
            }
        }
        return result
    }
}

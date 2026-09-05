//
// Quote.swift — KinetixQuote.
//
// Mirrors packages/ui/src/components/quote.tsx: a blockquote with an
// optional attributed author (name, title, avatar slot). Curly quotes are
// added around the text here, the same as the React source does around
// `children` — not the caller's job.
//

import SwiftUI

public struct KinetixQuote<Avatar: View>: View {
    @Environment(\.kinetixColors) private var colors

    private let text: String
    private let author: String?
    private let authorTitle: String?
    private let avatar: Avatar

    public init(
        _ text: String,
        author: String? = nil,
        authorTitle: String? = nil,
        @ViewBuilder avatar: () -> Avatar
    ) {
        self.text = text
        self.author = author
        self.authorTitle = authorTitle
        self.avatar = avatar()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("\u{201C}\(text)\u{201D}")
                .font(.system(size: 18, weight: .medium)) // title-md
                .foregroundStyle(colors.foreground)
                .fixedSize(horizontal: false, vertical: true)
            if author != nil || authorTitle != nil {
                HStack(spacing: 12) {
                    avatar
                    VStack(alignment: .leading, spacing: 2) {
                        if let author {
                            Text(author)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(colors.foreground)
                        }
                        if let authorTitle {
                            Text(authorTitle)
                                .font(.system(size: 13))
                                .foregroundStyle(colors.mutedForeground)
                        }
                    }
                }
            }
        }
    }
}

public extension KinetixQuote where Avatar == EmptyView {
    /// No avatar slot.
    init(_ text: String, author: String? = nil, authorTitle: String? = nil) {
        self.init(text, author: author, authorTitle: authorTitle) { EmptyView() }
    }
}

//
// Rating.swift — KinetixRating.
//
// Mirrors packages/ui/src/components/rating.tsx: a row of `max` stars,
// filled up to `value` (`--warning`) or outlined (`--muted-foreground`).
// `sm`/`md`/`lg` = 16/20/24. Read-only vs. interactive follows the
// nullable-callback convention (`onChange == nil` ⇒ read-only), same as
// KinetixCheckbox. The React hover preview isn't ported (no hover on
// touch). Stars are the `star` / `star.fill` SF Symbols.
//

import SwiftUI

public enum KinetixRatingSize {
    case sm, md, lg
}

public struct KinetixRating: View {
    @Environment(\.kinetixColors) private var colors

    private let value: Int
    private let max: Int
    private let size: KinetixRatingSize
    private let onChange: ((Int) -> Void)?

    public init(
        value: Int,
        max: Int = 5,
        size: KinetixRatingSize = .md,
        onChange: ((Int) -> Void)? = nil
    ) {
        self.value = value
        self.max = max
        self.size = size
        self.onChange = onChange
    }

    private var starSize: CGFloat {
        switch size {
        case .sm: return 16
        case .md: return 20
        case .lg: return 24
        }
    }

    public var body: some View {
        HStack(spacing: 2) { // gap-0.5
            ForEach(0..<max, id: \.self) { index in
                let n = index + 1
                let filled = n <= value
                Image(systemName: filled ? "star.fill" : "star")
                    .font(.system(size: starSize * 0.9))
                    .foregroundStyle(filled ? colors.warning : colors.mutedForeground)
                    .frame(width: starSize, height: starSize)
                    .contentShape(Rectangle())
                    .onTapGesture { onChange?(n) }
                    .accessibilityLabel(n == 1 ? "1 star" : "\(n) stars")
            }
        }
    }
}

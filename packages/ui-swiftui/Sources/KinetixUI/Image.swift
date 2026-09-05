//
// Image.swift — KinetixImage.
//
// Mirrors packages/ui/src/components/image.tsx: a ratio-locked image with
// a muted placeholder while loading and a fallback on error (presets 1:1
// / 3:2 / 4:3 / 3:4 / 3:1 / 16:9, or `.custom(w/h)`). Built on
// `AsyncImage` — its `.empty` / `.success` / `.failure` phases map
// directly onto the React `loading` / `loaded` / `error` states.
//

import SwiftUI

public enum KinetixImageRatio {
    case square, threeToTwo, fourToThree, threeToFour, threeToOne, sixteenToNine
    case custom(CGFloat)

    var value: CGFloat {
        switch self {
        case .square:        return 1
        case .threeToTwo:    return 3.0 / 2.0
        case .fourToThree:   return 4.0 / 3.0
        case .threeToFour:   return 3.0 / 4.0
        case .threeToOne:    return 3
        case .sixteenToNine: return 16.0 / 9.0
        case .custom(let v): return v
        }
    }
}

public struct KinetixImage: View {
    @Environment(\.kinetixColors) private var colors

    private let url: URL?
    private let ratio: KinetixImageRatio
    private let rounded: Bool

    public init(url: URL?, ratio: KinetixImageRatio = .square, rounded: Bool = true) {
        self.url = url
        self.ratio = ratio
        self.rounded = rounded
    }

    public var body: some View {
        Color.clear
            .aspectRatio(ratio.value, contentMode: .fit)
            .overlay {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    case .failure:
                        colors.muted.overlay {
                            Image(systemName: "photo")
                                .font(.system(size: 24))
                                .foregroundStyle(colors.mutedForeground)
                        }
                    case .empty:
                        colors.muted
                    @unknown default:
                        colors.muted
                    }
                }
            }
            .clipped()
            .clipShape(RoundedRectangle(cornerRadius: rounded ? 8 : 0, style: .continuous))
    }
}

//
// Stepper.swift — KinetixStepper.
//
// Mirrors packages/ui/src/components/stepper.tsx: a numbered multi-step
// progress indicator, complete / current / upcoming derived from
// `current` against each step's index. Horizontal or vertical. The
// complete-step mark is the `checkmark` SF Symbol.
//

import SwiftUI

public struct KinetixStep {
    public let label: String
    public let description: String?

    public init(label: String, description: String? = nil) {
        self.label = label
        self.description = description
    }
}

public enum KinetixStepperOrientation {
    case horizontal, vertical
}

public struct KinetixStepper: View {
    @Environment(\.kinetixColors) private var colors

    private let steps: [KinetixStep]
    private let current: Int
    private let orientation: KinetixStepperOrientation

    public init(steps: [KinetixStep], current: Int, orientation: KinetixStepperOrientation = .horizontal) {
        self.steps = steps
        self.current = current
        self.orientation = orientation
    }

    private enum Status { case complete, current, upcoming }

    private func status(_ i: Int) -> Status {
        if i < current { return .complete }
        if i == current { return .current }
        return .upcoming
    }

    public var body: some View {
        let indexed = Array(steps.enumerated())
        if orientation == .vertical {
            VStack(alignment: .leading, spacing: 0) {
                ForEach(indexed, id: \.offset) { idx, step in
                    verticalRow(idx: idx, step: step, isLast: idx == steps.count - 1)
                }
            }
        } else {
            HStack(alignment: .top, spacing: 0) {
                ForEach(indexed, id: \.offset) { idx, step in
                    horizontalRow(idx: idx, step: step, isLast: idx == steps.count - 1)
                }
            }
        }
    }

    @ViewBuilder
    private func indicator(_ st: Status, number: Int) -> some View {
        ZStack {
            switch st {
            case .complete:
                Circle().fill(colors.primary)
                Image(systemName: "checkmark")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(colors.primaryForeground)
            case .current:
                Circle().strokeBorder(colors.primary, lineWidth: 2)
                Text("\(number)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(colors.primary)
            case .upcoming:
                Circle().strokeBorder(colors.input, lineWidth: 1)
                Text("\(number)")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(colors.mutedForeground)
            }
        }
        .frame(width: 28, height: 28) // size-7
    }

    @ViewBuilder
    private func stepLabel(_ st: Status, step: KinetixStep) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(step.label)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(st == .upcoming ? colors.mutedForeground : colors.foreground)
            if let d = step.description {
                Text(d)
                    .font(.system(size: 13))
                    .foregroundStyle(colors.mutedForeground)
            }
        }
    }

    @ViewBuilder
    private func horizontalRow(idx: Int, step: KinetixStep, isLast: Bool) -> some View {
        VStack(spacing: 8) {
            HStack(spacing: 0) {
                indicator(status(idx), number: idx + 1)
                if !isLast {
                    Rectangle()
                        .fill(status(idx) == .complete ? colors.primary : colors.border)
                        .frame(height: 1)
                        .frame(maxWidth: .infinity)
                }
            }
            stepLabel(status(idx), step: step)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
        }
        .frame(maxWidth: .infinity, alignment: .top)
    }

    @ViewBuilder
    private func verticalRow(idx: Int, step: KinetixStep, isLast: Bool) -> some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(spacing: 4) {
                indicator(status(idx), number: idx + 1)
                if !isLast {
                    Rectangle()
                        .fill(status(idx) == .complete ? colors.primary : colors.border)
                        .frame(width: 1)
                        .frame(minHeight: 24) // min-h-6
                }
            }
            stepLabel(status(idx), step: step)
                .padding(.bottom, isLast ? 0 : 24) // pb-6
        }
    }
}

import 'package:flutter/material.dart';

import 'theme.dart';

class KinetixStep {
  const KinetixStep(this.label, {this.description});

  final String label;
  final String? description;
}

enum KinetixStepperAxis { horizontal, vertical }

enum _StepStatus { complete, current, upcoming }

/// Mirrors `packages/ui/src/components/stepper.tsx`: a numbered multi-step
/// progress indicator, complete / current / upcoming derived from
/// `current` against each step's index. Horizontal or vertical. The
/// complete-step mark is `Icons.check`.
class KinetixStepper extends StatelessWidget {
  const KinetixStepper({
    super.key,
    required this.steps,
    required this.current,
    this.axis = KinetixStepperAxis.horizontal,
  });

  final List<KinetixStep> steps;
  final int current;
  final KinetixStepperAxis axis;

  _StepStatus _statusOf(int i) => i < current
      ? _StepStatus.complete
      : (i == current ? _StepStatus.current : _StepStatus.upcoming);

  Widget _indicator(BuildContext context, int i) {
    final c = KinetixTheme.of(context);
    final status = _statusOf(i);
    final Color border = status == _StepStatus.upcoming ? c.input : c.primary;
    return Container(
      width: 28,
      height: 28,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: status == _StepStatus.complete ? c.primary : const Color(0x00000000),
        border: Border.all(color: border, width: status == _StepStatus.current ? 2 : 1),
      ),
      child: status == _StepStatus.complete
          ? Icon(Icons.check, size: 14, color: c.primaryForeground)
          : Text(
              '${i + 1}',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w500,
                color: status == _StepStatus.current ? c.primary : c.mutedForeground,
              ),
            ),
    );
  }

  Widget _label(BuildContext context, KinetixStep step, _StepStatus status) {
    final c = KinetixTheme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          step.label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: status == _StepStatus.upcoming ? c.mutedForeground : c.foreground,
          ),
        ),
        if (step.description != null)
          Text(step.description!, style: TextStyle(fontSize: 13, color: c.mutedForeground)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    final bool horizontal = axis == KinetixStepperAxis.horizontal;

    if (horizontal) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < steps.length; i++)
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      _indicator(context, i),
                      if (i != steps.length - 1)
                        Expanded(
                          child: Container(
                            height: 1,
                            color: _statusOf(i) == _StepStatus.complete ? c.primary : c.border,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  _label(context, steps[i], _statusOf(i)),
                ],
              ),
            ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < steps.length; i++)
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    _indicator(context, i),
                    if (i != steps.length - 1)
                      Expanded(
                        child: Container(
                          width: 1,
                          constraints: const BoxConstraints(minHeight: 24), // min-h-6
                          color: _statusOf(i) == _StepStatus.complete ? c.primary : c.border,
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Padding(
                    padding: EdgeInsets.only(bottom: i == steps.length - 1 ? 0 : 24), // pb-6
                    child: _label(context, steps[i], _statusOf(i)),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

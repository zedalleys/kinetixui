import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Onboarding checklist" block — see testimonial_block_test.dart for how block fixtures work.
//
// Counted, not measured: the bar reports "2 of 5 complete" rather than "40". The strike-through is the
// sighted rendering of that fact, never the only carrier of it.
//
// kx-block:start
class OnboardingStep {
  const OnboardingStep(this.id, this.label);
  final String id;
  final String label;
}

const List<OnboardingStep> kOnboardingSteps = <OnboardingStep>[
  OnboardingStep('account', 'Create your account'),
  OnboardingStep('workspace', 'Name your workspace'),
  OnboardingStep('invite', 'Invite a teammate'),
  OnboardingStep('connect', 'Connect a repository'),
  OnboardingStep('deploy', 'Ship your first change'),
];

class OnboardingChecklistBlock extends StatefulWidget {
  const OnboardingChecklistBlock({super.key});

  @override
  State<OnboardingChecklistBlock> createState() => _OnboardingChecklistBlockState();
}

class _OnboardingChecklistBlockState extends State<OnboardingChecklistBlock> {
  final Set<String> _done = <String>{'account', 'workspace'};

  @override
  Widget build(BuildContext context) {
    return KinetixCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          KinetixCardHeader(
            children: <Widget>[
              const KinetixCardTitle('Get started'),
              KinetixCardDescription('${_done.length} of ${kOnboardingSteps.length} done'),
            ],
          ),
          KinetixCardContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Semantics(
                  label: 'Setup progress',
                  value: '${_done.length} of ${kOnboardingSteps.length} complete',
                  child: ExcludeSemantics(
                    child: KinetixProgress(value: _done.length / kOnboardingSteps.length * 100),
                  ),
                ),
                const SizedBox(height: 16),
                ...kOnboardingSteps.map((OnboardingStep step) {
                  final bool isDone = _done.contains(step.id);
                  return MergeSemantics(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Row(
                        children: <Widget>[
                          KinetixCheckbox(
                            value: isDone,
                            onChanged: (bool v) => setState(() => v ? _done.add(step.id) : _done.remove(step.id)),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              step.label,
                              style: TextStyle(decoration: isDone ? TextDecoration.lineThrough : null),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
              ],
            ),
          ),
          KinetixCardFooter(
            children: <Widget>[
              KinetixButton(
                onPressed: () {},
                variant: KinetixButtonVariant.ghost,
                size: KinetixButtonSize.sm,
                child: const Text('Skip setup'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
// kx-block:end

void main() {
  testWidgets('the progress is counted in steps, not in percent', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: OnboardingChecklistBlock())),
        ),
      ),
    );

    expect(find.text('2 of 5 done'), findsOneWidget);
    expect(find.text('Invite a teammate'), findsOneWidget);
  });
}

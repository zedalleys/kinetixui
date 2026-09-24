import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Profile form" block — see testimonial_block_test.dart for how block fixtures work.
//
// A radio group rather than a dropdown: three mutually exclusive choices whose consequences differ should be
// readable at once, not hidden behind a menu.
//
// kx-block:start
class VisibilityOption {
  const VisibilityOption(this.id, this.label, this.hint);
  final String id;
  final String label;
  final String hint;
}

const List<VisibilityOption> kVisibility = <VisibilityOption>[
  VisibilityOption('everyone', 'Everyone', 'Anyone with the link can see your profile.'),
  VisibilityOption('team', 'Only my team', 'People in your workspace.'),
  VisibilityOption('nobody', 'Nobody', 'Your profile stays hidden.'),
];

class ProfileFormBlock extends StatefulWidget {
  const ProfileFormBlock({super.key});

  @override
  State<ProfileFormBlock> createState() => _ProfileFormBlockState();
}

class _ProfileFormBlockState extends State<ProfileFormBlock> {
  String _visibility = 'team';

  @override
  Widget build(BuildContext context) {
    return KinetixCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const KinetixCardHeader(
            children: <Widget>[
              KinetixCardTitle('Profile'),
              KinetixCardDescription('This is how you appear to other people.'),
            ],
          ),
          KinetixCardContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    const KinetixAvatar(size: 56, child: KinetixAvatarFallback('ZF')),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        KinetixButton(
                          onPressed: () {},
                          variant: KinetixButtonVariant.outline,
                          size: KinetixButtonSize.sm,
                          child: const Text('Change photo'),
                        ),
                        const SizedBox(height: 4),
                        const KinetixFieldDescription('JPG or PNG, up to 2 MB.'),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const KinetixField(
                  children: <Widget>[
                    KinetixFieldLabel('Display name'),
                    KinetixInput(placeholder: 'Ziad Fteha'),
                  ],
                ),
                const SizedBox(height: 24),
                const KinetixField(
                  children: <Widget>[
                    KinetixFieldLabel('Bio'),
                    KinetixTextarea(placeholder: 'Building a five-platform design system.'),
                    KinetixFieldDescription('Shown under your name. Plain text.'),
                  ],
                ),
                const SizedBox(height: 24),
                const KinetixSeparator(),
                const SizedBox(height: 24),
                const KinetixLabel('Who can see your profile'),
                const SizedBox(height: 12),
                KinetixRadioGroup(
                  children: kVisibility.map((VisibilityOption option) {
                    final bool selected = _visibility == option.id;
                    // The tap target and the announcement are the ROW. A second target on the dot is how a
                    // radio list usually becomes two half-working controls instead of one working one.
                    return Semantics(
                      inMutuallyExclusiveGroup: true,
                      selected: selected,
                      button: true,
                      child: InkWell(
                        onTap: () => setState(() => _visibility = option.id),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              ExcludeSemantics(child: KinetixRadioButton(selected: selected, onTap: null)),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: <Widget>[
                                    Text(option.label),
                                    const SizedBox(height: 2),
                                    KinetixFieldDescription(option.hint),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ),
          ),
          KinetixCardFooter(
            children: <Widget>[
              const Spacer(),
              KinetixButton(
                onPressed: () {},
                variant: KinetixButtonVariant.ghost,
                child: const Text('Cancel'),
              ),
              KinetixButton(onPressed: () {}, child: const Text('Save changes')),
            ],
          ),
        ],
      ),
    );
  }
}
// kx-block:end

void main() {
  testWidgets('the whole row selects the option, and the selection is announced', (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: ProfileFormBlock())),
        ),
      ),
    );

    expect(tester.getSemantics(find.text('Only my team')), isSemantics(isSelected: true));

    // Tapping the HINT must select the option — proof the target is the row, not just the dot.
    await tester.tap(find.text('Your profile stays hidden.'));
    await tester.pump();
    expect(tester.getSemantics(find.text('Nobody')), isSemantics(isSelected: true));

    handle.dispose();
  });
}

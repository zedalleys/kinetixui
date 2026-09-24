import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Create account" block — see testimonial_block_test.dart for how block fixtures work.
//
// Four independent rules rather than one length check, so the meter rewards variety instead of rewarding a
// long common word. Because the rules are data, the hint names what is still missing.
//
// kx-block:start
const List<(String, bool Function(String))> kPasswordRules = <(String, bool Function(String))>[
  ('12 characters', _atLeastTwelve),
  ('an upper and a lower case letter', _mixedCase),
  ('a number', _hasDigit),
  ('a symbol', _hasSymbol),
];
const List<String> kStrength = <String>['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];

bool _atLeastTwelve(String p) => p.length >= 12;
bool _mixedCase(String p) => p != p.toUpperCase() && p != p.toLowerCase();
bool _hasDigit(String p) => p.contains(RegExp(r'\d'));
bool _hasSymbol(String p) => p.contains(RegExp(r'[^A-Za-z0-9]'));

class CreateAccountBlock extends StatefulWidget {
  const CreateAccountBlock({super.key});

  @override
  State<CreateAccountBlock> createState() => _CreateAccountBlockState();
}

class _CreateAccountBlockState extends State<CreateAccountBlock> {
  String _password = '';
  bool _accepted = false;

  @override
  Widget build(BuildContext context) {
    final List<String> missing =
        kPasswordRules.where(((String, bool Function(String)) r) => !r.$2(_password)).map(((String, bool Function(String)) r) => r.$1).toList();
    final int met = kPasswordRules.length - missing.length;

    return KinetixCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const KinetixCardHeader(
            children: <Widget>[
              KinetixCardTitle('Create your account'),
              KinetixCardDescription('Free for 14 days. No card required.'),
            ],
          ),
          KinetixCardContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                const KinetixField(
                  children: <Widget>[
                    KinetixFieldLabel('Email'),
                    KinetixInput(placeholder: 'you@example.com'),
                  ],
                ),
                const SizedBox(height: 16),
                KinetixField(
                  children: <Widget>[
                    const KinetixFieldLabel('Password'),
                    KinetixPasswordInput(onChanged: (String v) => setState(() => _password = v)),
                    const SizedBox(height: 8),
                    // The meter announces the WORD, not the percentage: "Fair" is actionable, "50" is not.
                    Semantics(
                      label: 'Password strength',
                      value: kStrength[met],
                      child: ExcludeSemantics(
                        child: SizedBox(height: 4, child: KinetixProgress(value: met / kPasswordRules.length * 100)),
                      ),
                    ),
                    const SizedBox(height: 8),
                    KinetixFieldDescription(
                      missing.isEmpty ? 'Strong password.' : 'Still needs ${missing.join(', ')}.',
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                MergeSemantics(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      KinetixCheckbox(value: _accepted, onChanged: (bool v) => setState(() => _accepted = v)),
                      const SizedBox(width: 8),
                      const Expanded(child: Text('I agree to the terms of service and the privacy policy.')),
                    ],
                  ),
                ),
              ],
            ),
          ),
          KinetixCardFooter(
            children: <Widget>[
              Expanded(
                child: KinetixButton(
                  onPressed: _accepted && missing.isEmpty ? () {} : null,
                  child: const Text('Create account'),
                ),
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
  testWidgets('names the rules that are not met yet', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: CreateAccountBlock())),
        ),
      ),
    );

    expect(find.text('Create your account'), findsOneWidget);
    // An empty password fails every rule, so the hint lists them rather than saying "weak".
    expect(
      find.text('Still needs 12 characters, an upper and a lower case letter, a number, a symbol.'),
      findsOneWidget,
    );
  });
}

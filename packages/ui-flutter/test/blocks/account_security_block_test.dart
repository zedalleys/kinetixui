import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Account security" block — see testimonial_block_test.dart for how block fixtures work.
//
// Each row states its consequence, not just its name. "Revoke" keeps a short visible word but announces
// which session it ends — two identical Revoke buttons are otherwise indistinguishable to TalkBack.
//
// kx-block:start
class SecuritySession {
  const SecuritySession(this.id, this.device, this.detail, {required this.isCurrent});
  final String id;
  final String device;
  final String detail;
  final bool isCurrent;
}

const List<SecuritySession> kSessions = <SecuritySession>[
  SecuritySession('mbp', 'MacBook Pro', 'Chrome · Berlin · now', isCurrent: true),
  SecuritySession('iphone', 'iPhone 15', 'Safari · Berlin · 2 hours ago', isCurrent: false),
];

class AccountSecurityBlock extends StatefulWidget {
  const AccountSecurityBlock({super.key});

  @override
  State<AccountSecurityBlock> createState() => _AccountSecurityBlockState();
}

class _AccountSecurityBlockState extends State<AccountSecurityBlock> {
  bool _twoFactor = true;

  @override
  Widget build(BuildContext context) {
    return KinetixCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const KinetixCardHeader(
            children: <Widget>[
              KinetixCardTitle('Security'),
              KinetixCardDescription('Keep your account safe.'),
            ],
          ),
          const KinetixSeparator(),
          KinetixList(
            children: <Widget>[
              KinetixListItem(
                title: 'Two-factor authentication',
                description: 'Required for every new sign-in.',
                trailing: KinetixSwitch(value: _twoFactor, onChanged: (bool v) => setState(() => _twoFactor = v)),
              ),
              KinetixListItem(
                title: 'Recovery codes',
                description: 'Single-use codes for when you lose your phone.',
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    const KinetixBadge('8 unused', variant: KinetixBadgeVariant.secondary),
                    const SizedBox(width: 8),
                    KinetixButton(
                      onPressed: () {},
                      variant: KinetixButtonVariant.outline,
                      size: KinetixButtonSize.sm,
                      child: const Text('Regenerate'),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const KinetixSeparator(),
          const Padding(
            padding: EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: KinetixLabel('Active sessions'),
          ),
          KinetixList(
            children: kSessions.map((SecuritySession session) {
              return KinetixListItem(
                title: session.device,
                description: session.detail,
                trailing: session.isCurrent
                    ? const KinetixBadge('This device')
                    : Semantics(
                        label: 'Revoke ${session.device}',
                        excludeSemantics: true,
                        button: true,
                        child: KinetixButton(
                          onPressed: () {},
                          variant: KinetixButtonVariant.ghost,
                          size: KinetixButtonSize.sm,
                          child: const Text('Revoke'),
                        ),
                      ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
// kx-block:end

void main() {
  testWidgets('the revoke action says which session it ends', (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: AccountSecurityBlock())),
        ),
      ),
    );

    expect(find.text('Two-factor authentication'), findsOneWidget);
    expect(find.bySemanticsLabel('Revoke iPhone 15'), findsOneWidget);

    handle.dispose();
  });
}

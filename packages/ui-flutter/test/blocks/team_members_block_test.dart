import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Team members" block — see testimonial_block_test.dart for how block fixtures work.
//
// kx-block:start
class TeamMember {
  const TeamMember(this.name, this.role, this.initials);

  final String name;
  final String role;
  final String initials;
}

class TeamMembersBlock extends StatelessWidget {
  const TeamMembersBlock({super.key, this.team = defaultTeam, this.onRemove});

  static const List<TeamMember> defaultTeam = <TeamMember>[
    TeamMember('Ada Lovelace', 'Owner', 'AL'),
    TeamMember('Grace Hopper', 'Admin', 'GH'),
    TeamMember('Alan Turing', 'Member', 'AT'),
  ];

  final List<TeamMember> team;
  final void Function(TeamMember)? onRemove;

  @override
  Widget build(BuildContext context) {
    return KinetixCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const KinetixCardHeader(children: <Widget>[KinetixCardTitle('Team')]),
          const KinetixSeparator(),
          KinetixList(
            children: <Widget>[
              for (final TeamMember member in team)
                KinetixListItem(
                  title: member.name,
                  description: member.role,
                  leading: KinetixAvatar(child: KinetixAvatarFallback(member.initials)),
                  trailing: KinetixButton(
                    onPressed: onRemove == null ? null : () => onRemove!(member),
                    variant: KinetixButtonVariant.ghost,
                    size: KinetixButtonSize.sm,
                    child: const Text('Remove'),
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
  testWidgets('renders every member with their role', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: TeamMembersBlock())),
        ),
      ),
    );

    expect(find.text('Team'), findsOneWidget);
    expect(find.text('Ada Lovelace'), findsOneWidget);
    expect(find.text('Owner'), findsOneWidget);
    expect(find.text('Alan Turing'), findsOneWidget);
    expect(find.text('Remove'), findsNWidgets(3));
  });
}

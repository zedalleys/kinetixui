import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Settings list" block — see testimonial_block_test.dart for how block fixtures work.
//
// kx-block:start
class SettingsListBlock extends StatefulWidget {
  const SettingsListBlock({super.key});

  @override
  State<SettingsListBlock> createState() => _SettingsListBlockState();
}

class _SettingsListBlockState extends State<SettingsListBlock> {
  bool _email = true;
  bool _push = true;
  bool _sms = false;

  @override
  Widget build(BuildContext context) {
    return KinetixCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const KinetixCardHeader(children: <Widget>[KinetixCardTitle('Notifications')]),
          const KinetixSeparator(),
          KinetixList(
            children: <Widget>[
              KinetixListItem(
                title: 'Email',
                description: 'Product news and receipts',
                trailing: KinetixSwitch(value: _email, onChanged: (bool v) => setState(() => _email = v)),
              ),
              KinetixListItem(
                title: 'Push',
                description: 'Activity on your projects',
                trailing: KinetixSwitch(value: _push, onChanged: (bool v) => setState(() => _push = v)),
              ),
              KinetixListItem(
                title: 'SMS',
                description: 'Only critical alerts',
                trailing: KinetixSwitch(value: _sms, onChanged: (bool v) => setState(() => _sms = v)),
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
  testWidgets('renders every row with its description', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: SettingsListBlock())),
        ),
      ),
    );

    expect(find.text('Notifications'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Only critical alerts'), findsOneWidget);
  });
}

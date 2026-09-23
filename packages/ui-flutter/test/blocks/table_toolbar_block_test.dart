import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Table + toolbar" block — see testimonial_block_test.dart for how block fixtures work.
//
// kx-block:start
class Invoice {
  const Invoice(this.id, this.status, this.amount, {this.paid = false});

  final String id;
  final String status;
  final String amount;
  final bool paid;
}

class TableToolbarBlock extends StatefulWidget {
  const TableToolbarBlock({super.key, this.invoices = defaultInvoices, this.onAdd});

  static const List<Invoice> defaultInvoices = <Invoice>[
    Invoice('INV-001', 'Paid', r'$250.00', paid: true),
    Invoice('INV-002', 'Pending', r'$150.00'),
    Invoice('INV-003', 'Paid', r'$350.00', paid: true),
  ];

  final List<Invoice> invoices;
  final VoidCallback? onAdd;

  @override
  State<TableToolbarBlock> createState() => _TableToolbarBlockState();
}

class _TableToolbarBlockState extends State<TableToolbarBlock> {
  final TextEditingController _query = TextEditingController();
  String _status = 'all';

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(child: KinetixInput(controller: _query, placeholder: 'Search invoices…')),
            const SizedBox(width: 8),
            SizedBox(
              width: 144,
              child: KinetixSelect<String>(
                value: _status,
                options: const <KinetixSelectOption<String>>[
                  KinetixSelectOption<String>('all', 'All statuses'),
                  KinetixSelectOption<String>('paid', 'Paid'),
                  KinetixSelectOption<String>('pending', 'Pending'),
                ],
                onChanged: (String? v) => setState(() => _status = v ?? 'all'),
              ),
            ),
            const SizedBox(width: 8),
            KinetixButton(onPressed: widget.onAdd, child: const Text('Add invoice')),
          ],
        ),
        const SizedBox(height: 16),
        KinetixTable(
          children: <Widget>[
            const KinetixTableRow(
              isHeader: true,
              cells: <Widget>[
                KinetixTableHead('Invoice'),
                KinetixTableHead('Status'),
                KinetixTableHead('Amount'),
              ],
            ),
            for (final Invoice invoice in widget.invoices)
              KinetixTableRow(
                cells: <Widget>[
                  KinetixTableCell(child: Text(invoice.id)),
                  KinetixTableCell(
                    child: KinetixBadge(
                      invoice.status,
                      variant: invoice.paid ? KinetixBadgeVariant.subtle : KinetixBadgeVariant.outline,
                    ),
                  ),
                  KinetixTableCell(child: Text(invoice.amount)),
                ],
              ),
          ],
        ),
      ],
    );
  }
}
// kx-block:end

void main() {
  testWidgets('renders the toolbar and every row', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: TableToolbarBlock())),
        ),
      ),
    );

    expect(find.text('Add invoice'), findsOneWidget);
    expect(find.text('Invoice'), findsOneWidget);
    expect(find.text('INV-002'), findsOneWidget);
    expect(find.text(r'$350.00'), findsOneWidget);
  });
}

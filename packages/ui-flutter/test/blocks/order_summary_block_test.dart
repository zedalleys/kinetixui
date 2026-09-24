import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:kinetix_ui/kinetix_ui.dart';

// The "Order summary" block — see testimonial_block_test.dart for how block fixtures work.
//
// Each quantity stepper is named after its own line item. Two steppers that both announce "Quantity" leave a
// TalkBack user changing the count of something they cannot identify — the most common defect in a cart.
//
// "Free" is a word, so shipping says "Free" rather than leaving $0.00 to be inferred.
//
// kx-block:start
class OrderItem {
  const OrderItem(this.id, this.name, this.unit);
  final String id;
  final String name;
  final double unit;
}

const List<OrderItem> kOrderItems = <OrderItem>[
  OrderItem('tee', 'Kinetix T-shirt', 28),
  OrderItem('stickers', 'Sticker pack', 6),
];

String money(double amount) => '\$${amount.toStringAsFixed(2)}';

class OrderSummaryBlock extends StatefulWidget {
  const OrderSummaryBlock({super.key});

  @override
  State<OrderSummaryBlock> createState() => _OrderSummaryBlockState();
}

class _OrderSummaryBlockState extends State<OrderSummaryBlock> {
  final Map<String, int> _quantities = <String, int>{'tee': 2, 'stickers': 1};

  @override
  Widget build(BuildContext context) {
    final double subtotal =
        kOrderItems.fold(0, (double total, OrderItem i) => total + i.unit * (_quantities[i.id] ?? 0));
    final double shipping = subtotal > 50 || subtotal == 0 ? 0 : 5;

    return KinetixCard(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const KinetixCardHeader(children: <Widget>[KinetixCardTitle('Order summary')]),
          KinetixCardContent(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                ...kOrderItems.map((OrderItem item) => Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: <Widget>[
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text(item.name),
                              KinetixFieldDescription('${money(item.unit)} each'),
                            ],
                          ),
                          Semantics(
                            label: 'Quantity, ${item.name}',
                            child: KinetixNumberInput(
                              value: _quantities[item.id] ?? 0,
                              onChanged: (int v) => setState(() => _quantities[item.id] = v),
                              min: 0,
                              max: 99,
                            ),
                          ),
                        ],
                      ),
                    )),
                const KinetixSeparator(),
                const SizedBox(height: 16),
                KinetixField(
                  children: <Widget>[
                    const KinetixFieldLabel('Promo code'),
                    Row(
                      children: <Widget>[
                        const Expanded(child: KinetixInput(placeholder: 'KINETIX10')),
                        const SizedBox(width: 8),
                        KinetixButton(
                          onPressed: () {},
                          variant: KinetixButtonVariant.outline,
                          child: const Text('Apply'),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const KinetixSeparator(),
                const SizedBox(height: 16),
                _TotalRow('Subtotal', money(subtotal)),
                _TotalRow('Shipping', shipping == 0 ? 'Free' : money(shipping)),
                _TotalRow('Total', money(subtotal + shipping)),
              ],
            ),
          ),
          KinetixCardFooter(
            children: <Widget>[
              Expanded(
                child: KinetixButton(
                  onPressed: subtotal == 0 ? null : () {},
                  child: const Text('Place order'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TotalRow extends StatelessWidget {
  const _TotalRow(this.label, this.amount);
  final String label;
  final String amount;

  @override
  Widget build(BuildContext context) {
    // One element: "Total, $62.00", not two unrelated strings at opposite ends of a row.
    return MergeSemantics(
      child: Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: <Widget>[Text(label), Text(amount)],
        ),
      ),
    );
  }
}
// kx-block:end

void main() {
  testWidgets('each stepper says which item it counts, and free shipping is a word', (WidgetTester tester) async {
    final SemanticsHandle handle = tester.ensureSemantics();
    await tester.pumpWidget(
      MaterialApp(
        home: KinetixTheme(
          brightness: Brightness.light,
          child: const Scaffold(body: SingleChildScrollView(child: OrderSummaryBlock())),
        ),
      ),
    );

    expect(find.bySemanticsLabel('Quantity, Kinetix T-shirt'), findsOneWidget);
    expect(find.bySemanticsLabel('Quantity, Sticker pack'), findsOneWidget);
    // 2 x $28 + 1 x $6 = $62, which is over the $50 threshold.
    expect(find.text('Free'), findsOneWidget);

    handle.dispose();
  });
}

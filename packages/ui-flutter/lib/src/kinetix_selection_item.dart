import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';

import 'kinetix_motion.dart';
import 'theme.dart';

/// Gives both selection controls one focus target and one selected-state node.
class KinetixSelectionItem extends StatefulWidget {
  const KinetixSelectionItem({
    super.key,
    required this.selected,
    required this.onTap,
    required this.enabled,
    required this.child,
  });

  final bool selected;
  final VoidCallback onTap;
  final bool enabled;
  final Widget child;

  @override
  State<KinetixSelectionItem> createState() => _KinetixSelectionItemState();
}

class _KinetixSelectionItemState extends State<KinetixSelectionItem> {
  bool _showFocus = false;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      button: true,
      enabled: widget.enabled,
      selected: widget.selected,
      child: FocusableActionDetector(
        enabled: widget.enabled,
        onShowFocusHighlight: (show) => setState(() => _showFocus = show),
        shortcuts: const {
          SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
          SingleActivator(LogicalKeyboardKey.space): ActivateIntent(),
        },
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) {
              widget.onTap();
              return null;
            },
          ),
        },
        child: GestureDetector(
          onTap: widget.enabled ? widget.onTap : null,
          behavior: HitTestBehavior.opaque,
          child: DecoratedBox(
            position: DecorationPosition.foreground,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(8),
              border: widget.enabled && _showFocus
                  ? Border.all(color: KinetixTheme.of(context).focus, width: 2)
                  : null,
            ),
            child: Opacity(
              opacity: widget.enabled
                  ? KinetixOpacity.visible
                  : KinetixOpacity.disabled,
              child: widget.child,
            ),
          ),
        ),
      ),
    );
  }
}

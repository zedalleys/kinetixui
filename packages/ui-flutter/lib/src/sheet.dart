import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'dialog.dart';
import 'app_text.dart';
import 'theme.dart';
import 'kinetix_slide_motion.dart';

/// Bottom-only modal panel, placed above the page in a full-size Stack.
/// Keep this widget mounted and change [visible] so its exit can finish.
/// Drawer delegates here; no new drag/gesture contract is introduced.
class KinetixSheet extends StatefulWidget {
  const KinetixSheet(
      {super.key,
      required this.visible,
      required this.onDismiss,
      required this.child});
  final bool visible;
  final VoidCallback onDismiss;
  final Widget child;

  @override
  State<KinetixSheet> createState() => _KinetixSheetState();
}

class _KinetixSheetState extends State<KinetixSheet>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this)
    ..addStatusListener(_statusChanged);
  final FocusScopeNode _scope = FocusScopeNode(debugLabel: 'KinetixSheet');
  FocusNode? _opener;
  FocusNode? _retainedFocus;
  bool? _reduced;
  int _focusEpoch = 0;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final reduced = MediaQuery.disableAnimationsOf(context);
    if (_reduced != reduced) {
      _reduced = reduced;
      _drive();
    }
  }

  @override
  void didUpdateWidget(KinetixSheet oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.visible != widget.visible) _drive();
  }

  void _drive() {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    _reduced = reduceMotion;
    _controller.duration =
        KinetixSlideMotion.duration(entering: true, reduceMotion: reduceMotion);
    _controller.reverseDuration = KinetixSlideMotion.duration(
        entering: false, reduceMotion: reduceMotion);
    final epoch = ++_focusEpoch;
    if (!widget.visible && _scope.hasFocus) {
      final focused = FocusManager.instance.primaryFocus;
      if (focused != _scope) _retainedFocus = focused;
    }
    // A retained exit remains modal, but its text fields must disconnect from
    // the platform input client as soon as the controlled target is closed.
    _scope.descendantsAreFocusable = widget.visible;
    _scope.descendantsAreTraversable = widget.visible;
    if (!widget.visible && _scope.hasFocus) _scope.requestFocus();
    if (widget.visible) {
      // Capture once per presentation, including a reversal of an unfinished exit.
      _opener ??= FocusManager.instance.primaryFocus;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted || !widget.visible || epoch != _focusEpoch) return;
        final retained = _retainedFocus;
        _retainedFocus = null;
        if (retained?.context != null && retained!.canRequestFocus) {
          retained.requestFocus();
        } else if (!_scope.hasFocus ||
            FocusManager.instance.primaryFocus == _scope) {
          _scope.requestFocus();
          _scope.nextFocus();
        }
      });
    }
    if (reduceMotion) {
      _controller.value = widget.visible ? 1 : 0;
      if (!widget.visible) _restoreFocus();
    } else if (widget.visible) {
      _controller.forward();
    } else {
      _controller.reverse();
    }
  }

  void _statusChanged(AnimationStatus status) {
    if (status == AnimationStatus.dismissed && !widget.visible) _restoreFocus();
  }

  void _restoreFocus() {
    final opener = _opener;
    _opener = null;
    _retainedFocus = null;
    if (opener?.context != null && opener!.canRequestFocus) {
      opener.requestFocus();
    }
  }

  @override
  void dispose() {
    ++_focusEpoch;
    _controller.dispose();
    _restoreFocus();
    _scope.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = KinetixTheme.of(context);
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        if (!widget.visible && _controller.isDismissed) {
          return const SizedBox.shrink();
        }
        final progress = KinetixSlideMotion.curve.transform(_controller.value);
        return BlockSemantics(
          child: FocusScope(
            node: _scope,
            descendantsAreFocusable: widget.visible,
            descendantsAreTraversable: widget.visible,
            onKeyEvent: (_, event) {
              if (!widget.visible) return KeyEventResult.handled;
              if (event is KeyDownEvent &&
                  event.logicalKey == LogicalKeyboardKey.escape) {
                widget.onDismiss();
                return KeyEventResult.handled;
              }
              return KeyEventResult.ignored;
            },
            child: Stack(
              children: [
                Positioned.fill(
                  child: ModalBarrier(
                    color: c.scrim.withValues(alpha: c.scrim.a * progress),
                    dismissible: widget.visible,
                    onDismiss: widget.onDismiss,
                    semanticsLabel: Localizations.of<MaterialLocalizations>(
                                context, MaterialLocalizations)
                            ?.modalBarrierDismissLabel ??
                        'Dismiss',
                  ),
                ),
                Align(
                  alignment: Alignment.bottomCenter,
                  child: FractionalTranslation(
                    translation: Offset(0, 1 - progress),
                    child: IgnorePointer(
                      ignoring: !widget.visible,
                      child: ExcludeSemantics(
                        excluding: !widget.visible,
                        child: Semantics(
                          scopesRoute: true,
                          explicitChildNodes: true,
                          child: Material(
                            color: c.background,
                            borderRadius: const BorderRadius.vertical(
                                top: Radius.circular(16)),
                            elevation: 8,
                            child: SafeArea(
                              top: false,
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child: SizedBox(
                                  width: double.infinity,
                                  child: Column(
                                    mainAxisSize: MainAxisSize.min,
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Center(
                                          child: Container(
                                              width: 36,
                                              height: 4,
                                              decoration: BoxDecoration(
                                                  color: c.border,
                                                  borderRadius:
                                                      BorderRadius.circular(
                                                          9999)))),
                                      const SizedBox(height: 16),
                                      DefaultTextStyle.merge(
                                          style: AppText.bodyMd
                                              .copyWith(color: c.foreground),
                                          child: widget.child),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

// The Dialog header parts double as the Sheet header parts (identical on the web).
typedef KinetixSheetHeader = KinetixDialogHeader;
typedef KinetixSheetFooter = KinetixDialogFooter;
typedef KinetixSheetTitle = KinetixDialogTitle;
typedef KinetixSheetDescription = KinetixDialogDescription;

import 'package:flutter/material.dart';
import 'language_service.dart';
import 'dynamic_translation_service.dart';

/// Interactive UI Widget for dynamic user-generated civic content
/// (complaint descriptions, officer notes, comments, feed content)
/// offering seamless on-demand translation in Marathi, Hindi, and English.
class DynamicTranslatableText extends StatefulWidget {
  final String text;
  final TextStyle? style;
  final int? maxLines;
  final TextOverflow? overflow;
  final bool showAction;
  final Widget Function(BuildContext context, String displayedText)? customBuilder;

  const DynamicTranslatableText({
    super.key,
    required this.text,
    this.style,
    this.maxLines,
    this.overflow,
    this.showAction = true,
    this.customBuilder,
  });

  @override
  State<DynamicTranslatableText> createState() => _DynamicTranslatableTextState();
}

class _DynamicTranslatableTextState extends State<DynamicTranslatableText> {
  final DynamicTranslationService _translationService = DynamicTranslationService();
  final LanguageService _languageService = LanguageService();

  bool _isTranslated = false;
  bool _isLoading = false;
  String? _translatedText;
  String? _lastLocaleCode;

  @override
  void initState() {
    super.initState();
    _languageService.addListener(_onLocaleChanged);
    _lastLocaleCode = _languageService.currentLanguage.code;
  }

  @override
  void dispose() {
    _languageService.removeListener(_onLocaleChanged);
    super.dispose();
  }

  void _onLocaleChanged() {
    if (mounted) {
      final currentCode = _languageService.currentLanguage.code;
      if (currentCode != _lastLocaleCode) {
        _lastLocaleCode = currentCode;
        // If language changed, reset translation state so user can translate to new target language
        setState(() {
          _isTranslated = false;
          _translatedText = null;
        });
      }
    }
  }

  Future<void> _toggleTranslation() async {
    if (_isTranslated) {
      // Revert to original
      setState(() {
        _isTranslated = false;
      });
      return;
    }

    final targetLocale = _languageService.currentLanguage.code;

    setState(() {
      _isLoading = true;
    });

    try {
      final result = await _translationService.translate(
        text: widget.text,
        targetLanguageCode: targetLocale,
      );

      if (mounted) {
        setState(() {
          _translatedText = result.translatedText;
          _isTranslated = true;
          _isLoading = false;
        });
      }
    } catch (e) {
      debugPrint('Translation toggle error: $e');
      if (mounted) {
        setState(() {
          _isTranslated = false;
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentLocale = _languageService.currentLanguage.code;
    final canOfferTranslation = _translationService.shouldOfferTranslation(
      text: widget.text,
      currentLocaleCode: currentLocale,
    );

    final displayedText = (_isTranslated && _translatedText != null) ? _translatedText! : widget.text;

    final textWidget = widget.customBuilder != null
        ? widget.customBuilder!(context, displayedText)
        : Text(
            displayedText,
            style: widget.style,
            maxLines: widget.maxLines,
            overflow: widget.overflow,
          );

    if (!widget.showAction || !canOfferTranslation) {
      return textWidget;
    }

    final actionLabel = _isTranslated
        ? _translationService.getSeeOriginalActionLabel(currentLocale)
        : _translationService.getTranslateActionLabel(currentLocale);

    final badgeLabel = currentLocale == 'mr'
        ? 'मराठी भाषांतर'
        : currentLocale == 'hi'
            ? 'हिंदी अनुवाद'
            : 'Translated';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        textWidget,
        const SizedBox(height: 6),
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            InkWell(
              onTap: _isLoading ? null : _toggleTranslation,
              borderRadius: BorderRadius.circular(6),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_isLoading) ...[
                      const SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF0F766E)),
                        ),
                      ),
                      const SizedBox(width: 6),
                    ] else ...[
                      Icon(
                        _isTranslated ? Icons.undo_rounded : Icons.g_translate_rounded,
                        size: 13,
                        color: const Color(0xFF0F766E),
                      ),
                      const SizedBox(width: 4),
                    ],
                    Text(
                      actionLabel,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF0F766E),
                        letterSpacing: 0.2,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            if (_isTranslated) ...[
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F766E).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(4),
                  border: Border.all(color: const Color(0xFF0F766E).withValues(alpha: 0.25)),
                ),
                child: Text(
                  badgeLabel,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF0F766E),
                  ),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}

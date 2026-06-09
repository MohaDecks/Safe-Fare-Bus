import 'package:flutter/services.dart';

/// Ethiopian local mobile: 10 digits, starts with 0 (e.g. 0912345678).
class PhoneInput {
  static List<TextInputFormatter> get formatters => [
        FilteringTextInputFormatter.digitsOnly,
        LengthLimitingTextInputFormatter(10),
      ];

  static String digitsOnly(String input) => input.replaceAll(RegExp(r'\D'), '');

  static String? validate(String? input) {
    final d = digitsOnly(input ?? '');
    if (d.isEmpty) return 'Phone number is required';
    if (d.length != 10) return 'Phone must be exactly 10 digits';
    if (!d.startsWith('0')) return 'Phone must start with 0 (e.g. 0912345678)';
    return null;
  }
}

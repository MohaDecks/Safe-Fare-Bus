import 'dart:js_interop';

import 'package:flutter/services.dart';
import 'package:web/web.dart' as web;

Future<void> playPaymentSound({required bool success}) async {
  await HapticFeedback.mediumImpact();
  final path = success ? 'assets/sounds/success.wav' : 'assets/sounds/error.wav';
  try {
    final bytes = (await rootBundle.load(path)).buffer.asUint8List();
    final blob = web.Blob([bytes.toJS].toJS);
    final url = web.URL.createObjectURL(blob);
    final audio = web.HTMLAudioElement()
      ..src = url
      ..volume = 1.0;
    await audio.play().toDart;
    audio.onended = ((web.Event _) {
      web.URL.revokeObjectURL(url);
    }).toJS;
  } catch (_) {
    // Ignore — browser may block until user gesture (scan tap counts).
  }
}

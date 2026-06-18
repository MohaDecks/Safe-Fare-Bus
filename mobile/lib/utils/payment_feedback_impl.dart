import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/services.dart';

Future<void> playPaymentSound({required bool success}) async {
  await HapticFeedback.mediumImpact();
  final path = success ? 'assets/sounds/success.wav' : 'assets/sounds/error.wav';
  final player = AudioPlayer()..setReleaseMode(ReleaseMode.release);
  try {
    final data = await rootBundle.load(path);
    await player.setVolume(1.0);
    await player.play(BytesSource(data.buffer.asUint8List()));
    await player.onPlayerComplete.first.timeout(const Duration(seconds: 2));
  } catch (_) {
    try {
      await SystemSound.play(success ? SystemSoundType.click : SystemSoundType.alert);
    } catch (_) {}
  } finally {
    await player.dispose();
  }
}

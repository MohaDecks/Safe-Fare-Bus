import 'payment_feedback_impl.dart'
    if (dart.library.html) 'payment_feedback_web.dart';

/// Plays short sounds + haptics for payment outcomes.
class PaymentFeedback {
  PaymentFeedback._();

  static Future<void> playSuccess() => playPaymentSound(success: true);

  static Future<void> playError() => playPaymentSound(success: false);
}

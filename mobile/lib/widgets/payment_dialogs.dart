import 'package:flutter/material.dart';
import '../services/api_service.dart';

bool isInsufficientBalanceError(String message, {Map<String, dynamic>? data}) {
  if (data?['insufficient_source'] != null) return true;
  final m = message.toLowerCase();
  return m.contains('insufficient') || m.contains('ma filna') || m.contains('dhamma');
}

Future<void> showPaymentSuccessDialog(
  BuildContext context, {
  required num fareBirr,
  required String routeName,
  required String busPlate,
  required num balanceBirr,
}) {
  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF22C55E), Color(0xFF16A34A)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF22C55E).withValues(alpha: 0.35),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(Icons.check_rounded, color: Colors.white, size: 42),
            ),
            const SizedBox(height: 20),
            const Text(
              'Payment successful',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF14532D)),
            ),
            const SizedBox(height: 8),
            Text(
              formatBirr(fareBirr),
              style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: Color(0xFF166534)),
            ),
            const SizedBox(height: 12),
            Text(
              '$routeName · $busPlate',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.black54, fontSize: 14),
            ),
            const SizedBox(height: 8),
            const Text(
              'Deducted from your wallet',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.black45, fontSize: 13, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF0FDF4),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Remaining balance', style: TextStyle(color: Colors.black54, fontSize: 13)),
                  Text(
                    formatBirr(balanceBirr),
                    style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF166534)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF16A34A),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Done', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

Future<void> showInsufficientBalanceDialog(
  BuildContext context, {
  String? message,
  bool linkedToCompany = false,
  String? corporateName,
}) {
  final companyLabel = corporateName != null && corporateName.isNotEmpty ? corporateName : 'Your company';
  final detail = message ?? 'Your wallet balance is not enough for this fare.';

  return showDialog<void>(
    context: context,
    builder: (ctx) => Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFB923C), Color(0xFFEF4444)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.3),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(Icons.account_balance_wallet_outlined, color: Colors.white, size: 36),
            ),
            const SizedBox(height: 20),
            const Text(
              'Insufficient balance',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF991B1B)),
            ),
            const SizedBox(height: 12),
            Text(
              detail,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.black54, height: 1.45, fontSize: 14),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Text(
                linkedToCompany
                    ? 'Ask $companyLabel to top up your wallet in the web portal.'
                    : 'Go to Top up tab and add money to your wallet.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFFB91C1C), fontSize: 13, fontWeight: FontWeight.w600),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFFDC2626),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('OK', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

Future<void> showTopUpSuccessDialog(
  BuildContext context, {
  required num addedBirr,
  required num balanceBirr,
  String? provider,
}) {
  return showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF7C3AED), Color(0xFF5B21B6)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF7C3AED).withValues(alpha: 0.35),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: const Icon(Icons.add_card_rounded, color: Colors.white, size: 38),
            ),
            const SizedBox(height: 20),
            const Text(
              'Top-up successful',
              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Color(0xFF5B21B6)),
            ),
            const SizedBox(height: 8),
            Text(
              '+${formatBirr(addedBirr)}',
              style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: Color(0xFF7C3AED)),
            ),
            if (provider != null && provider.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(provider, style: const TextStyle(color: Colors.black54)),
            ],
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF5F3FF),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('New balance', style: TextStyle(color: Colors.black54, fontSize: 13)),
                  Text(
                    formatBirr(balanceBirr),
                    style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF5B21B6)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 48,
              child: FilledButton(
                onPressed: () => Navigator.of(ctx).pop(),
                child: const Text('Done', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

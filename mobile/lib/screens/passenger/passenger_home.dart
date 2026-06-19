import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_card.dart';
import '../../widgets/service_action_card.dart';

class PassengerHome extends StatefulWidget {
  final AppUser user;
  final ApiService api;
  final VoidCallback onLogout;
  final void Function(int tabIndex)? onNavigate;

  const PassengerHome({
    super.key,
    required this.user,
    required this.api,
    required this.onLogout,
    this.onNavigate,
  });

  @override
  State<PassengerHome> createState() => PassengerHomeState();
}

class PassengerHomeState extends State<PassengerHome> {
  double _balance = 0;
  List<dynamic> _txs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> refreshData({bool silent = false}) => _load(silent: silent);

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final w = await widget.api.getJson('/wallet');
      final txs = await widget.api.getList('/wallet/transactions');
      if (!mounted) return;
      setState(() {
        _balance = (w['balance_birr'] as num?)?.toDouble() ?? 0;
        _txs = txs;
      });
    } on ApiException catch (e) {
      if (mounted && !silent) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    } finally {
      if (mounted) {
        if (!silent) {
          setState(() => _loading = false);
        } else if (_loading) {
          setState(() => _loading = false);
        }
      }
    }
  }

  String _formatWhen(dynamic at) {
    if (at == null) return '';
    try {
      return DateFormat.MMMd().add_jm().format(DateTime.parse(at.toString()));
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final firstName = widget.user.name.split(' ').first;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Hi, $firstName', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            Text(
              'Dirsha Wallet',
              style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh',
            onPressed: () => refreshData(),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            tooltip: 'Sign out',
            onPressed: widget.onLogout,
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : RefreshIndicator(
              color: AppColors.primary,
              onRefresh: () => refreshData(),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
                children: [
                  AppCard(
                    color: AppColors.primary,
                    shadows: AppShadows.elevated,
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.18),
                                borderRadius: BorderRadius.circular(AppRadii.sm),
                              ),
                              child: const Icon(Icons.account_balance_wallet, color: Colors.white, size: 22),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              'Available balance',
                              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          formatBirr(_balance),
                          style: theme.textTheme.displaySmall?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            letterSpacing: -0.5,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Pay bus fare instantly',
                          style: theme.textTheme.bodySmall?.copyWith(color: Colors.white.withValues(alpha: 0.75)),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),
                  Text(
                    'Services',
                    style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Quick access to payments',
                    style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 16),
                  ServiceActionCard(
                    icon: Icons.directions_bus_rounded,
                    title: 'Bus Payment',
                    subtitle: 'Scan QR code on the bus to pay fare',
                    iconColor: AppColors.primary,
                    iconBg: AppColors.primary.withValues(alpha: 0.12),
                    onTap: () => widget.onNavigate?.call(1),
                  ),
                  const SizedBox(height: 14),
                  ServiceActionCard(
                    icon: Icons.add_card_rounded,
                    title: 'Wallet Top-Up',
                    subtitle: 'Add money via Telebirr, CBE Birr & more',
                    iconColor: AppColors.success,
                    iconBg: AppColors.success.withValues(alpha: 0.12),
                    onTap: () => widget.onNavigate?.call(2),
                  ),
                  const SizedBox(height: 14),
                  ServiceActionCard(
                    icon: Icons.receipt_long_rounded,
                    title: 'Trip History',
                    subtitle: 'View all your bus trips & payments',
                    iconColor: const Color(0xFF9333EA),
                    iconBg: const Color(0xFF9333EA).withValues(alpha: 0.12),
                    onTap: () => widget.onNavigate?.call(3),
                  ),
                  const SizedBox(height: 28),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Recent activity',
                        style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
                      ),
                      if (_txs.isNotEmpty)
                        TextButton(
                          onPressed: () => widget.onNavigate?.call(3),
                          child: const Text('See all'),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_txs.isEmpty)
                    AppCard(
                      padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 20),
                      child: Column(
                        children: [
                          Icon(Icons.receipt_outlined, size: 36, color: AppColors.textMuted.withValues(alpha: 0.6)),
                          const SizedBox(height: 12),
                          Text(
                            'No transactions yet',
                            style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Your payments will appear here',
                            style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                          ),
                        ],
                      ),
                    )
                  else
                    ..._txs.take(5).map((t) {
                      final m = t as Map<String, dynamic>;
                      final type = m['type']?.toString() ?? '';
                      final isFare = type == 'fare';
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: AppCard(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          onTap: () => widget.onNavigate?.call(3),
                          child: Row(
                            children: [
                              Container(
                                width: 44,
                                height: 44,
                                decoration: BoxDecoration(
                                  color: (isFare ? AppColors.primary : AppColors.success)
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(AppRadii.sm),
                                ),
                                child: Icon(
                                  isFare ? Icons.directions_bus : Icons.add_card,
                                  color: isFare ? AppColors.primary : AppColors.success,
                                  size: 22,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      m['description']?.toString() ?? type,
                                      style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    if (m['created_at'] != null)
                                      Text(
                                        _formatWhen(m['created_at']),
                                        style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                                      ),
                                  ],
                                ),
                              ),
                              Text(
                                '${isFare ? "−" : "+"}${formatBirr((m['amount_birr'] as num?) ?? 0)}',
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.w700,
                                  color: isFare ? AppColors.primary : AppColors.success,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }
}

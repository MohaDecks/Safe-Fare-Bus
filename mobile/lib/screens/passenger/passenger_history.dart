import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/app_card.dart';
import '../../widgets/empty_state.dart';

class PassengerHistory extends StatefulWidget {
  final ApiService api;

  const PassengerHistory({super.key, required this.api});

  @override
  State<PassengerHistory> createState() => PassengerHistoryState();
}

class PassengerHistoryState extends State<PassengerHistory> {
  List<dynamic> _trips = [];
  List<dynamic> _all = [];
  bool _loading = true;
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> refreshData({bool silent = false}) => _load(silent: silent);

  Future<void> _load({bool silent = false}) async {
    if (!silent) setState(() => _loading = true);
    try {
      final trips = await widget.api.getList('/wallet/trip-history');
      final all = await widget.api.getList('/wallet/transactions');
      if (!mounted) return;
      setState(() {
        _trips = trips;
        _all = all;
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
      return DateFormat.yMMMd().add_jm().format(DateTime.parse(at.toString()));
    } catch (_) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Trip history'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => refreshData(),
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  child: SegmentedButton<int>(
                    segments: const [
                      ButtonSegment(value: 0, label: Text('Bus trips'), icon: Icon(Icons.directions_bus, size: 18)),
                      ButtonSegment(value: 1, label: Text('All activity'), icon: Icon(Icons.receipt_long, size: 18)),
                    ],
                    selected: {_tab},
                    onSelectionChanged: (s) => setState(() => _tab = s.first),
                  ),
                ),
                Expanded(
                  child: RefreshIndicator(
                    color: AppColors.primary,
                    onRefresh: () => refreshData(),
                    child: _tab == 0 ? _buildTrips(theme) : _buildAll(theme),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildTrips(ThemeData theme) {
    if (_trips.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            icon: Icons.directions_bus_rounded,
            title: 'No bus trips yet',
            message: 'When you pay bus fare via Pay → scan QR, your trips will appear here.',
          ),
        ],
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      itemCount: _trips.length,
      itemBuilder: (_, i) {
        final t = _trips[i] as Map<String, dynamic>;
        final route = t['route_name']?.toString() ?? 'Bus trip';
        final plate = t['bus_plate']?.toString() ?? '';
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: AppCard(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppRadii.sm),
                  ),
                  child: const Icon(Icons.confirmation_number, color: AppColors.primary, size: 26),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        route,
                        style: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      if (plate.isNotEmpty)
                        Text(
                          'Bus $plate',
                          style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                        ),
                      Text(
                        _formatWhen(t['created_at']),
                        style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                Text(
                  formatBirr((t['amount_birr'] as num?) ?? 0),
                  style: theme.textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.w800,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAll(ThemeData theme) {
    if (_all.isEmpty) {
      return ListView(
        children: const [
          EmptyState(
            icon: Icons.receipt_long_rounded,
            title: 'No activity yet',
            message: 'Top-ups and fare payments will show up here once you start using your wallet.',
          ),
        ],
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      itemCount: _all.length,
      itemBuilder: (_, i) {
        final m = _all[i] as Map<String, dynamic>;
        final type = m['type']?.toString() ?? '';
        final isFare = type == 'fare';
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: AppCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: (isFare ? AppColors.primary : AppColors.success).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
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
                      ),
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
      },
    );
  }
}

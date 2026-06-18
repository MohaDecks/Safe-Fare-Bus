import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/api_service.dart';

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
  int _tab = 0; // 0 trips, 1 all

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
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Text('Trip history'),
        backgroundColor: const Color(0xFF5B21B6),
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => refreshData()),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: SegmentedButton<int>(
                    segments: const [
                      ButtonSegment(value: 0, label: Text('Bus trips'), icon: Icon(Icons.directions_bus)),
                      ButtonSegment(value: 1, label: Text('All activity'), icon: Icon(Icons.receipt_long)),
                    ],
                    selected: {_tab},
                    onSelectionChanged: (s) => setState(() => _tab = s.first),
                  ),
                ),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: () => refreshData(),
                    child: _tab == 0 ? _buildTrips() : _buildAll(),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildTrips() {
    if (_trips.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 60),
          Center(
            child: Column(
              children: [
                Icon(Icons.directions_bus, size: 48, color: Colors.grey),
                SizedBox(height: 12),
                Text('No bus trips yet', style: TextStyle(fontWeight: FontWeight.w600)),
                SizedBox(height: 4),
                Text('Pay fare via Pay → scan cashier QR', style: TextStyle(color: Colors.grey)),
              ],
            ),
          ),
        ],
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: _trips.length,
      itemBuilder: (_, i) {
        final t = _trips[i] as Map<String, dynamic>;
        final route = t['route_name']?.toString() ?? '';
        final plate = t['bus_plate']?.toString() ?? '';
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFF7C3AED).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.confirmation_number, color: Color(0xFF7C3AED)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(route, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      if (plate.isNotEmpty) Text('Bus $plate', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                      Text(_formatWhen(t['created_at']), style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                    ],
                  ),
                ),
                Text(
                  formatBirr((t['amount_birr'] as num?) ?? 0),
                  style: const TextStyle(fontWeight: FontWeight.w800, color: Color(0xFF5B21B6)),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildAll() {
    if (_all.isEmpty) {
      return ListView(
        children: const [
          SizedBox(height: 60),
          Center(child: Text('No activity yet')),
        ],
      );
    }
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      itemCount: _all.length,
      itemBuilder: (_, i) {
        final m = _all[i] as Map<String, dynamic>;
        final type = m['type']?.toString() ?? '';
        final isFare = type == 'fare';
        return ListTile(
          leading: CircleAvatar(
            backgroundColor: isFare ? Colors.purple.shade100 : Colors.green.shade100,
            child: Icon(isFare ? Icons.directions_bus : Icons.add_card, color: isFare ? Colors.purple : Colors.green),
          ),
          title: Text(m['description']?.toString() ?? type),
          subtitle: Text(_formatWhen(m['created_at'])),
          trailing: Text(
            '${isFare ? "−" : "+"}${formatBirr((m['amount_birr'] as num?) ?? 0)}',
            style: TextStyle(fontWeight: FontWeight.w600, color: isFare ? Colors.red.shade700 : Colors.green.shade700),
          ),
        );
      },
    );
  }
}

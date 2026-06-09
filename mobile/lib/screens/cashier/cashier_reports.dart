import 'package:flutter/material.dart';
import '../../services/api_service.dart';

class CashierReports extends StatefulWidget {
  final ApiService api;

  const CashierReports({super.key, required this.api});

  @override
  State<CashierReports> createState() => _CashierReportsState();
}

class _CashierReportsState extends State<CashierReports> {
  bool _loading = true;
  bool _showAllDates = false;
  Map<String, dynamic>? _data;
  DateTime? _from;
  DateTime? _to;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String _iso(DateTime d) =>
      '${d.year}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      var path = '/cashier/reports';
      if (_showAllDates && _from != null && _to != null) {
        path += '?date_from=${_iso(_from!)}&date_to=${_iso(_to!)}';
      }
      final data = await widget.api.getJson(path);
      if (mounted) {
        setState(() {
          _data = data;
          _loading = false;
        });
      }
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  Future<void> _pickRange() async {
    final now = DateTime.now();
    final from = await showDatePicker(
      context: context,
      initialDate: _from ?? now.subtract(const Duration(days: 7)),
      firstDate: DateTime(2024),
      lastDate: now,
    );
    if (from == null || !mounted) return;
    final to = await showDatePicker(
      context: context,
      initialDate: _to ?? now,
      firstDate: from,
      lastDate: now,
    );
    if (to == null) return;
    setState(() {
      _showAllDates = true;
      _from = from;
      _to = to;
    });
    await _load();
  }

  void _resetToday() {
    setState(() {
      _showAllDates = false;
      _from = null;
      _to = null;
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final summary = _data?['summary'] as Map<String, dynamic>? ?? {};
    final legs = (_data?['legs'] as List<dynamic>?) ?? [];
    final payments = (_data?['payments'] as List<dynamic>?) ?? [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Report'),
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _load)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  children: [
                    FilterChip(
                      label: const Text('Today'),
                      selected: !_showAllDates,
                      onSelected: (_) => _resetToday(),
                    ),
                    const SizedBox(width: 8),
                    FilterChip(
                      label: Text(_showAllDates && _from != null
                          ? '${_iso(_from!)} – ${_iso(_to!)}'
                          : 'More dates'),
                      selected: _showAllDates,
                      onSelected: (_) => _pickRange(),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        Column(
                          children: [
                            const Text('Trips'),
                            Text('${summary['trips'] ?? 0}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        Column(
                          children: [
                            const Text('Revenue'),
                            Text(formatBirr((summary['revenue_birr'] as num?) ?? 0),
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('By route leg', style: TextStyle(fontWeight: FontWeight.bold)),
                if (legs.isEmpty)
                  const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('No trips in this period'))
                else
                  ...legs.map((l) {
                    final m = l as Map<String, dynamic>;
                    return ListTile(
                      title: Text(m['label']?.toString() ?? ''),
                      subtitle: Text(m['direction']?.toString() ?? ''),
                      trailing: Text('${m['trips'] ?? 0} · ${formatBirr((m['revenue_birr'] as num?) ?? 0)}'),
                    );
                  }),
                const SizedBox(height: 16),
                const Text('Payments', style: TextStyle(fontWeight: FontWeight.bold)),
                if (payments.isEmpty)
                  const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Text('No payments'))
                else
                  ...payments.take(50).map((p) {
                    final m = p as Map<String, dynamic>;
                    return ListTile(
                      dense: true,
                      title: Text(m['passenger']?.toString() ?? ''),
                      subtitle: Text(m['trip_label']?.toString() ?? ''),
                      trailing: Text(formatBirr((m['amount_birr'] as num?) ?? 0)),
                    );
                  }),
              ],
            ),
    );
  }
}

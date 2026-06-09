import 'package:flutter/material.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';
import 'cashier_home.dart';
import 'cashier_trip.dart';
import 'cashier_reports.dart';

class CashierShell extends StatefulWidget {
  final AppUser user;
  final ApiService api;
  final VoidCallback onLogout;

  const CashierShell({super.key, required this.user, required this.api, required this.onLogout});

  @override
  State<CashierShell> createState() => _CashierShellState();
}

class _CashierShellState extends State<CashierShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      CashierHome(user: widget.user, api: widget.api, onLogout: widget.onLogout),
      CashierTrip(api: widget.api),
      CashierReports(api: widget.api),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.qr_code_2), label: 'QR'),
          NavigationDestination(icon: Icon(Icons.route), label: 'Trip'),
          NavigationDestination(icon: Icon(Icons.bar_chart), label: 'Report'),
        ],
      ),
    );
  }
}

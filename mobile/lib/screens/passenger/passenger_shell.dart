import 'package:flutter/material.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';
import 'passenger_home.dart';
import 'passenger_scan.dart';
import 'passenger_topup.dart';
import 'passenger_history.dart';

class PassengerShell extends StatefulWidget {
  final AppUser user;
  final ApiService api;
  final VoidCallback onLogout;

  const PassengerShell({super.key, required this.user, required this.api, required this.onLogout});

  @override
  State<PassengerShell> createState() => _PassengerShellState();
}

class _PassengerShellState extends State<PassengerShell> {
  int _index = 0;
  int _topUpBuild = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      PassengerHome(user: widget.user, api: widget.api, onLogout: widget.onLogout),
      PassengerScan(api: widget.api),
      PassengerTopUp(key: ValueKey('topup-$_topUpBuild'), api: widget.api),
      PassengerHistory(api: widget.api),
    ];

    return Scaffold(
      body: IndexedStack(index: _index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) {
          setState(() {
            _index = i;
            if (i == 2) _topUpBuild++;
          });
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.qr_code_scanner), label: 'Pay'),
          NavigationDestination(icon: Icon(Icons.add_card), label: 'Top up'),
          NavigationDestination(icon: Icon(Icons.history), label: 'Trips'),
        ],
      ),
    );
  }
}

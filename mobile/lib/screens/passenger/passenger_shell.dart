import 'package:flutter/material.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/brand_logo.dart';
import 'bus_booking_shell.dart';
import 'passenger_hub.dart';

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

  void _openBusBooking() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => BusBookingShell(
          user: widget.user,
          api: widget.api,
          onLogout: widget.onLogout,
          showBack: true,
        ),
      ),
    );
  }

  void _selectTab(int index) {
    if (index == 1) {
      _openBusBooking();
      return;
    }
    if (index == 2) {
      _comingSoon('Post / Sell');
      return;
    }
    if (index == _index) return;
    setState(() => _index = index);
  }

  void _comingSoon(String title) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$title is coming soon')));
  }

  @override
  Widget build(BuildContext context) {
    final pages = [
      PassengerHub(user: widget.user, api: widget.api, onLogout: widget.onLogout),
      _PlaceholderPage(
        icon: Icons.chat_bubble_outline_rounded,
        title: 'Messages',
        subtitle: 'Chat with sellers and support will appear here.',
      ),
      _ProfilePage(user: widget.user, onLogout: widget.onLogout),
    ];

    final bodyIndex = _index == 0 ? 0 : _index == 3 ? 1 : 2;

    return Scaffold(
      body: IndexedStack(index: bodyIndex, children: pages),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: FloatingActionButton(
        onPressed: () => _comingSoon('Post / Sell'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        elevation: 4,
        child: const Icon(Icons.add, size: 30),
      ),
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        notchMargin: 8,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              _NavBtn(icon: Icons.home_rounded, label: 'Home', selected: _index == 0, onTap: () => _selectTab(0)),
              _NavBtn(icon: Icons.calendar_month_rounded, label: 'Bookings', selected: false, onTap: () => _selectTab(1)),
              const SizedBox(width: 56),
              _NavBtn(icon: Icons.chat_bubble_outline_rounded, label: 'Messages', selected: _index == 3, onTap: () => _selectTab(3)),
              _NavBtn(icon: Icons.person_outline_rounded, label: 'Profile', selected: _index == 4, onTap: () => _selectTab(4)),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _NavBtn({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = selected ? AppColors.primary : AppColors.textMuted;
    return Expanded(
      child: InkWell(
        onTap: onTap,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(fontSize: 11, fontWeight: selected ? FontWeight.w800 : FontWeight.w500, color: color),
            ),
          ],
        ),
      ),
    );
  }
}

class _PlaceholderPage extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const _PlaceholderPage({required this.icon, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 56, color: AppColors.primary),
              const SizedBox(height: 16),
              Text(title, style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              Text(subtitle, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProfilePage extends StatelessWidget {
  final AppUser user;
  final VoidCallback onLogout;

  const _ProfilePage({required this.user, required this.onLogout});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          const Center(child: CircularBrandLogo(size: 96)),
          const SizedBox(height: 16),
          Text(user.name, textAlign: TextAlign.center, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 4),
          Text(user.phone ?? user.email, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted)),
          const SizedBox(height: 28),
          FilledButton.icon(
            onPressed: onLogout,
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}

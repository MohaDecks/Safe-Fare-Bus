import 'package:flutter/material.dart';
import '../../models/user.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../widgets/brand_logo.dart';
import '../service_webview_screen.dart';
import 'bus_booking_shell.dart';

class _HubItem {
  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final bool featured;
  final String? url;

  const _HubItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    this.featured = false,
    this.url,
  });
}

class PassengerHub extends StatefulWidget {
  final AppUser user;
  final ApiService api;
  final VoidCallback onLogout;

  const PassengerHub({
    super.key,
    required this.user,
    required this.api,
    required this.onLogout,
  });

  @override
  State<PassengerHub> createState() => _PassengerHubState();
}

class _PassengerHubState extends State<PassengerHub> {
  final _search = TextEditingController();
  List<Map<String, dynamic>> _linked = [];

  static const _catalog = <_HubItem>[
    _HubItem(
      id: 'bus',
      title: 'Bus Booking',
      subtitle: 'Pay fare & tickets',
      icon: Icons.directions_bus_rounded,
      color: AppColors.primary,
      featured: true,
    ),
    _HubItem(id: 'parking', title: 'Parking', subtitle: 'Find & book parking', icon: Icons.local_parking_rounded, color: Color(0xFF2563EB)),
    _HubItem(id: 'cars', title: 'Car Market', subtitle: 'Buy & sell cars', icon: Icons.directions_car_rounded, color: Color(0xFFDC2626)),
    _HubItem(id: 'parts', title: 'Spare Parts', subtitle: 'New & used parts', icon: Icons.settings_suggest_rounded, color: Color(0xFFEA580C)),
    _HubItem(id: 'house', title: 'House Rental', subtitle: 'Rent a house', icon: Icons.home_work_rounded, color: Color(0xFF0D9488)),
    _HubItem(id: 'flights', title: 'Flight Tickets', subtitle: 'Book flights', icon: Icons.flight_rounded, color: Color(0xFF4F46E5)),
    _HubItem(id: 'tv', title: 'TV Repair', subtitle: 'Repair TV', icon: Icons.tv_rounded, color: Color(0xFF7C3AED)),
    _HubItem(id: 'fridge', title: 'Fridge Repair', subtitle: 'Repair fridge', icon: Icons.kitchen_rounded, color: Color(0xFF0891B2)),
    _HubItem(id: 'cooker', title: 'Cooker Repair', subtitle: 'Repair cooker', icon: Icons.microwave_rounded, color: Color(0xFFDB2777)),
    _HubItem(id: 'electricals', title: 'Electricals', subtitle: 'Electrical supplies', icon: Icons.lightbulb_rounded, color: Color(0xFFF59E0B)),
    _HubItem(id: 'furniture', title: 'Furniture', subtitle: 'Home & office', icon: Icons.weekend_rounded, color: Color(0xFF64748B)),
    _HubItem(id: 'appliances', title: 'Home Appliances', subtitle: 'Appliances', icon: Icons.local_laundry_service_rounded, color: Color(0xFF0284C7)),
    _HubItem(id: 'electronics', title: 'Electronics', subtitle: 'Phones & more', icon: Icons.phone_iphone_rounded, color: Color(0xFF334155)),
    _HubItem(id: 'jobs', title: 'Jobs', subtitle: 'Find & post jobs', icon: Icons.work_rounded, color: Color(0xFF78716C)),
  ];

  @override
  void initState() {
    super.initState();
    _loadLinked();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _loadLinked() async {
    try {
      final list = await widget.api.getList('/mobile/app-services');
      if (!mounted) return;
      setState(() {
        _linked = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      });
    } catch (_) {}
  }

  List<_HubItem> get _items {
    final q = _search.text.trim().toLowerCase();
    final linked = _linked.map((s) {
      final name = s['name']?.toString() ?? 'Service';
      final url = s['link_url']?.toString() ?? '';
      return _HubItem(
        id: 'link-${s['id'] ?? name}',
        title: name,
        subtitle: 'Open in Dirsha',
        icon: Icons.grid_view_rounded,
        color: AppColors.primary,
        url: url.isEmpty ? null : url,
      );
    });
    final all = [..._catalog, ...linked];
    if (q.isEmpty) return all;
    return all.where((e) => e.title.toLowerCase().contains(q) || e.subtitle.toLowerCase().contains(q)).toList();
  }

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

  void _openItem(_HubItem item) {
    if (item.id == 'bus' || item.id == 'parking') {
      _openBusBooking();
      return;
    }
    if (item.url != null && item.url!.isNotEmpty) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ServiceWebViewScreen(title: item.title, url: item.url!),
        ),
      );
      return;
    }
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(item.icon, size: 48, color: item.color),
            const SizedBox(height: 12),
            Text(item.title, style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
            const SizedBox(height: 8),
            Text(
              '${item.subtitle} will be available in Dirsha soon.',
              textAlign: TextAlign.center,
              style: Theme.of(ctx).textTheme.bodyMedium?.copyWith(color: AppColors.textMuted),
            ),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('OK'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final items = _items;

    return Scaffold(
      backgroundColor: Colors.white,
      drawer: Drawer(
        child: SafeArea(
          child: ListView(
            padding: const EdgeInsets.symmetric(vertical: 16),
            children: [
              const Padding(
                padding: EdgeInsets.all(20),
                child: CircularBrandLogo(size: 72),
              ),
              ListTile(
                leading: const Icon(Icons.directions_bus_rounded, color: AppColors.primary),
                title: const Text('Bus Booking'),
                onTap: () {
                  Navigator.pop(context);
                  _openBusBooking();
                },
              ),
              ListTile(
                leading: const Icon(Icons.logout_rounded),
                title: const Text('Sign out'),
                onTap: widget.onLogout,
              ),
            ],
          ),
        ),
      ),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Builder(
                          builder: (ctx) => IconButton(
                            onPressed: () => Scaffold.of(ctx).openDrawer(),
                            icon: const Icon(Icons.menu_rounded),
                          ),
                        ),
                        const Expanded(
                          child: Text(
                            'DIRSHAY',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w900,
                              fontSize: 22,
                              letterSpacing: 1.2,
                            ),
                          ),
                        ),
                        IconButton(
                          onPressed: () {},
                          icon: const Icon(Icons.notifications_none_rounded),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _search,
                            onChanged: (_) => setState(() {}),
                            decoration: InputDecoration(
                              hintText: 'Search cars, parts, services and more...',
                              prefixIcon: const Icon(Icons.search_rounded),
                              filled: true,
                              fillColor: AppColors.background,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(14),
                                borderSide: BorderSide.none,
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: IconButton(
                            onPressed: () {},
                            icon: const Icon(Icons.tune_rounded),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _HeroBanner(onExplore: _openBusBooking),
                    const SizedBox(height: 22),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Our Services',
                        style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Bus Booking is ready — tap to pay fare',
                        style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
                      ),
                    ),
                    const SizedBox(height: 14),
                  ],
                ),
              ),
            ),
            SliverPadding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 0.82,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, i) => _ServiceTile(item: items[i], onTap: () => _openItem(items[i])),
                  childCount: items.length,
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 28),
                child: Column(
                  children: [
                    _SellBanner(onPost: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Post / Sell is coming soon')),
                      );
                    }),
                    const SizedBox(height: 20),
                    const _TrustRow(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroBanner extends StatelessWidget {
  final VoidCallback onExplore;

  const _HeroBanner({required this.onExplore});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(20, 22, 20, 18),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1F2937), Color(0xFF111827)],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const CircularBrandLogo(size: 44),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Everything you need, in one place.',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              'Cars, Parts, Rentals, Tickets, Shopping & More — Dirshay has you covered.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: Colors.white.withValues(alpha: 0.8),
                    height: 1.4,
                  ),
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              onPressed: onExplore,
              icon: const Icon(Icons.arrow_forward_rounded, size: 18),
              label: const Text('Explore Bus Booking'),
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.primary,
                minimumSize: const Size(0, 44),
                padding: const EdgeInsets.symmetric(horizontal: 16),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ServiceTile extends StatelessWidget {
  final _HubItem item;
  final VoidCallback onTap;

  const _ServiceTile({required this.item, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: item.featured ? AppColors.primary : AppColors.border,
              width: item.featured ? 1.6 : 1,
            ),
            boxShadow: AppShadows.card,
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 12, 8, 10),
            child: Column(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: item.color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(item.icon, color: item.color, size: 26),
                ),
                const SizedBox(height: 8),
                Text(
                  item.title,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12, height: 1.15),
                ),
                const SizedBox(height: 2),
                Text(
                  item.subtitle,
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: AppColors.textMuted, fontSize: 10, height: 1.2),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SellBanner extends StatelessWidget {
  final VoidCallback onPost;

  const _SellBanner({required this.onPost});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF1F2),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Sell Anything in Minutes',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
          ),
          const SizedBox(height: 6),
          Text(
            'List your car, parts or any item and reach thousands of buyers.',
            style: TextStyle(color: AppColors.textMuted, fontSize: 13, height: 1.35),
          ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: onPost,
            style: FilledButton.styleFrom(minimumSize: const Size(120, 42)),
            child: const Text('Post Now'),
          ),
        ],
      ),
    );
  }
}

class _TrustRow extends StatelessWidget {
  const _TrustRow();

  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.verified_user_outlined, 'Verified'),
      (Icons.lock_outline_rounded, 'Secure'),
      (Icons.support_agent_rounded, '24/7'),
      (Icons.bolt_rounded, 'Fast'),
      (Icons.location_on_outlined, 'Ethiopia'),
    ];
    return Row(
      children: items
          .map(
            (e) => Expanded(
              child: Column(
                children: [
                  Icon(e.$1, size: 20, color: AppColors.primary),
                  const SizedBox(height: 4),
                  Text(e.$2, textAlign: TextAlign.center, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          )
          .toList(),
    );
  }
}

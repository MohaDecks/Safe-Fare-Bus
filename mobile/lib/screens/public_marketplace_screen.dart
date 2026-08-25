import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../theme/app_theme.dart';
import '../widgets/brand_logo.dart';
import '../widgets/dirshay_hub.dart';
import '../services/hub_media.dart';
import 'service_webview_screen.dart';

/// First screen after splash — DIRSHAY marketplace. Bus Booking opens login.
class PublicMarketplaceScreen extends StatefulWidget {
  final ApiService api;
  final VoidCallback onBusBooking;
  final VoidCallback? onOpenLogin;

  const PublicMarketplaceScreen({
    super.key,
    required this.api,
    required this.onBusBooking,
    this.onOpenLogin,
  });

  @override
  State<PublicMarketplaceScreen> createState() => _PublicMarketplaceScreenState();
}

class _PublicMarketplaceScreenState extends State<PublicMarketplaceScreen> {
  final _search = TextEditingController();
  final _gridKey = GlobalKey();
  List<Map<String, dynamic>> _linked = [];
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    _loadLinked();
    _loadMedia();
  }

  Future<void> _loadMedia() async {
    await HubMedia.load(widget.api);
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _loadLinked() async {
    try {
      final list = await widget.api.getList('/mobile/app-services', auth: false);
      if (!mounted) return;
      setState(() {
        _linked = list.map((e) => Map<String, dynamic>.from(e as Map)).toList();
      });
    } catch (_) {}
  }

  List<HubItem> get _items {
    final linked = hubItemsFromLinked(_linked);
    final hasDynamicParking = linked.any((e) => e.title.toLowerCase().contains('park'));
    final catalog = hasDynamicParking ? kHubCatalog.where((e) => e.id != 'parking') : kHubCatalog;
    return filterHubItems(applyHubMedia([...catalog, ...linked]), _search.text);
  }

  void _scrollToServices() {
    final ctx = _gridKey.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 400), alignment: 0.05);
    }
  }

  void _comingSoon(String title) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$title is coming soon')));
  }

  void _openItem(HubItem item) {
    if (item.id == 'bus') {
      widget.onBusBooking();
      return;
    }
    if (item.url != null && item.url!.isNotEmpty) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ServiceWebViewScreen(title: item.title, url: item.url!)),
      );
      return;
    }
    Map<String, dynamic>? parking;
    for (final s in _linked) {
      if ((s['name']?.toString() ?? '').toLowerCase().contains('park')) {
        parking = s;
        break;
      }
    }
    if (item.id == 'parking' && parking != null) {
      final raw = parking['link_url']?.toString() ?? '';
      if (raw.isNotEmpty) {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ServiceWebViewScreen(title: item.title, url: raw)),
        );
        return;
      }
    }
    showHubComingSoon(context, item);
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
                  widget.onBusBooking();
                },
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Builder(
                      builder: (ctx) => HubBrandBar(onMenu: () => Scaffold.of(ctx).openDrawer()),
                    ),
                    const SizedBox(height: 8),
                    HubSearchRow(controller: _search, onChanged: (_) => setState(() {})),
                    const SizedBox(height: 16),
                    HubHeroBanner(onExplore: _scrollToServices),
                    const SizedBox(height: 22),
                    KeyedSubtree(
                      key: _gridKey,
                      child: Text(
                        'Our Services',
                        style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tap Bus Booking to sign in and pay fare',
                      style: theme.textTheme.bodySmall?.copyWith(color: AppColors.textMuted),
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
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.15,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, i) => HubServiceTile(item: items[i], onTap: () => _openItem(items[i])),
                  childCount: items.length,
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
                child: Column(
                  children: [
                    HubSellBanner(onPost: () => _comingSoon('Post / Sell')),
                    const SizedBox(height: 20),
                    const HubTrustRow(),
                    const SizedBox(height: 16),
                    _DownloadBar(),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
      floatingActionButton: FloatingActionButton(
        onPressed: () => _comingSoon('Post / Sell'),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        child: const Icon(Icons.add, size: 30),
      ),
      bottomNavigationBar: BottomAppBar(
        shape: const CircularNotchedRectangle(),
        notchMargin: 8,
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              _TabBtn(icon: Icons.home_rounded, label: 'Home', selected: _tab == 0, onTap: () => setState(() => _tab = 0)),
              _TabBtn(icon: Icons.calendar_month_rounded, label: 'Bookings', selected: false, onTap: widget.onBusBooking),
              const SizedBox(width: 56),
              _TabBtn(icon: Icons.chat_bubble_outline_rounded, label: 'Messages', selected: _tab == 3, onTap: () => _comingSoon('Messages')),
              _TabBtn(icon: Icons.person_outline_rounded, label: 'Profile', selected: false, onTap: widget.onOpenLogin ?? widget.onBusBooking),
            ],
          ),
        ),
      ),
    );
  }
}

class _DownloadBar extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: const Color(0xFF111827),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        children: [
          const CircularBrandLogo(size: 40),
          const SizedBox(width: 12),
          const Expanded(
            child: Text(
              'Download Dirshay App',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800),
            ),
          ),
          Text('Play · App Store', style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 11)),
        ],
      ),
    );
  }
}

class _TabBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _TabBtn({required this.icon, required this.label, required this.selected, required this.onTap});

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
            Text(label, style: TextStyle(fontSize: 11, fontWeight: selected ? FontWeight.w800 : FontWeight.w500, color: color)),
          ],
        ),
      ),
    );
  }
}


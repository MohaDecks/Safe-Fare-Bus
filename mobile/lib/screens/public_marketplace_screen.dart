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

  List<HubItem> get _allLinked => hubItemsFromLinked(_linked);

  List<HubItem> get _serviceItems {
    final linked = _allLinked.where((e) => e.placement != 'mini_app' && e.id != 'bus').toList();
    final bus = kHubBus.withImageUrl(HubMedia.serviceUrl('bus'));
    return filterHubItems([bus, ...linked], _search.text);
  }

  List<HubItem> get _miniItems {
    return filterHubItems(_allLinked.where((e) => e.placement == 'mini_app').toList(), _search.text);
  }

  void _scrollToServices() {
    setState(() => _tab = 2);
    final ctx = _gridKey.currentContext;
    if (ctx != null) {
      Scrollable.ensureVisible(ctx, duration: const Duration(milliseconds: 400), alignment: 0.05);
    }
  }

  void _openItem(HubItem item) {
    final title = item.title.toLowerCase();
    if (item.id == 'bus' || (title.contains('bus') && (item.url == null || item.url!.isEmpty))) {
      widget.onBusBooking();
      return;
    }
    if (item.url != null && item.url!.isNotEmpty) {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ServiceWebViewScreen(title: item.title, url: item.url!)),
      );
      return;
    }
    showHubComingSoon(context, item);
  }

  Widget _sectionTitle(String text) {
    return Text(text, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800));
  }

  Widget _serviceGrid(List<HubItem> items) {
    if (items.isEmpty) {
      return const SliverToBoxAdapter(
        child: Padding(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Text('No services yet', style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
        ),
      );
    }
    return SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      sliver: SliverGrid(
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          childAspectRatio: 1.85,
        ),
        delegate: SliverChildBuilderDelegate(
          (context, i) => HubServiceTile(item: items[i], onTap: () => _openItem(items[i])),
          childCount: items.length,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final services = _serviceItems;
    final mini = _miniItems;

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
        child: Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
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
                    HubHeroBanner(
                      onExplore: _scrollToServices,
                      imageUrl: HubMedia.bannerUrl.isEmpty ? null : HubMedia.bannerUrl,
                    ),
                    const SizedBox(height: 22),
                    KeyedSubtree(key: _gridKey, child: _sectionTitle('Our Services')),
                    const SizedBox(height: 10),
                  ],
                ),
              ),
            ),
            _serviceGrid(services),
            if (mini.isNotEmpty)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 22, 16, 14),
                  child: _sectionTitle('New Mini Apps'),
                ),
              ),
            if (mini.isNotEmpty) _serviceGrid(mini),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 22, 16, 16),
                child: Column(
                  children: [
                    const HubTrustRow(),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          ],
            ),
          ),
        ),
      ),
      bottomNavigationBar: BottomAppBar(
        child: SizedBox(
          height: 64,
          child: Row(
            children: [
              _TabBtn(icon: Icons.home_rounded, label: 'Home', selected: _tab == 0, onTap: () => setState(() => _tab = 0)),
              _TabBtn(icon: Icons.calendar_month_rounded, label: 'Bookings', selected: _tab == 1, onTap: widget.onBusBooking),
              _TabBtn(icon: Icons.grid_view_rounded, label: 'Services', selected: _tab == 2, onTap: _scrollToServices),
              _TabBtn(icon: Icons.account_balance_wallet_outlined, label: 'Wallet', selected: false, onTap: widget.onBusBooking),
              _TabBtn(
                icon: Icons.person_outline_rounded,
                label: 'Profile',
                selected: false,
                onTap: widget.onOpenLogin ?? widget.onBusBooking,
              ),
            ],
          ),
        ),
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

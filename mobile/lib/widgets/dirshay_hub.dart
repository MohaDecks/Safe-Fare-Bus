import 'package:flutter/material.dart';
import '../services/hub_media.dart';
import '../theme/app_theme.dart';
import 'brand_logo.dart';

class HubItem {
  final String id;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final bool featured;
  final String? url;
  final String? imageAsset;
  final String? imageUrl;

  const HubItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    this.featured = false,
    this.url,
    this.imageAsset,
    this.imageUrl,
  });

  HubItem withImageUrl(String? image) {
    if (image == null || image.isEmpty) return this;
    return HubItem(
      id: id,
      title: title,
      subtitle: subtitle,
      icon: icon,
      color: color,
      featured: featured,
      url: url,
      imageAsset: imageAsset,
      imageUrl: image,
    );
  }
}

const kHubCatalog = <HubItem>[
  HubItem(
    id: 'bus',
    title: 'Bus Booking',
    subtitle: 'Pay fare & tickets',
    icon: Icons.directions_bus_rounded,
    color: AppColors.primary,
    featured: true,
    imageAsset: 'assets/images/services/bus.png',
  ),
  HubItem(
    id: 'parking',
    title: 'Parking',
    subtitle: 'Find & book parking',
    icon: Icons.local_parking_rounded,
    color: Color(0xFF2563EB),
    imageAsset: 'assets/images/services/parking.png',
  ),
  HubItem(
    id: 'cars',
    title: 'Car Market',
    subtitle: 'Buy & sell cars',
    icon: Icons.directions_car_rounded,
    color: Color(0xFFDC2626),
    imageAsset: 'assets/images/services/car.png',
  ),
  HubItem(
    id: 'parts',
    title: 'Spare Parts',
    subtitle: 'New & used parts',
    icon: Icons.settings_suggest_rounded,
    color: Color(0xFFEA580C),
    imageAsset: 'assets/images/services/parts.png',
  ),
  HubItem(
    id: 'house',
    title: 'House Rental',
    subtitle: 'Rent a house',
    icon: Icons.home_work_rounded,
    color: Color(0xFF0D9488),
    imageAsset: 'assets/images/services/house.png',
  ),
  HubItem(
    id: 'flights',
    title: 'Flight Tickets',
    subtitle: 'Book flights',
    icon: Icons.flight_rounded,
    color: Color(0xFF4F46E5),
    imageAsset: 'assets/images/services/flight.png',
  ),
  HubItem(
    id: 'tv',
    title: 'TV Repair',
    subtitle: 'Repair TV',
    icon: Icons.tv_rounded,
    color: Color(0xFF7C3AED),
    imageAsset: 'assets/images/services/tv.png',
  ),
  HubItem(
    id: 'fridge',
    title: 'Fridge Repair',
    subtitle: 'Repair fridge',
    icon: Icons.kitchen_rounded,
    color: Color(0xFF0891B2),
    imageAsset: 'assets/images/services/fridge.png',
  ),
  HubItem(
    id: 'cooker',
    title: 'Cooker Repair',
    subtitle: 'Repair cooker',
    icon: Icons.microwave_rounded,
    color: Color(0xFFDB2777),
    imageAsset: 'assets/images/services/cooker.png',
  ),
  HubItem(
    id: 'electricals',
    title: 'Electricals',
    subtitle: 'Electrical supplies',
    icon: Icons.lightbulb_rounded,
    color: Color(0xFFF59E0B),
    imageAsset: 'assets/images/services/electrical.png',
  ),
  HubItem(
    id: 'furniture',
    title: 'Furniture',
    subtitle: 'Home & office',
    icon: Icons.weekend_rounded,
    color: Color(0xFF64748B),
    imageAsset: 'assets/images/services/furniture.png',
  ),
  HubItem(
    id: 'appliances',
    title: 'Home Appliances',
    subtitle: 'Appliances',
    icon: Icons.local_laundry_service_rounded,
    color: Color(0xFF0284C7),
    imageAsset: 'assets/images/services/appliances.png',
  ),
  HubItem(
    id: 'electronics',
    title: 'Electronics',
    subtitle: 'Phones & more',
    icon: Icons.phone_iphone_rounded,
    color: Color(0xFF334155),
    imageAsset: 'assets/images/services/electronics.png',
  ),
  HubItem(
    id: 'jobs',
    title: 'Jobs',
    subtitle: 'Find & post jobs',
    icon: Icons.work_rounded,
    color: Color(0xFF78716C),
    imageAsset: 'assets/images/services/jobs.png',
  ),
  HubItem(
    id: 'more',
    title: 'More Services',
    subtitle: 'Explore more',
    icon: Icons.apps_rounded,
    color: Color(0xFF64748B),
    imageAsset: 'assets/images/services/more.png',
  ),
];

List<HubItem> applyHubMedia(List<HubItem> items) {
  return items.map((e) => e.withImageUrl(HubMedia.serviceUrl(e.id))).toList();
}

List<HubItem> hubItemsFromLinked(List<Map<String, dynamic>> linked) {
  return linked.map((s) {
    final name = s['name']?.toString() ?? 'Service';
    final url = s['link_url']?.toString() ?? '';
    final iconUrl = s['icon_url']?.toString() ?? '';
    return HubItem(
      id: 'link-${s['id'] ?? name}',
      title: name,
      subtitle: 'Open in Dirsha',
      icon: Icons.grid_view_rounded,
      color: AppColors.primary,
      url: url.isEmpty ? null : url,
      imageUrl: iconUrl.isEmpty ? null : iconUrl,
    );
  }).toList();
}

List<HubItem> filterHubItems(List<HubItem> items, String query) {
  final q = query.trim().toLowerCase();
  if (q.isEmpty) return items;
  return items.where((e) => e.title.toLowerCase().contains(q) || e.subtitle.toLowerCase().contains(q)).toList();
}

void showHubComingSoon(BuildContext context, HubItem item) {
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
          FilledButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
        ],
      ),
    ),
  );
}

class HubBrandBar extends StatelessWidget {
  final VoidCallback? onMenu;

  const HubBrandBar({super.key, this.onMenu});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (onMenu != null)
          IconButton(onPressed: onMenu, icon: const Icon(Icons.menu_rounded))
        else
          const SizedBox(width: 48),
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
        IconButton(onPressed: () {}, icon: const Icon(Icons.notifications_none_rounded)),
      ],
    );
  }
}

class HubSearchRow extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String>? onChanged;

  const HubSearchRow({super.key, required this.controller, this.onChanged});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: TextField(
            controller: controller,
            onChanged: onChanged,
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
          decoration: BoxDecoration(color: AppColors.background, borderRadius: BorderRadius.circular(14)),
          child: IconButton(onPressed: () {}, icon: const Icon(Icons.tune_rounded)),
        ),
      ],
    );
  }
}

class HubHeroBanner extends StatelessWidget {
  final VoidCallback onExplore;

  const HubHeroBanner({super.key, required this.onExplore});

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
              label: const Text('Explore All Services'),
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

class HubServiceTile extends StatelessWidget {
  final HubItem item;
  final VoidCallback onTap;

  const HubServiceTile({super.key, required this.item, required this.onTap});

  Widget _picture() {
    Widget assetOrIcon() {
      if (item.imageAsset != null && item.imageAsset!.isNotEmpty) {
        return Image.asset(
          item.imageAsset!,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _iconFallback(),
        );
      }
      return _iconFallback();
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: SizedBox(
        width: 56,
        height: 56,
        child: item.imageUrl != null && item.imageUrl!.isNotEmpty
            ? Image.network(
                item.imageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => assetOrIcon(),
              )
            : assetOrIcon(),
      ),
    );
  }

  Widget _iconFallback() {
    return ColoredBox(
      color: item.color.withValues(alpha: 0.12),
      child: Icon(item.icon, color: item.color, size: 28),
    );
  }

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
            padding: const EdgeInsets.fromLTRB(12, 12, 10, 12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _picture(),
                    const Spacer(),
                    Container(
                      width: 26,
                      height: 26,
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Icon(Icons.arrow_forward_rounded, size: 14, color: item.color),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Text(
                  item.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14),
                ),
                const SizedBox(height: 2),
                Text(
                  item.subtitle,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: AppColors.textMuted, fontSize: 11, height: 1.25),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class HubServiceGrid extends StatelessWidget {
  final List<HubItem> items;
  final void Function(HubItem item) onTap;

  const HubServiceGrid({super.key, required this.items, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: items.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.15,
      ),
      itemBuilder: (context, i) => HubServiceTile(item: items[i], onTap: () => onTap(items[i])),
    );
  }
}

class HubSellBanner extends StatelessWidget {
  final VoidCallback onPost;

  const HubSellBanner({super.key, required this.onPost});

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
          const Text('Sell Anything in Minutes', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
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

class HubTrustRow extends StatelessWidget {
  const HubTrustRow({super.key});

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

import 'package:flutter/material.dart';
import '../services/hub_media.dart';
import '../theme/app_theme.dart';

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
  final String placement;

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
    this.placement = 'service',
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
      placement: placement,
    );
  }
}

const kHubBus = HubItem(
  id: 'bus',
  title: 'Bus Booking',
  subtitle: 'Pay fare & tickets',
  icon: Icons.directions_bus_rounded,
  color: AppColors.primary,
  featured: true,
  imageAsset: 'assets/images/services/bus.png',
);

const kHubCatalog = <HubItem>[
  kHubBus,
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
      subtitle: s['placement']?.toString() == 'mini_app' ? 'Mini app' : 'Open in Dirsha',
      icon: Icons.grid_view_rounded,
      color: AppColors.primary,
      url: url.isEmpty ? null : url,
      imageUrl: iconUrl.isEmpty ? null : iconUrl,
      placement: s['placement']?.toString() == 'mini_app' ? 'mini_app' : 'service',
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
  final String? imageUrl;

  const HubHeroBanner({super.key, required this.onExplore, this.imageUrl});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: SizedBox(
        height: 168,
        child: Row(
          children: [
            Expanded(
              flex: 5,
              child: ColoredBox(
                color: AppColors.primary,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 10, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Everything you need, all in one place.',
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w800,
                              height: 1.2,
                            ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Cars, rentals, tickets, shopping and more — Dirsha has you covered.',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.white.withValues(alpha: 0.9),
                              height: 1.3,
                              fontSize: 11,
                            ),
                      ),
                      const Spacer(),
                      FilledButton(
                        onPressed: onExplore,
                        style: FilledButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: AppColors.primary,
                          minimumSize: const Size(0, 36),
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          textStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 12),
                        ),
                        child: const Text('Explore All Services'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Expanded(
              flex: 4,
              child: imageUrl != null && imageUrl!.isNotEmpty
                  ? Image.network(
                      imageUrl!,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: double.infinity,
                      errorBuilder: (_, __, ___) => const _HeroFallbackArt(),
                    )
                  : const _HeroFallbackArt(),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroFallbackArt extends StatelessWidget {
  const _HeroFallbackArt();

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xFFFEE2E2),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            right: -8,
            bottom: -12,
            child: Icon(Icons.directions_bus_rounded, size: 88, color: AppColors.primary.withValues(alpha: 0.35)),
          ),
          const Positioned(
            left: 12,
            top: 16,
            child: Icon(Icons.home_work_rounded, size: 36, color: Color(0xFF0D9488)),
          ),
          const Positioned(
            right: 16,
            top: 20,
            child: Icon(Icons.directions_car_rounded, size: 32, color: Color(0xFFDC2626)),
          ),
        ],
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
      borderRadius: BorderRadius.circular(10),
      child: SizedBox(
        width: 32,
        height: 32,
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
      child: Icon(item.icon, color: item.color, size: 18),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: item.featured ? AppColors.primary : AppColors.border,
              width: item.featured ? 1.4 : 1,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _picture(),
                    const Spacer(),
                    Container(
                      width: 18,
                      height: 18,
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Icon(Icons.arrow_forward_rounded, size: 10, color: item.color),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  item.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11),
                ),
                Text(
                  item.subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(color: AppColors.textMuted, fontSize: 9, height: 1.15),
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
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        childAspectRatio: 1.55,
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

class HubMoreWays extends StatelessWidget {
  final List<HubItem> items;
  final void Function(HubItem item) onTap;

  const HubMoreWays({super.key, required this.items, required this.onTap});

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'More ways Dirsha makes life easier',
          style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 92,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: items.length,
            separatorBuilder: (_, __) => const SizedBox(width: 14),
            itemBuilder: (context, i) {
              final item = items[i];
              return InkWell(
                onTap: () => onTap(item),
                borderRadius: BorderRadius.circular(12),
                child: SizedBox(
                  width: 76,
                  child: Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: SizedBox(
                          width: 52,
                          height: 52,
                          child: item.imageUrl != null && item.imageUrl!.isNotEmpty
                              ? Image.network(item.imageUrl!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _chipIcon(item))
                              : item.imageAsset != null
                                  ? Image.asset(item.imageAsset!, fit: BoxFit.cover, errorBuilder: (_, __, ___) => _chipIcon(item))
                                  : _chipIcon(item),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        item.title,
                        maxLines: 2,
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, height: 1.15),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _chipIcon(HubItem item) {
    return ColoredBox(
      color: item.color.withValues(alpha: 0.12),
      child: Icon(item.icon, color: item.color, size: 26),
    );
  }
}

class HubTrustRow extends StatelessWidget {
  const HubTrustRow({super.key});

  @override
  Widget build(BuildContext context) {
    const items = [
      (Icons.verified_user_outlined, 'Secure & Safe'),
      (Icons.bolt_rounded, 'Fast & Easy'),
      (Icons.support_agent_rounded, '24/7 Support'),
      (Icons.favorite_outline_rounded, 'Trusted Platform'),
    ];
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
      decoration: BoxDecoration(color: AppColors.primary, borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: items
            .map(
              (e) => Expanded(
                child: Column(
                  children: [
                    Icon(e.$1, size: 20, color: Colors.white),
                    const SizedBox(height: 4),
                    Text(
                      e.$2,
                      textAlign: TextAlign.center,
                      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: Colors.white, height: 1.2),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

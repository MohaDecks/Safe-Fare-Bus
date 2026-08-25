import 'package:flutter/material.dart';
import '../services/hub_media.dart';
import '../theme/app_theme.dart';

/// Dirsha logo with text (`img/last.png` → assets). Used if Cloudinary is offline.
const kBrandLogoAsset = 'assets/images/dirsha_logo.png';

/// Circular logo — Cloudinary first, then local asset.
class CircularBrandLogo extends StatelessWidget {
  final double size;

  const CircularBrandLogo({super.key, this.size = 200});

  @override
  Widget build(BuildContext context) {
    final url = HubMedia.logoUrl;
    return ClipOval(
      child: SizedBox(
        width: size,
        height: size,
        child: url.isNotEmpty
            ? Image.network(
                url,
                fit: BoxFit.cover,
                filterQuality: FilterQuality.high,
                gaplessPlayback: true,
                errorBuilder: (_, __, ___) => _assetLogo(),
              )
            : _assetLogo(),
      ),
    );
  }

  Widget _assetLogo() {
    return Image.asset(
      kBrandLogoAsset,
      fit: BoxFit.cover,
      filterQuality: FilterQuality.high,
      gaplessPlayback: true,
      errorBuilder: (_, __, ___) => _fallback(size),
    );
  }

  Widget _fallback(double size) {
    return ColoredBox(
      color: AppColors.primary,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.directions_bus, size: size * 0.28, color: Colors.white),
          SizedBox(height: size * 0.04),
          Text(
            'DIRSHA',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              letterSpacing: 2,
              fontSize: size * 0.1,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }
}

/// Login / register header.
class LocalBrandLogo extends StatelessWidget {
  final double size;

  const LocalBrandLogo({super.key, this.size = 80});

  @override
  Widget build(BuildContext context) {
    return CircularBrandLogo(size: size);
  }
}

/// Preload logo (Cloudinary or local) during splash.
Future<void> precacheLocalBrandLogo(BuildContext context) async {
  final url = HubMedia.logoUrl;
  if (url.isNotEmpty) {
    try {
      await precacheImage(NetworkImage(url), context);
      return;
    } catch (_) {}
  }
  if (!context.mounted) return;
  await precacheImage(const AssetImage(kBrandLogoAsset), context);
}

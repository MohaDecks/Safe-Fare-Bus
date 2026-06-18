import 'package:flutter/material.dart';
import '../config/api_config.dart';
import '../models/branding.dart';

/// Company logo from admin portal (database) — no hardcoded app name text.
class BrandLogo extends StatelessWidget {
  final AppBranding branding;
  final double height;
  final double maxWidth;

  const BrandLogo({
    super.key,
    required this.branding,
    this.height = 88,
    this.maxWidth = 220,
  });

  String get _logoUrl {
    final url = branding.logoUrl;
    if (url.isEmpty) return '';
    if (url.startsWith('http')) return url;
    return '${ApiConfig.baseUrl}$url';
  }

  @override
  Widget build(BuildContext context) {
    final url = _logoUrl;
    if (url.isNotEmpty) {
      return Image.network(
        url,
        height: height,
        width: maxWidth,
        fit: BoxFit.contain,
        errorBuilder: (_, __, ___) => _fallbackIcon(height),
      );
    }
    return _fallbackIcon(height);
  }

  Widget _fallbackIcon(double size) {
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: const Color(0xFF7C3AED),
        borderRadius: BorderRadius.circular(size * 0.22),
      ),
      child: Icon(Icons.directions_bus, color: Colors.white, size: size * 0.52),
    );
  }
}

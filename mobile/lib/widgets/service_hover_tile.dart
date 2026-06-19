import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

class ServiceHoverTile extends StatefulWidget {
  final String name;
  final String iconUrl;
  final VoidCallback onTap;

  const ServiceHoverTile({
    super.key,
    required this.name,
    required this.iconUrl,
    required this.onTap,
  });

  @override
  State<ServiceHoverTile> createState() => _ServiceHoverTileState();
}

class _ServiceHoverTileState extends State<ServiceHoverTile> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final initials = widget.name.length >= 2
        ? widget.name.substring(0, 2).toUpperCase()
        : widget.name[0].toUpperCase();

    return MouseRegion(
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          width: 88,
          padding: const EdgeInsets.symmetric(vertical: 4),
          child: Transform.translate(
            offset: Offset(0, _hovered ? -4 : 0),
            child: Transform.scale(
              scale: _hovered ? 1.05 : 1,
              child: Column(
                children: [
                  AnimatedContainer(
                    duration: const Duration(milliseconds: 220),
                    curve: Curves.easeOutCubic,
                    width: 64,
                    height: 64,
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(AppRadii.md),
                      border: Border.all(
                        color: _hovered ? AppColors.primary : AppColors.border,
                        width: _hovered ? 1.5 : 1,
                      ),
                      boxShadow: _hovered ? AppShadows.card : null,
                    ),
                    child: widget.iconUrl.isNotEmpty
                        ? Image.network(
                            widget.iconUrl,
                            fit: BoxFit.contain,
                            errorBuilder: (_, __, ___) => _initials(initials),
                          )
                        : _initials(initials),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    widget.name,
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: _hovered ? FontWeight.w700 : FontWeight.w500,
                      color: _hovered ? AppColors.primary : AppColors.text,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _initials(String text) {
    return Center(
      child: Text(
        text,
        style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.primary),
      ),
    );
  }
}

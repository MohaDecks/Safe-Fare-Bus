import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:web/web.dart' as web;

/// Full-size iframe for Flutter web — avoids webview_flutter_web clipping.
class ServiceWebIframe extends StatefulWidget {
  final String url;

  const ServiceWebIframe({super.key, required this.url});

  @override
  State<ServiceWebIframe> createState() => _ServiceWebIframeState();
}

class _ServiceWebIframeState extends State<ServiceWebIframe> {
  late final String _viewType;

  @override
  void initState() {
    super.initState();
    _viewType = 'sf-service-${widget.url.hashCode}-$hashCode';
    ui_web.platformViewRegistry.registerViewFactory(_viewType, (int _) {
      final iframe = web.HTMLIFrameElement()
        ..src = widget.url
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..style.display = 'block'
        ..allowFullscreen = true;
      return iframe;
    });
  }

  @override
  Widget build(BuildContext context) {
    return HtmlElementView(viewType: _viewType);
  }
}

Widget buildServiceWebFrame({
  required WebViewController controller,
  required String url,
}) {
  return ServiceWebIframe(url: url);
}

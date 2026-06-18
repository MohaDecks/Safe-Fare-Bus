import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../widgets/service_web_iframe_stub.dart'
    if (dart.library.html) '../widgets/service_web_iframe_web.dart';

/// Opens an admin-linked service (APS, parking, …) inside SafeFare — no external browser.
class ServiceWebViewScreen extends StatefulWidget {
  final String title;
  final String url;

  const ServiceWebViewScreen({
    super.key,
    required this.title,
    required this.url,
  });

  @override
  State<ServiceWebViewScreen> createState() => _ServiceWebViewScreenState();
}

class _ServiceWebViewScreenState extends State<ServiceWebViewScreen> {
  WebViewController? _controller;
  bool _loading = true;
  String? _error;

  Uri get _uri => Uri.parse(
        widget.url.startsWith('http') ? widget.url : 'http://${widget.url}',
      );

  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      Future<void>.delayed(const Duration(milliseconds: 600), () {
        if (mounted) setState(() => _loading = false);
      });
      return;
    }
    final controller = WebViewController();
    controller
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() {
            _loading = true;
            _error = null;
          }),
          onPageFinished: (_) {
            setState(() => _loading = false);
            controller.runJavaScript('''
              (function() {
                var meta = document.querySelector('meta[name="viewport"]');
                if (!meta) {
                  meta = document.createElement('meta');
                  meta.name = 'viewport';
                  document.head.appendChild(meta);
                }
                meta.content = 'width=device-width, initial-scale=1.0';
                document.documentElement.style.width = '100%';
                document.body.style.width = '100%';
                document.body.style.margin = '0';
                document.body.style.overflowX = 'auto';
              })();
            ''');
          },
          onWebResourceError: (e) => setState(() {
            _loading = false;
            _error = e.description.isNotEmpty ? e.description : 'Cannot load page';
          }),
        ),
      )
      ..loadRequest(_uri);
    _controller = controller;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        automaticallyImplyLeading: false,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          buildServiceWebFrame(
            controller: _controller ?? WebViewController(),
            url: _uri.toString(),
          ),
          if (_loading)
            const Align(
              alignment: Alignment.topCenter,
              child: LinearProgressIndicator(minHeight: 2),
            ),
          if (_error != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(_error!, textAlign: TextAlign.center),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: () => _controller?.reload(),
                      child: const Text('Try again'),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

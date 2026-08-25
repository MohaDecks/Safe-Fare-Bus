import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:gal/gal.dart';
import 'package:http/http.dart' as http;
import 'package:share_plus/share_plus.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../widgets/service_web_iframe_stub.dart'
    if (dart.library.html) '../widgets/service_web_iframe_web.dart';

/// Opens an admin-linked service inside Dirsha — no external browser.
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
  StreamSubscription? _webMessageSub;

  Uri get _uri => _embeddedServiceUri(widget.url);

  /// Android WebView reports ORB/font/script failures as page errors even when
  /// the main document loaded. Only fail the screen for the main frame.
  static bool _shouldIgnoreWebError(WebResourceError e) {
    if (e.isForMainFrame == false) return true;
    final desc = e.description.toLowerCase();
    const noise = [
      'err_blocked_by_orb',
      'err_blocked_by_response',
      'err_blocked_by_client',
      'err_cache_miss',
      'err_too_many_redirects',
    ];
    return noise.any(desc.contains);
  }

  static Uri _embeddedServiceUri(String raw) {
    final uri = Uri.parse(raw.startsWith('http') ? raw : 'http://$raw');
    return uri.replace(
      queryParameters: {
        ...uri.queryParameters,
        'embedded': '1',
      },
    );
  }

  @override
  void initState() {
    super.initState();
    if (kIsWeb) {
      _webMessageSub = listenServiceWebMessages(_saveReceiptFromPayload);
      Future<void>.delayed(const Duration(milliseconds: 600), () {
        if (mounted) setState(() => _loading = false);
      });
      return;
    }
    final controller = WebViewController();
    controller
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.white)
      ..setUserAgent(
        'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
      )
      ..addJavaScriptChannel(
        'DirshayApp',
        onMessageReceived: (msg) => _saveReceiptFromPayload(msg.message),
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) => setState(() {
            _loading = true;
            _error = null;
          }),
          onPageFinished: (_) {
            setState(() => _loading = false);
            _injectDirshayBridge(controller);
          },
          onWebResourceError: (e) {
            if (_shouldIgnoreWebError(e)) return;
            setState(() {
              _loading = false;
              _error = e.description.isNotEmpty ? e.description : 'Cannot load page';
            });
          },
        ),
      )
      ..loadRequest(_uri);
    _controller = controller;
  }

  Future<void> _injectDirshayBridge(WebViewController controller) async {
    await controller.runJavaScript('''
      (function() {
        try { sessionStorage.setItem('dirsha_embedded', '1'); } catch (e) {}
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
        if (!window.DirshayApp) window.DirshayApp = {};
        window.DirshayApp.saveReceipt = function(payload) {
          var msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
          if (window.DirshayApp.postMessage) window.DirshayApp.postMessage(msg);
        };
      })();
    ''');
  }

  Future<Uint8List> _loadReceiptBytes(Map<String, dynamic> map) async {
    final b64 = map['base64']?.toString();
    if (b64 != null && b64.isNotEmpty) {
      return base64Decode(b64);
    }

    final dataUrl = map['dataUrl']?.toString();
    if (dataUrl != null && dataUrl.contains(',')) {
      return base64Decode(dataUrl.split(',').last);
    }

    final receiptUrl = map['receiptUrl']?.toString();
    if (receiptUrl != null && receiptUrl.isNotEmpty) {
      final res = await http.get(Uri.parse(receiptUrl));
      if (res.statusCode == 200 && res.bodyBytes.isNotEmpty) {
        return res.bodyBytes;
      }
    }

    throw StateError('No receipt image data');
  }

  Future<void> _saveReceiptFromPayload(String raw) async {
    try {
      final map = jsonDecode(raw) as Map<String, dynamic>;
      if (map['type'] != 'saveReceipt') return;

      if (kIsWeb) {
        final dataUrl = map['dataUrl']?.toString();
        final filename = map['filename']?.toString() ?? 'invoice.png';
        if (dataUrl != null && dataUrl.isNotEmpty) {
          downloadDataUrlOnWeb(dataUrl, filename);
          _toast('Invoice downloaded');
        }
        return;
      }

      final filename = map['filename']?.toString() ?? 'invoice.png';
      final bytes = await _loadReceiptBytes(map);
      if (!mounted) return;

      var savedToGallery = false;
      if (!kIsWeb) {
        try {
          await Gal.requestAccess();
          await Gal.putImageBytes(bytes, name: filename);
          savedToGallery = true;
        } catch (_) {
          savedToGallery = false;
        }
      }

      if (savedToGallery) {
        _toast('Invoice saved to gallery');
        return;
      }

      await Share.shareXFiles(
        [XFile.fromData(bytes, mimeType: 'image/png', name: filename)],
        subject: 'Parking invoice',
      );
    } catch (e) {
      if (!mounted) return;
      _toast('Could not save invoice — try Share instead');
    }
  }

  void _toast(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  void dispose() {
    _webMessageSub?.cancel();
    super.dispose();
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

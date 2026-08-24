import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';
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

StreamSubscription? listenServiceWebMessages(void Function(String payload) onPayload) {
  final jsHandler = ((web.Event event) {
    final data = (event as web.MessageEvent).data;
    if (data == null) return;
    final String raw;
    if (data.isA<JSString>()) {
      raw = (data as JSString).toDart;
    } else {
      raw = data.toString();
    }
    if (raw.startsWith('{') && raw.contains('saveReceipt')) {
      onPayload(raw);
    }
  }).toJS;

  web.window.addEventListener('message', jsHandler);
  return _MessageSub(() => web.window.removeEventListener('message', jsHandler));
}

class _MessageSub implements StreamSubscription<Never> {
  _MessageSub(this._onCancel);
  final void Function() _onCancel;

  @override
  Future<void> cancel() async => _onCancel();

  @override
  void onData(void Function(Never data)? handleData) {}

  @override
  void onDone(void Function()? handleDone) {}

  @override
  void onError(Function? handleError) {}

  @override
  void pause([Future<void>? resumeSignal]) {}

  @override
  void resume() {}

  @override
  bool get isPaused => false;

  @override
  Future<E> asFuture<E>([E? futureValue]) => Future.value(futureValue);
}

void downloadDataUrlOnWeb(String dataUrl, String filename) {
  final anchor = web.HTMLAnchorElement()
    ..href = dataUrl
    ..download = filename;
  web.document.body?.append(anchor);
  anchor.click();
  anchor.remove();
}

String? parseReceiptDataUrl(String raw) {
  try {
    final map = jsonDecode(raw) as Map<String, dynamic>;
    if (map['type'] != 'saveReceipt') return null;
    return map['dataUrl']?.toString();
  } catch (_) {
    return null;
  }
}

String parseReceiptFilename(String raw) {
  try {
    final map = jsonDecode(raw) as Map<String, dynamic>;
    return map['filename']?.toString() ?? 'invoice.png';
  } catch (_) {
    return 'invoice.png';
  }
}

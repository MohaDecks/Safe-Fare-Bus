import 'dart:async';

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// Web iframe can go back in-page; native uses WebViewController instead.
class ServiceIframeNav {
  Future<bool> goBack() async => false;
}

Widget buildServiceWebFrame({
  required WebViewController controller,
  required String url,
  ServiceIframeNav? nav,
}) {
  return WebViewWidget(controller: controller);
}

StreamSubscription? listenServiceWebMessages(void Function(String payload) onPayload) {
  return null;
}

void downloadDataUrlOnWeb(String dataUrl, String filename) {}

import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

Widget buildServiceWebFrame({
  required WebViewController controller,
  required String url,
}) {
  return WebViewWidget(controller: controller);
}

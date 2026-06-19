import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dirsha/main.dart';

void main() {
  testWidgets('App shows splash on launch', (tester) async {
    await tester.pumpWidget(const DirshaApp());
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:safefare_mobile/main.dart';

void main() {
  testWidgets('App shows splash on launch', (tester) async {
    await tester.pumpWidget(const SafeFareApp());
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}

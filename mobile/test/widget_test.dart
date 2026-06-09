import 'package:flutter_test/flutter_test.dart';
import 'package:safefare_mobile/main.dart';

void main() {
  testWidgets('SafeFare app loads', (tester) async {
    await tester.pumpWidget(const SafeFareApp());
    expect(find.text('SafeFare'), findsOneWidget);
  });
}

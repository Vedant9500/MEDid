import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:medid_mobile/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const MedIDApp());

    // Verify that our app shows the login screen title
    expect(find.text('MedID Field Ops'), findsOneWidget);
    expect(find.text('Login'), findsOneWidget);
  });
}

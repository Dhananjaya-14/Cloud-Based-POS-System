import 'package:flutter/material.dart';
import 'screens/login_screen.dart';

void main() {
  runApp(const HotelPOSApp());
}

class HotelPOSApp extends StatelessWidget {
  const HotelPOSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hotel POS',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        fontFamily: 'Arial',
        scaffoldBackgroundColor: const Color(0xFFEFF6FB),
        useMaterial3: true,
      ),
      home: const LoginScreen(),
    );
  }
}
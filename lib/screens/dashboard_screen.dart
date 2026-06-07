import 'dart:async';
import 'package:flutter/material.dart';
import 'login_screen.dart';

class DashboardScreen extends StatefulWidget {
  final String selectedLanguage;

  const DashboardScreen({
    super.key,
    this.selectedLanguage = "EN",
  });

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Timer timer;
  DateTime now = DateTime.now();

  late String selectedLanguage;

  @override
  void initState() {
    super.initState();

    selectedLanguage = widget.selectedLanguage;

    timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        now = DateTime.now();
      });
    });
  }

  @override
  void dispose() {
    timer.cancel();
    super.dispose();
  }

  String text(String en, String sin) {
    return selectedLanguage == "EN" ? en : sin;
  }

  String getFormattedDate() {
    const months = [
      "JAN",
      "FEB",
      "MAR",
      "APR",
      "MAY",
      "JUN",
      "JUL",
      "AUG",
      "SEP",
      "OCT",
      "NOV",
      "DEC",
    ];

    final day = now.day.toString().padLeft(2, "0");
    final month = months[now.month - 1];
    final year = now.year;

    return "$day $month $year";
  }

  String getFormattedTime() {
    int hour = now.hour;
    final minute = now.minute.toString().padLeft(2, "0");
    final period = hour >= 12 ? "PM" : "AM";

    if (hour == 0) {
      hour = 12;
    } else if (hour > 12) {
      hour -= 12;
    }

    return "${hour.toString().padLeft(2, "0")}:$minute $period";
  }

  void logout(BuildContext context) {
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (context) => LoginScreen(
          selectedLanguage: selectedLanguage,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final dateText = getFormattedDate();
    final timeText = getFormattedTime();

    return Scaffold(
      backgroundColor: const Color(0xFFEFF6FB),
      body: SafeArea(
        child: Column(
          children: [
            DashboardTopBar(
              dateText: dateText,
              timeText: timeText,
              selectedLanguage: selectedLanguage,
              onLanguageChanged: (lang) {
                setState(() {
                  selectedLanguage = lang;
                });
              },
            ),
            Expanded(
              child: Center(
                child: Container(
                  width: 500,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.dashboard_rounded,
                        size: 64,
                        color: Color(0xFF0284C7),
                      ),

                      const SizedBox(height: 16),

                      Text(
                        text(
                          "Welcome to Hotel POS Dashboard",
                          "Hotel POS Dashboard වෙත සාදරයෙන් පිළිගනිමු",
                        ),
                        style: const TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF202124),
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 8),

                      Text(
                        text(
                          "Login successful. You are now inside the system.",
                          "Login සාර්ථකයි. ඔබ දැන් system එක තුළ සිටී.",
                        ),
                        style: const TextStyle(
                          fontSize: 14,
                          color: Color(0xFF6B7280),
                        ),
                        textAlign: TextAlign.center,
                      ),

                      const SizedBox(height: 24),

                      SizedBox(
                        width: 180,
                        height: 45,
                        child: ElevatedButton(
                          onPressed: () => logout(context),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.black,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: Text(
                            text("Logout", "Logout වන්න"),
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class DashboardTopBar extends StatelessWidget {
  final String dateText;
  final String timeText;
  final String selectedLanguage;
  final Function(String) onLanguageChanged;

  const DashboardTopBar({
    super.key,
    required this.dateText,
    required this.timeText,
    required this.selectedLanguage,
    required this.onLanguageChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 34,
      padding: const EdgeInsets.symmetric(horizontal: 26),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Color(0xFF0284C7),
            Color(0xFF16A34A),
          ],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.storefront_outlined,
            size: 14,
            color: Colors.white,
          ),

          const SizedBox(width: 6),

          const Text(
            "pos",
            style: topBarTextStyle,
          ),

          const Spacer(),

          Text(dateText, style: topBarTextStyle),

          const SizedBox(width: 28),

          Text(timeText, style: topBarTextStyle),

          const SizedBox(width: 28),

          GestureDetector(
            onTap: () => onLanguageChanged("EN"),
            child: Text(
              "EN",
              style: topBarTextStyle.copyWith(
                color: selectedLanguage == "EN"
                    ? Colors.white
                    : Colors.white.withOpacity(0.55),
                fontWeight: selectedLanguage == "EN"
                    ? FontWeight.w900
                    : FontWeight.w600,
              ),
            ),
          ),

          const SizedBox(width: 24),

          GestureDetector(
            onTap: () => onLanguageChanged("SIN"),
            child: Text(
              "SIN",
              style: topBarTextStyle.copyWith(
                color: selectedLanguage == "SIN"
                    ? Colors.white
                    : Colors.white.withOpacity(0.55),
                fontWeight: selectedLanguage == "SIN"
                    ? FontWeight.w900
                    : FontWeight.w600,
              ),
            ),
          ),

          const SizedBox(width: 24),

          Text(
            selectedLanguage == "EN" ? "Help" : "උදව්",
            style: topBarTextStyle,
          ),
        ],
      ),
    );
  }
}

const TextStyle topBarTextStyle = TextStyle(
  color: Colors.white,
  fontSize: 10,
  fontWeight: FontWeight.w700,
);
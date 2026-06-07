import 'dart:async';
import 'package:flutter/material.dart';

class ForgotPasswordScreen extends StatefulWidget {
  final String selectedLanguage;

  const ForgotPasswordScreen({
    super.key,
    this.selectedLanguage = "EN",
  });

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final TextEditingController emailController = TextEditingController();

  String message = "";
  late String selectedLanguage;

  late Timer timer;
  DateTime now = DateTime.now();

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
    emailController.dispose();
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

  void sendResetLink() {
    final email = emailController.text.trim();

    if (email.isEmpty) {
      setState(() {
        message = text(
          "Please enter your email address",
          "කරුණාකර ඔබගේ email ලිපිනය ඇතුළත් කරන්න",
        );
      });
      return;
    }

    setState(() {
      message = text(
        "Password reset link sent to $email",
        "Password reset link එක $email වෙත යවන ලදී",
      );
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          text(
            "Reset link sent to $email",
            "Reset link එක $email වෙත යවන ලදී",
          ),
        ),
        backgroundColor: const Color(0xFF16A34A),
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
            ForgotPasswordTopBar(
              dateText: dateText,
              timeText: timeText,
              selectedLanguage: selectedLanguage,
              onLanguageChanged: (lang) {
                setState(() {
                  selectedLanguage = lang;
                  message = "";
                });
              },
            ),
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Container(
                    width: 430,
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
                          Icons.lock_reset_rounded,
                          size: 60,
                          color: Color(0xFF0284C7),
                        ),

                        const SizedBox(height: 16),

                        Text(
                          text("Forgot Password", "මුරපදය අමතකද?"),
                          style: const TextStyle(
                            fontSize: 25,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF202124),
                          ),
                        ),

                        const SizedBox(height: 8),

                        Text(
                          text(
                            "Enter your email to reset your password.",
                            "මුරපදය reset කිරීමට ඔබගේ email එක ඇතුළත් කරන්න.",
                          ),
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFF6B7280),
                          ),
                          textAlign: TextAlign.center,
                        ),

                        const SizedBox(height: 24),

                        TextField(
                          controller: emailController,
                          decoration: InputDecoration(
                            hintText: text(
                              "Enter email address",
                              "Email ලිපිනය ඇතුළත් කරන්න",
                            ),
                            prefixIcon: const Icon(Icons.email_outlined),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(
                                color: Color(0xFFE5E7EB),
                              ),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                              borderSide: const BorderSide(
                                color: Color(0xFF0284C7),
                                width: 1.3,
                              ),
                            ),
                          ),
                        ),

                        if (message.isNotEmpty) ...[
                          const SizedBox(height: 12),
                          Text(
                            message,
                            style: TextStyle(
                              color: message.contains("Please") ||
                                      message.contains("කරුණාකර")
                                  ? const Color(0xFFDC2626)
                                  : const Color(0xFF16A34A),
                              fontWeight: FontWeight.w700,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],

                        const SizedBox(height: 22),

                        SizedBox(
                          width: double.infinity,
                          height: 46,
                          child: ElevatedButton(
                            onPressed: sendResetLink,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0284C7),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(10),
                              ),
                            ),
                            child: Text(
                              text("Send Reset Link", "Reset Link යවන්න"),
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 8),

                        TextButton(
                          onPressed: () => Navigator.pop(context),
                          child: Text(
                            text("Back to Login", "Login වෙත ආපසු"),
                          ),
                        ),
                      ],
                    ),
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

class ForgotPasswordTopBar extends StatelessWidget {
  final String dateText;
  final String timeText;
  final String selectedLanguage;
  final Function(String) onLanguageChanged;

  const ForgotPasswordTopBar({
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
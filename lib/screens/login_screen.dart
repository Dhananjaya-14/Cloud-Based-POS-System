import 'dart:async';
import 'package:flutter/material.dart';
import 'dashboard_screen.dart';
import 'forgot_password_screen.dart';
import 'signup_screen.dart';

class LoginScreen extends StatefulWidget {
  final String selectedLanguage;

  const LoginScreen({
    super.key,
    this.selectedLanguage = "EN",
  });

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController usernameController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();

  bool hidePassword = true;
  bool rememberMe = false;
  String errorMessage = "";
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
    usernameController.dispose();
    passwordController.dispose();
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

  void handleLogin() {
    final username = usernameController.text.trim();
    final password = passwordController.text.trim();

    if (username.isEmpty || password.isEmpty) {
      setState(() {
        errorMessage = text(
          "Please enter username and password",
          "කරුණාකර username සහ password ඇතුළත් කරන්න",
        );
      });
      return;
    }

    if ((username == "admin" || username == "admin@gmail.com") &&
        password == "1234") {
      setState(() {
        errorMessage = "";
      });

      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => DashboardScreen(
            selectedLanguage: selectedLanguage,
          ),
        ),
      );
    } else {
      setState(() {
        errorMessage = text(
          "Invalid username/email or password",
          "Username/email හෝ password වැරදියි",
        );
      });
    }
  }

  void openForgotPassword() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ForgotPasswordScreen(
          selectedLanguage: selectedLanguage,
        ),
      ),
    );
  }

  void openSignUp() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => SignUpScreen(
          selectedLanguage: selectedLanguage,
        ),
      ),
    );
  }

  void socialLogin(String provider) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text("$provider ${text("login clicked", "login click කළා")}"),
        backgroundColor: const Color(0xFF0284C7),
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
            LoginTopBar(
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
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 18,
                  ),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 900),
                    child: Container(
                      height: 650,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(15),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.08),
                            blurRadius: 24,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          Expanded(
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.fromLTRB(
                                42,
                                42,
                                42,
                                34,
                              ),
                              child: buildLoginForm(),
                            ),
                          ),
                          Expanded(
                            child: WelcomePanel(
                              selectedLanguage: selectedLanguage,
                            ),
                          ),
                        ],
                      ),
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

  Widget buildLoginForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 39,
          padding: const EdgeInsets.symmetric(horizontal: 18),
          decoration: BoxDecoration(
            color: const Color(0xFF0284C7),
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 4,
                backgroundColor: Color(0xFF22C55E),
              ),
              SizedBox(width: 9),
              Text(
                "Hotel POS",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 24),

        Text(
          text("Login", "පිවිසෙන්න"),
          style: const TextStyle(
            color: Color(0xFF202124),
            fontSize: 27,
            fontWeight: FontWeight.w900,
          ),
        ),

        const SizedBox(height: 10),

        Text(
          text(
            "Welcome back! Please login to your account.",
            "ආයුබෝවන්! කරුණාකර ඔබගේ ගිණුමට පිවිසෙන්න.",
          ),
          style: const TextStyle(
            color: Color(0xFF6B7280),
            fontSize: 13,
            fontWeight: FontWeight.w500,
          ),
        ),

        const SizedBox(height: 28),

        Text(
          text("Username or Email", "Username හෝ Email"),
          style: const TextStyle(
            color: Color(0xFF202124),
            fontSize: 12,
            fontWeight: FontWeight.w800,
          ),
        ),

        const SizedBox(height: 8),

        TextField(
          controller: usernameController,
          decoration: InputDecoration(
            hintText: text(
              "Enter your username or email",
              "Username හෝ email ඇතුළත් කරන්න",
            ),
            hintStyle: const TextStyle(
              color: Color(0xFF9CA3AF),
              fontSize: 13,
            ),
            prefixIcon: const Icon(
              Icons.mail_outline_rounded,
              color: Color(0xFF9CA3AF),
              size: 21,
            ),
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 16,
            ),
            border: inputBorder(),
            enabledBorder: inputBorder(),
            focusedBorder: inputBorder(
              color: const Color(0xFF0284C7),
            ),
          ),
        ),

        const SizedBox(height: 18),

        Text(
          text("Password", "මුරපදය"),
          style: const TextStyle(
            color: Color(0xFF202124),
            fontSize: 12,
            fontWeight: FontWeight.w800,
          ),
        ),

        const SizedBox(height: 8),

        TextField(
          controller: passwordController,
          obscureText: hidePassword,
          decoration: InputDecoration(
            hintText: text(
              "Enter your password",
              "මුරපදය ඇතුළත් කරන්න",
            ),
            hintStyle: const TextStyle(
              color: Color(0xFF9CA3AF),
              fontSize: 13,
            ),
            prefixIcon: const Icon(
              Icons.lock_outline_rounded,
              color: Color(0xFF9CA3AF),
              size: 21,
            ),
            suffixIcon: IconButton(
              onPressed: () {
                setState(() {
                  hidePassword = !hidePassword;
                });
              },
              icon: Icon(
                hidePassword
                    ? Icons.visibility_off_outlined
                    : Icons.visibility_outlined,
                color: const Color(0xFF9CA3AF),
                size: 19,
              ),
            ),
            filled: true,
            fillColor: Colors.white,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 14,
              vertical: 16,
            ),
            border: inputBorder(),
            enabledBorder: inputBorder(),
            focusedBorder: inputBorder(
              color: const Color(0xFF0284C7),
            ),
          ),
        ),

        const SizedBox(height: 14),

        Row(
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: Checkbox(
                value: rememberMe,
                onChanged: (value) {
                  setState(() {
                    rememberMe = value ?? false;
                  });
                },
                activeColor: const Color(0xFF0284C7),
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ),
            const SizedBox(width: 9),
            Text(
              text("Remember Me", "මතක තබාගන්න"),
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF6B7280),
                fontWeight: FontWeight.w500,
              ),
            ),
            const Spacer(),
            GestureDetector(
              onTap: openForgotPassword,
              child: Text(
                text("Forgot Password?", "මුරපදය අමතකද?"),
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF0369A1),
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),

        if (errorMessage.isNotEmpty) ...[
          const SizedBox(height: 9),
          Text(
            errorMessage,
            style: const TextStyle(
              color: Color(0xFFDC2626),
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
          ),
        ],

        const SizedBox(height: 22),

        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: handleLogin,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
              elevation: 8,
              shadowColor: const Color(0xFF0284C7).withOpacity(0.35),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: Text(
              text("Login", "පිවිසෙන්න"),
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ),

        const SizedBox(height: 24),

        Row(
          children: [
            Expanded(
              child: Divider(
                color: Colors.grey.shade300,
                thickness: 1,
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 11),
              child: Text(
                text("New Here?", "අලුත්ද?"),
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF9CA3AF),
                ),
              ),
            ),
            GestureDetector(
              onTap: openSignUp,
              child: Text(
                text("Sign Up", "ලියාපදිංචි වන්න"),
                style: const TextStyle(
                  fontSize: 12,
                  color: Color(0xFF0369A1),
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            Expanded(
              child: Divider(
                color: Colors.grey.shade300,
                thickness: 1,
              ),
            ),
          ],
        ),

        const SizedBox(height: 17),

        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SocialButton(
              icon: Icons.mail_outline_rounded,
              color: const Color(0xFFEF4444),
              onTap: () => socialLogin("Email"),
            ),
            const SizedBox(width: 14),
            SocialButton(
              icon: Icons.facebook_rounded,
              color: const Color(0xFF2563EB),
              onTap: () => socialLogin("Facebook"),
            ),
            const SizedBox(width: 14),
            SocialButton(
              icon: Icons.chat_bubble_outline_rounded,
              color: const Color(0xFF22C55E),
              onTap: () => socialLogin("Message"),
            ),
          ],
        ),
      ],
    );
  }

  OutlineInputBorder inputBorder({
    Color color = const Color(0xFFE5E7EB),
  }) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(8),
      borderSide: BorderSide(
        color: color,
        width: 1.1,
      ),
    );
  }
}

class LoginTopBar extends StatelessWidget {
  final String dateText;
  final String timeText;
  final String selectedLanguage;
  final Function(String) onLanguageChanged;

  const LoginTopBar({
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
            style: TextStyle(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w700,
            ),
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

class WelcomePanel extends StatelessWidget {
  final String selectedLanguage;

  const WelcomePanel({
    super.key,
    required this.selectedLanguage,
  });

  String text(String en, String sin) {
    return selectedLanguage == "EN" ? en : sin;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        borderRadius: BorderRadius.only(
          topRight: Radius.circular(15),
          bottomRight: Radius.circular(15),
        ),
        gradient: LinearGradient(
          colors: [
            Color(0xFF00A9D6),
            Color(0xFF075EA8),
            Color(0xFF39B54A),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            text("Welcome Back.", "නැවත සාදරයෙන් පිළිගනිමු."),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 32,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: 18),
          Text(
            text(
              "To the Management System,",
              "කළමනාකරණ පද්ධතියට,",
            ),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            text("Please log in.", "කරුණාකර පිවිසෙන්න."),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 16,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 31),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              FeatureChip(text: "🔒 Secure Login"),
              SizedBox(width: 12),
              FeatureChip(text: "⚡ Fast Access"),
              SizedBox(width: 12),
              FeatureChip(text: "🎯 Easy to Use"),
            ],
          ),
        ],
      ),
    );
  }
}

class FeatureChip extends StatelessWidget {
  final String text;

  const FeatureChip({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 27,
      padding: const EdgeInsets.symmetric(horizontal: 13),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.17),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(
          color: Colors.white.withOpacity(0.20),
        ),
      ),
      child: Center(
        child: Text(
          text,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 10,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class SocialButton extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const SocialButton({
    super.key,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(9),
      child: Container(
        width: 37,
        height: 37,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(9),
          border: Border.all(
            color: const Color(0xFFE5E7EB),
          ),
        ),
        child: Icon(
          icon,
          size: 18,
          color: color,
        ),
      ),
    );
  }
}
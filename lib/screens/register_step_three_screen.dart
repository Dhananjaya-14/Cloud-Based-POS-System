import 'dart:async';
import 'package:flutter/material.dart';
import 'login_screen.dart';

class RegisterStepThreeScreen extends StatefulWidget {
  final String businessName;
  final String businessType;
  final String email;
  final String role;
  final String fullName;
  final String address;
  final String contactNumber;
  final String selectedLanguage;

  const RegisterStepThreeScreen({
    super.key,
    required this.businessName,
    required this.businessType,
    required this.email,
    required this.role,
    required this.fullName,
    required this.address,
    required this.contactNumber,
    this.selectedLanguage = "EN",
  });

  @override
  State<RegisterStepThreeScreen> createState() =>
      _RegisterStepThreeScreenState();
}

class _RegisterStepThreeScreenState extends State<RegisterStepThreeScreen> {
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController =
      TextEditingController();

  bool hidePassword = true;
  bool hideConfirmPassword = true;
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
    passwordController.dispose();
    confirmPasswordController.dispose();
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

  void handleRegister() {
    final password = passwordController.text.trim();
    final confirmPassword = confirmPasswordController.text.trim();

    if (password.isEmpty || confirmPassword.isEmpty) {
      setState(() {
        errorMessage = text(
          "Please enter password and confirm password",
          "කරුණාකර password සහ confirm password ඇතුළත් කරන්න",
        );
      });
      return;
    }

    if (password.length < 4) {
      setState(() {
        errorMessage = text(
          "Password must be at least 4 characters",
          "Password එක අවම වශයෙන් characters 4ක් විය යුතුයි",
        );
      });
      return;
    }

    if (password != confirmPassword) {
      setState(() {
        errorMessage = text(
          "Passwords do not match",
          "Passwords දෙක ගැලපෙන්නේ නැහැ",
        );
      });
      return;
    }

    setState(() {
      errorMessage = "";
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          text(
            "Account registered successfully",
            "ගිණුම සාර්ථකව ලියාපදිංචි විය",
          ),
        ),
        backgroundColor: const Color(0xFF16A34A),
      ),
    );

    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(
        builder: (context) => LoginScreen(
          selectedLanguage: selectedLanguage,
        ),
      ),
      (route) => false,
    );
  }

  OutlineInputBorder inputBorder({
    Color color = const Color(0xFFE5E7EB),
  }) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(5),
      borderSide: BorderSide(
        color: color,
        width: 1.1,
      ),
    );
  }

  Widget buildPasswordField({
    required String label,
    required TextEditingController controller,
    required bool hidden,
    required VoidCallback onToggle,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF202124),
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 40,
          child: TextField(
            controller: controller,
            obscureText: hidden,
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
              ),
              suffixIcon: IconButton(
                onPressed: onToggle,
                icon: Icon(
                  hidden
                      ? Icons.visibility_off_outlined
                      : Icons.visibility_outlined,
                  size: 18,
                  color: const Color(0xFF9CA3AF),
                ),
              ),
              border: inputBorder(),
              enabledBorder: inputBorder(),
              focusedBorder: inputBorder(
                color: const Color(0xFF0284C7),
              ),
            ),
          ),
        ),
      ],
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
            RegisterTopBar(
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
                  padding: const EdgeInsets.all(20),
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
                            child: RegisterSidePanel(
                              selectedLanguage: selectedLanguage,
                            ),
                          ),
                          Expanded(
                            child: SingleChildScrollView(
                              padding: const EdgeInsets.fromLTRB(
                                42,
                                38,
                                42,
                                34,
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const HotelBadge(),

                                  const SizedBox(height: 22),

                                  Text(
                                    text(
                                      "Create Your Account",
                                      "ඔබගේ ගිණුම සාදන්න",
                                    ),
                                    style: const TextStyle(
                                      color: Color(0xFF202124),
                                      fontSize: 27,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),

                                  const SizedBox(height: 8),

                                  Text(
                                    text(
                                      "All fields are required to create your account",
                                      "ගිණුම සෑදීමට සියලුම fields අවශ්‍ය වේ",
                                    ),
                                    style: const TextStyle(
                                      color: Color(0xFF6B7280),
                                      fontSize: 12,
                                    ),
                                  ),

                                  const SizedBox(height: 34),

                                  const StepIndicator(currentStep: 3),

                                  const SizedBox(height: 34),

                                  buildPasswordField(
                                    label: text("Password", "මුරපදය"),
                                    controller: passwordController,
                                    hidden: hidePassword,
                                    onToggle: () {
                                      setState(() {
                                        hidePassword = !hidePassword;
                                      });
                                    },
                                  ),

                                  const SizedBox(height: 22),

                                  buildPasswordField(
                                    label: text(
                                      "Confirm Password",
                                      "මුරපදය නැවත ඇතුළත් කරන්න",
                                    ),
                                    controller: confirmPasswordController,
                                    hidden: hideConfirmPassword,
                                    onToggle: () {
                                      setState(() {
                                        hideConfirmPassword =
                                            !hideConfirmPassword;
                                      });
                                    },
                                  ),

                                  if (errorMessage.isNotEmpty) ...[
                                    const SizedBox(height: 12),
                                    Text(
                                      errorMessage,
                                      style: const TextStyle(
                                        color: Color(0xFFDC2626),
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ],

                                  const SizedBox(height: 38),

                                  Row(
                                    children: [
                                      TextButton(
                                        onPressed: () {
                                          Navigator.pop(context);
                                        },
                                        child: Text(text("‹ Back", "‹ ආපසු")),
                                      ),
                                      const Spacer(),
                                      SizedBox(
                                        width: 160,
                                        height: 44,
                                        child: ElevatedButton(
                                          onPressed: handleRegister,
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor:
                                                const Color(0xFF0067B1),
                                            foregroundColor: Colors.white,
                                            elevation: 0,
                                            shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(6),
                                            ),
                                          ),
                                          child: Text(
                                            text("Register", "ලියාපදිංචි වන්න"),
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
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
}

class RegisterTopBar extends StatelessWidget {
  final String dateText;
  final String timeText;
  final String selectedLanguage;
  final Function(String) onLanguageChanged;

  const RegisterTopBar({
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

class HotelBadge extends StatelessWidget {
  const HotelBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 32,
      padding: const EdgeInsets.symmetric(horizontal: 15),
      decoration: BoxDecoration(
        color: const Color(0xFF0284C7),
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Center(
        widthFactor: 1,
        child: Text(
          "Hotel POS",
          style: TextStyle(
            color: Colors.white,
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class RegisterSidePanel extends StatelessWidget {
  final String selectedLanguage;

  const RegisterSidePanel({
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
          topLeft: Radius.circular(15),
          bottomLeft: Radius.circular(15),
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
            text("Welcome", "සාදරයෙන් පිළිගනිමු"),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 31,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 16),
          Text(
            text(
              "Enter your details to get started.",
              "ආරම්භ කිරීමට ඔබගේ විස්තර ඇතුළත් කරන්න.",
            ),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 14,
            ),
          ),
          const SizedBox(height: 34),
          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              SmallChip(text: "🔒 Secure Login"),
              SizedBox(width: 10),
              SmallChip(text: "⚡ Fast Access"),
              SizedBox(width: 10),
              SmallChip(text: "🎯 Easy to Use"),
            ],
          ),
        ],
      ),
    );
  }
}

class SmallChip extends StatelessWidget {
  final String text;

  const SmallChip({
    super.key,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 26,
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
            fontSize: 9,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class StepIndicator extends StatelessWidget {
  final int currentStep;

  const StepIndicator({
    super.key,
    required this.currentStep,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            buildCircle("✓", currentStep >= 1),
            buildLine(),
            buildCircle("✓", currentStep >= 2),
            buildLine(),
            buildCircle("3", currentStep >= 3),
          ],
        ),
        const SizedBox(height: 8),
        const Row(
          children: [
            Expanded(
              child: Text(
                "Profile",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 10,
                  color: Color(0xFF6B7280),
                ),
              ),
            ),
            Expanded(
              child: Text(
                "Account",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 10,
                  color: Color(0xFF6B7280),
                ),
              ),
            ),
            Expanded(
              child: Text(
                "Verification",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 10,
                  color: Color(0xFF6B7280),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget buildCircle(String text, bool active) {
    return Container(
      width: 45,
      height: 45,
      decoration: BoxDecoration(
        color: active ? const Color(0xFF0067B1) : const Color(0xFF8E8E8E),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          text,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }

  Widget buildLine() {
    return Expanded(
      child: Container(
        height: 1.3,
        color: const Color(0xFFD1D5DB),
      ),
    );
  }
}
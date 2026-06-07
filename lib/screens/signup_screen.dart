import 'dart:async';
import 'package:flutter/material.dart';
import 'register_step_two_screen.dart';

class SignUpScreen extends StatefulWidget {
  final String selectedLanguage;

  const SignUpScreen({
    super.key,
    this.selectedLanguage = "EN",
  });

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final TextEditingController businessNameController = TextEditingController();
  final TextEditingController emailController = TextEditingController();

  String selectedBusinessType = "Hotel";
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
    businessNameController.dispose();
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

  void handleContinue() {
    final businessName = businessNameController.text.trim();
    final email = emailController.text.trim();

    if (businessName.isEmpty || email.isEmpty) {
      setState(() {
        errorMessage = text(
          "Please fill business name and email",
          "කරුණාකර ව්‍යාපාර නාමය සහ email ඇතුළත් කරන්න",
        );
      });
      return;
    }

    if (!email.contains("@")) {
      setState(() {
        errorMessage = text(
          "Please enter a valid email address",
          "කරුණාකර වලංගු email ලිපිනයක් ඇතුළත් කරන්න",
        );
      });
      return;
    }

    setState(() {
      errorMessage = "";
    });

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => RegisterStepTwoScreen(
          businessName: businessName,
          businessType: selectedBusinessType,
          email: email,
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
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 18,
                  ),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 900),
                    child: Container(
                      height: 600,
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
                            child: RegisterWelcomePanel(
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
                              child: buildRegisterForm(),
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

  Widget buildRegisterForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          height: 32,
          padding: const EdgeInsets.symmetric(horizontal: 15),
          decoration: BoxDecoration(
            color: const Color(0xFF0284C7),
            borderRadius: BorderRadius.circular(6),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                "Hotel POS",
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 22),

        Text(
          text("Create Your Account", "ඔබගේ ගිණුම සාදන්න"),
          style: const TextStyle(
            color: Color(0xFF202124),
            fontSize: 27,
            fontWeight: FontWeight.w900,
          ),
        ),

        const SizedBox(height: 8),

        Text(
          text(
            "Join thousands of users who trust our platform",
            "අපගේ platform එක භාවිතා කරන පරිශීලකයින් සමඟ එකතු වන්න",
          ),
          style: const TextStyle(
            color: Color(0xFF6B7280),
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),

        const SizedBox(height: 36),

        const RegisterStepper(),

        const SizedBox(height: 30),

        Row(
          children: [
            Expanded(
              child: buildTextField(
                label: text("Business Name", "ව්‍යාපාර නාමය"),
                controller: businessNameController,
                hintText: "",
              ),
            ),
            const SizedBox(width: 22),
            Expanded(
              child: buildDropdownField(),
            ),
          ],
        ),

        const SizedBox(height: 22),

        buildTextField(
          label: text("Email", "ඊමේල්"),
          controller: emailController,
          hintText: "",
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

        const SizedBox(height: 70),

        SizedBox(
          width: double.infinity,
          height: 46,
          child: ElevatedButton(
            onPressed: handleContinue,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF4A90D0),
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(6),
              ),
            ),
            child: Text(
              text("Continue", "ඉදිරියට"),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget buildTextField({
    required String label,
    required TextEditingController controller,
    required String hintText,
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
            decoration: InputDecoration(
              hintText: hintText,
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 10,
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

  Widget buildDropdownField() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          text("Business Type", "ව්‍යාපාර වර්ගය"),
          style: const TextStyle(
            color: Color(0xFF202124),
            fontSize: 12,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 40,
          child: DropdownButtonFormField<String>(
            value: selectedBusinessType,
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 8,
              ),
              border: inputBorder(),
              enabledBorder: inputBorder(),
              focusedBorder: inputBorder(
                color: const Color(0xFF0284C7),
              ),
            ),
            items: const [
              DropdownMenuItem(
                value: "Hotel",
                child: Text("Hotel"),
              ),
              DropdownMenuItem(
                value: "Restaurant",
                child: Text("Restaurant"),
              ),
              DropdownMenuItem(
                value: "Bar",
                child: Text("Bar"),
              ),
              DropdownMenuItem(
                value: "Cafe",
                child: Text("Cafe"),
              ),
            ],
            onChanged: (value) {
              setState(() {
                selectedBusinessType = value ?? "Hotel";
              });
            },
          ),
        ),
      ],
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

class RegisterWelcomePanel extends StatelessWidget {
  final String selectedLanguage;

  const RegisterWelcomePanel({
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
        children: [
          const Spacer(),

          Text(
            text("Welcome", "සාදරයෙන් පිළිගනිමු"),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 31,
              fontWeight: FontWeight.w900,
              letterSpacing: 1,
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
              fontWeight: FontWeight.w500,
            ),
          ),

          const SizedBox(height: 34),

          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              RegisterChip(text: "🔒 Secure Login"),
              SizedBox(width: 10),
              RegisterChip(text: "⚡ Fast Access"),
              SizedBox(width: 10),
              RegisterChip(text: "🎯 Easy to Use"),
            ],
          ),

          const Spacer(),

          GestureDetector(
            onTap: () {
              Navigator.pop(context);
            },
            child: Text.rich(
              TextSpan(
                text: text(
                  "Already have an Account?  ",
                  "දැනටමත් ගිණුමක් තියෙනවාද?  ",
                ),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
                children: [
                  TextSpan(
                    text: text("Sign In", "පිවිසෙන්න"),
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 26),

          const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              RegisterSocialButton(
                icon: Icons.mail_outline_rounded,
                color: Color(0xFFEF4444),
              ),
              SizedBox(width: 14),
              RegisterSocialButton(
                icon: Icons.facebook_rounded,
                color: Color(0xFF2563EB),
              ),
              SizedBox(width: 14),
              RegisterSocialButton(
                icon: Icons.chat_bubble_outline_rounded,
                color: Color(0xFF22C55E),
              ),
            ],
          ),

          const SizedBox(height: 34),
        ],
      ),
    );
  }
}

class RegisterChip extends StatelessWidget {
  final String text;

  const RegisterChip({
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

class RegisterSocialButton extends StatelessWidget {
  final IconData icon;
  final Color color;

  const RegisterSocialButton({
    super.key,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 37,
      height: 37,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(9),
      ),
      child: Icon(
        icon,
        size: 18,
        color: color,
      ),
    );
  }
}

class RegisterStepper extends StatelessWidget {
  const RegisterStepper({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            buildCircle(
              number: "1",
              active: true,
            ),
            buildLine(),
            buildCircle(
              number: "2",
              active: false,
            ),
            buildLine(),
            buildCircle(
              number: "3",
              active: false,
            ),
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

  Widget buildCircle({
    required String number,
    required bool active,
  }) {
    return Container(
      width: 45,
      height: 45,
      decoration: BoxDecoration(
        color: active ? const Color(0xFF0067B1) : const Color(0xFF8E8E8E),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          number,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 19,
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
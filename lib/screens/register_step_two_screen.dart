import 'package:flutter/material.dart';
import 'register_step_three_screen.dart';

class RegisterStepTwoScreen extends StatefulWidget {
  final String businessName;
  final String businessType;
  final String email;

  const RegisterStepTwoScreen({
    super.key,
    required this.businessName,
    required this.businessType,
    required this.email,
  });

  @override
  State<RegisterStepTwoScreen> createState() => _RegisterStepTwoScreenState();
}

class _RegisterStepTwoScreenState extends State<RegisterStepTwoScreen> {
  final TextEditingController roleController = TextEditingController();
  final TextEditingController fullNameController = TextEditingController();
  final TextEditingController addressController = TextEditingController();
  final TextEditingController contactController = TextEditingController();

  String errorMessage = "";

  void handleContinue() {
    final role = roleController.text.trim();
    final fullName = fullNameController.text.trim();
    final address = addressController.text.trim();
    final contact = contactController.text.trim();

    if (role.isEmpty || fullName.isEmpty || address.isEmpty || contact.isEmpty) {
      setState(() {
        errorMessage = "Please fill all fields";
      });
      return;
    }

    setState(() {
      errorMessage = "";
    });

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => RegisterStepThreeScreen(
          businessName: widget.businessName,
          businessType: widget.businessType,
          email: widget.email,
          role: role,
          fullName: fullName,
          address: address,
          contactNumber: contact,
        ),
      ),
    );
  }

  @override
  void dispose() {
    roleController.dispose();
    fullNameController.dispose();
    addressController.dispose();
    contactController.dispose();
    super.dispose();
  }

  OutlineInputBorder inputBorder({
    Color color = const Color(0xFFE5E7EB),
  }) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(5),
      borderSide: BorderSide(color: color, width: 1.1),
    );
  }

  Widget buildField(
    String label,
    TextEditingController controller, {
    TextInputType keyboardType = TextInputType.text,
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
            keyboardType: keyboardType,
            decoration: InputDecoration(
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12),
              border: inputBorder(),
              enabledBorder: inputBorder(),
              focusedBorder: inputBorder(color: const Color(0xFF0284C7)),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEFF6FB),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 900),
              child: Container(
                height: 700,
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
                    const Expanded(
                      child: RegisterSidePanel(),
                    ),
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.fromLTRB(42, 38, 42, 34),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const HotelBadge(),

                            const SizedBox(height: 22),

                            const Text(
                              "Create Your Account",
                              style: TextStyle(
                                color: Color(0xFF202124),
                                fontSize: 27,
                                fontWeight: FontWeight.w900,
                              ),
                            ),

                            const SizedBox(height: 8),

                            const Text(
                              "All fields are required to create your account",
                              style: TextStyle(
                                color: Color(0xFF6B7280),
                                fontSize: 12,
                              ),
                            ),

                            const SizedBox(height: 34),

                            const StepIndicator(currentStep: 2),

                            const SizedBox(height: 30),

                            Row(
                              children: [
                                Expanded(
                                  child: buildField(
                                    "Role",
                                    roleController,
                                  ),
                                ),
                                const SizedBox(width: 22),
                                Expanded(
                                  child: buildField(
                                    "Full Name",
                                    fullNameController,
                                  ),
                                ),
                              ],
                            ),

                            const SizedBox(height: 22),

                            buildField(
                              "Address",
                              addressController,
                            ),

                            const SizedBox(height: 22),

                            buildField(
                              "Contact Number",
                              contactController,
                              keyboardType: TextInputType.phone,
                            ),

                            if (errorMessage.isNotEmpty) ...[
                              const SizedBox(height: 12),
                              Text(
                                errorMessage,
                                style: const TextStyle(
                                  color: Color(0xFFDC2626),
                                  fontWeight: FontWeight.w700,
                                  fontSize: 12,
                                ),
                              ),
                            ],

                            const SizedBox(height: 38),

                            Row(
                              children: [
                                TextButton(
                                  onPressed: () => Navigator.pop(context),
                                  child: const Text("‹ Back"),
                                ),
                                const Spacer(),
                                SizedBox(
                                  width: 160,
                                  height: 44,
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
                                    child: const Text(
                                      "Continue",
                                      style: TextStyle(
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
    );
  }
}

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
  const RegisterSidePanel({super.key});

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
      child: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            "Welcome",
            style: TextStyle(
              color: Colors.white,
              fontSize: 31,
              fontWeight: FontWeight.w900,
            ),
          ),
          SizedBox(height: 16),
          Text(
            "Enter your details to get started.",
            style: TextStyle(
              color: Colors.white,
              fontSize: 14,
            ),
          ),
          SizedBox(height: 34),
          Row(
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
        border: Border.all(color: Colors.white.withOpacity(0.20)),
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
            buildCircle("2", currentStep >= 2),
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
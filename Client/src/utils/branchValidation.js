/**
 * Validates a branch contact number.
 * Returns a user-friendly error message if invalid, or an empty string if valid.
 *
 * Rules:
 * - Must not be empty.
 * - Allowed characters: digits, spaces, '+', '-', '(', ')', '.'.
 * - If mobile/contact number starts with '+94': exactly 11 digits must be included (94 + 9 digits).
 * - If mobile/contact number starts with '0': exactly 10 digits must be included (0 + 9 digits).
 * - Any other prefix is rejected.
 *
 * @param {string} contact - The branch contact number to validate
 * @returns {string} Error message if invalid, or "" if valid
 */
export const validateBranchContact = (contact) => {
  if (!contact || typeof contact !== "string" || !contact.trim()) {
    return "Contact number is required";
  }

  const trimmed = contact.trim();

  // Check for disallowed characters or misplaced '+'
  if (
    !/^[0-9+\s\-().]+$/.test(trimmed) ||
    (trimmed.includes("+") && !trimmed.startsWith("+")) ||
    (trimmed.match(/\+/g) || []).length > 1
  ) {
    return "Contact number can only contain digits and valid symbols (+, -, ())";
  }

  // Strip formatting symbols to evaluate prefix and digits
  const normalized = trimmed.replace(/[\s\-().]/g, "");
  const digits = trimmed.replace(/\D/g, "");

  if (normalized.startsWith("+94")) {
    if (digits.length !== 11) {
      return "Contact number starting with +94 must contain exactly 11 digits";
    }
    return "";
  }

  if (normalized.startsWith("0")) {
    if (digits.length !== 10) {
      return "Contact number starting with 0 must contain exactly 10 digits";
    }
    return "";
  }

  return "Contact number must start with +94 (11 digits) or 0 (10 digits)";
};

export const isValidBranchContact = (contact) => {
  return validateBranchContact(contact) === "";
};

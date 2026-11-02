/**
 * Validates a supplier contact number.
 * Returns a user-friendly error message if invalid, or an empty string if valid.
 *
 * Requirements:
 * - Must not be empty.
 * - Allowed characters: digits, spaces, '+', '-', '(', ')', '.'.
 * - Must contain between 7 and 15 actual digits (standard telephone digit range).
 * - Overall string length must be between 7 and 25 characters.
 *
 * @param {string} contact - The supplier contact number to validate
 * @returns {string} Error message if invalid, or "" if valid
 */
export const validateSupplierContact = (contact) => {
  if (!contact || typeof contact !== "string" || !contact.trim()) {
    return "Contact number is required";
  }

  const trimmed = contact.trim();

  // Check for disallowed characters (letters or invalid symbols)
  if (!/^[0-9+\s\-().]+$/.test(trimmed)) {
    return "Contact number can only contain digits and symbols (+, -, ())";
  }

  // Count actual numeric digits
  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < 7) {
    return "Contact number must contain at least 7 digits";
  }

  if (digits.length > 15) {
    return "Contact number cannot exceed 15 digits";
  }

  // Check format (+ allowed only at the start, length between 7 and 25)
  if (!/^\+?[0-9\s\-().]{7,25}$/.test(trimmed)) {
    return "Please enter a valid contact number format";
  }

  return "";
};

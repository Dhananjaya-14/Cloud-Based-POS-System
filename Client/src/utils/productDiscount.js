/**
 * Formats a product's discount into a clean display string (e.g. "10%", "$5.00", "0%").
 * Handles various data representations: discount_value, value_type, discount string, pro_discount, discount_percent.
 *
 * @param {Object} product - Product object from API or state
 * @returns {string} Formatted discount string
 */
export const formatProductDiscount = (product) => {
  if (!product) return "0%";

  // If discount is already provided as a non-trivial formatted string (e.g., "15%", "$5.00")
  if (typeof product.discount === "string" && product.discount.trim() !== "" && product.discount.trim() !== "0%") {
    // If it's a numeric string like "10" without symbols
    if (!isNaN(Number(product.discount))) {
      const num = Number(product.discount);
      if (num <= 0) return "0%";
      return product.value_type === "fixed" ? `$${num.toFixed(2)}` : `${num}%`;
    }
    return product.discount.trim();
  }

  // Check possible numeric discount properties
  const rawVal =
    product.discount_value ??
    product.pro_discount ??
    product.discount_percent ??
    (typeof product.discount === "number" ? product.discount : null);

  if (rawVal !== null && rawVal !== undefined) {
    const num = Number(rawVal);
    if (isNaN(num) || num <= 0) return "0%";
    if (product.value_type === "fixed") {
      return `$${num.toFixed(2)}`;
    }
    return `${num}%`;
  }

  return "0%";
};

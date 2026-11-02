/**
 * DashboardButton — Reusable pill-shaped gradient button for the Cashier Dashboard.
 *
 * Usage:
 *   <DashboardButton onClick={() => navigate('/cashier/pos')}>
 *     Open POS System
 *   </DashboardButton>
 *
 *   <DashboardButton variant="outline" onClick={() => navigate('/cashier/sales-summary')}>
 *     View Sales Report
 *   </DashboardButton>
 *
 * Props:
 *   children   – Button label text (any ReactNode)
 *   onClick    – Click handler
 *   variant    – "solid" (default, dark-teal gradient) | "outline" (cyan outline fill)
 *   className  – Extra Tailwind classes (optional)
 *   disabled   – Disabled state (optional)
 *   type       – HTML button type (default "button")
 */

import React from "react";

const variants = {
  // Dark green → dark teal-navy — "Open POS System"
  solid:
    "bg-gradient-to-r from-[#1B6B58] to-[#0A3D6B] text-white shadow-md hover:shadow-lg hover:opacity-90",
  // Medium blue → bright cyan — "View Sales Report"
  outline:
    "bg-gradient-to-r from-[#1A7BC0] to-[#00C8F5] text-white shadow-md hover:shadow-lg hover:opacity-90",
};

const DashboardButton = ({
  children,
  onClick,
  variant = "solid",
  className = "",
  disabled = false,
  type = "button",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        // Base shape & spacing
        "inline-flex items-center justify-center gap-2",
        "px-7 py-3 rounded-full",
        // Typography — Space Grotesk via Tailwind font-space
        "font-space font-semibold text-sm sm:text-base",
        // Transition
        "transition-all duration-200",
        // Disabled state
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        // Variant colours
        variants[variant] ?? variants.solid,
        // Extra overrides from parent
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
};

export default DashboardButton;

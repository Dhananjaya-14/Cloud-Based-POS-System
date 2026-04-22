import express from "express";
const router = express.Router();

import {
  getDiscounts,
  getDiscountById,
  createDiscount,
  updateDiscount,
  patchDiscount,
  deleteDiscount,
  toggleDiscount,
  redeemDiscount,
  applyDiscount,
  validateCoupon,
  getActiveDiscountsToday,
  checkComboDiscount,
  getDiscountStats,
} from "../controllers/discountController.js";

import {
  requireAuth,
  requireBranchAdminOrAdmin,
  requireCashierOrAbove,
  requireWaiterOrAbove,
} from "../middleware/authMiddleware.js";

// ─────────────────────────────────────────────
// POS OPERATIONS (LIVE SYSTEM)
// ─────────────────────────────────────────────

// Active discounts
router.get(
  "/active/today",
  requireAuth,
  requireWaiterOrAbove,
  getActiveDiscountsToday,
);

// Validate coupon
router.get(
  "/validate/:coupon_code",
  requireAuth,
  requireWaiterOrAbove,
  validateCoupon,
);

// Apply discount (calculation only)
router.post("/apply", requireAuth, requireCashierOrAbove, applyDiscount);

// Combo discount check
router.post(
  "/combo/check",
  requireAuth,
  requireCashierOrAbove,
  checkComboDiscount,
);

// Redeem discount (final usage)
router.post("/:id/redeem", requireAuth, requireCashierOrAbove, redeemDiscount);

// ─────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────
router.get(
  "/stats/summary",
  requireAuth,
  requireBranchAdminOrAdmin,
  getDiscountStats,
);

// ─────────────────────────────────────────────
// READ (ALL STAFF)
// ─────────────────────────────────────────────
router.get("/", requireAuth, requireWaiterOrAbove, getDiscounts);
router.get("/:id", requireAuth, requireWaiterOrAbove, getDiscountById);

// ─────────────────────────────────────────────
// MANAGEMENT (ADMIN ONLY)
// ─────────────────────────────────────────────
router.post("/", requireAuth, requireBranchAdminOrAdmin, createDiscount);

router.put("/:id", requireAuth, requireBranchAdminOrAdmin, updateDiscount);

router.patch("/:id", requireAuth, requireBranchAdminOrAdmin, patchDiscount);

router.delete("/:id", requireAuth, requireBranchAdminOrAdmin, deleteDiscount);

router.patch(
  "/:id/toggle",
  requireAuth,
  requireBranchAdminOrAdmin,
  toggleDiscount,
);

export default router;

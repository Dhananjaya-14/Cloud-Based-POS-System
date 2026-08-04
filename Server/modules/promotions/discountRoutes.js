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
} from "./discountController.js";

import {
  requireAuth,
  requireBranchAdminOrAdmin,
  requireCashierOrAbove,
  requireWaiterOrAbove,
  } from "../../middleware/authMiddleware.js"
import { requireModule } from "../../middleware/saasMiddleware.js";
;

// Global middlewares for the promotions module
router.use(requireAuth);
router.use(requireModule("has_promotions"));

// ─────────────────────────────────────────────
// POS OPERATIONS (LIVE SYSTEM)
// ─────────────────────────────────────────────

// Active discounts
router.get(
  "/active/today",
  requireWaiterOrAbove,
  getActiveDiscountsToday,
);

// Validate coupon
router.get(
  "/validate/:coupon_code",
  requireWaiterOrAbove,
  validateCoupon,
);

// Apply discount (calculation only)
router.post("/apply", requireCashierOrAbove, applyDiscount);

// Combo discount check
router.post(
  "/combo/check",
  requireCashierOrAbove,
  checkComboDiscount,
);

// Redeem discount (final usage)
router.post("/:id/redeem", requireCashierOrAbove, redeemDiscount);

// ─────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────
router.get(
  "/stats/summary",
  requireBranchAdminOrAdmin,
  getDiscountStats,
);

// ─────────────────────────────────────────────
// READ (ALL STAFF)
// ─────────────────────────────────────────────
router.get("/", requireWaiterOrAbove, getDiscounts);
router.get("/:id", requireWaiterOrAbove, getDiscountById);

// ─────────────────────────────────────────────
// MANAGEMENT (ADMIN ONLY)
// ─────────────────────────────────────────────
router.post("/", requireBranchAdminOrAdmin, createDiscount);

router.put("/:id", requireBranchAdminOrAdmin, updateDiscount);

router.patch("/:id", requireBranchAdminOrAdmin, patchDiscount);

router.delete("/:id", requireBranchAdminOrAdmin, deleteDiscount);

router.patch(
  "/:id/toggle",
  requireBranchAdminOrAdmin,
  toggleDiscount,
);

export default router;

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

// Static routes first
router.get("/active/today", getActiveDiscountsToday);
router.get("/stats/summary", getDiscountStats);
router.get("/validate/:coupon_code", validateCoupon);
router.post("/apply", applyDiscount);
router.post("/combo/check", checkComboDiscount);

// Collection
router.get("/", getDiscounts);
router.post("/", createDiscount);

// Single resource
router.get("/:id", getDiscountById);
router.put("/:id", updateDiscount);
router.patch("/:id", patchDiscount);
router.delete("/:id", deleteDiscount);
router.patch("/:id/toggle", toggleDiscount);
router.post("/:id/redeem", redeemDiscount);

export default router; 

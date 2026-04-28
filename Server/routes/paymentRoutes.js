// routes/paymentRoutes.js
import express from "express";

// ─── Auth middleware ──────────────────────────────────────────────────────────
import {
  requireAuth,
  requireAdmin,
  requireBranchAdminOrAdmin,
  requireCashierOrAbove,
} from "../middleware/authMiddleware.js";

// ─── Controller functions + validation arrays ─────────────────────────────────
import {
  getPaymentsValidation,
  getPayments,
  getPaymentByIdValidation,
  getPaymentById,
  createPaymentValidation,
  createPayment,
  updatePaymentValidation,
  updatePayment,
  deletePaymentValidation,
  deletePayment,
} from "../controllers/paymentController.js";

const router = express.Router();

// Every payment route requires a valid JWT
router.use(requireAuth);

// ─────────────────────────────────────────────────────────────────────────────
//  Role matrix
//
//  GET    /           Cashier | Branch Admin | Admin   — view payments
//  GET    /:id        Cashier | Branch Admin | Admin   — view single payment
//  POST   /           Cashier | Branch Admin | Admin   — create payment at POS
//  PUT    /:id        Branch Admin | Admin             — correct/update payment
//  DELETE /:id        Admin only                       — hard delete (voided/failed only)
// ─────────────────────────────────────────────────────────────────────────────

router.get("/", requireCashierOrAbove, getPaymentsValidation, getPayments);

router.get(
  "/:id",
  requireCashierOrAbove,
  getPaymentByIdValidation,
  getPaymentById,
);

router.post("/", requireCashierOrAbove, createPaymentValidation, createPayment);

router.put(
  "/:id",
  requireBranchAdminOrAdmin,
  updatePaymentValidation,
  updatePayment,
);

router.delete("/:id", requireAdmin, deletePaymentValidation, deletePayment);

export default router;

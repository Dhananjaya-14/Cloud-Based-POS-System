// routes/payhereRoutes.js
import express from "express";
import {
  initiatePayHerePayment,
  payhereNotify,
  getPayherePage,
  payhereSuccess,
  payhereCancel
} from "../controllers/payhereController.js";
import {
  requireAuth,
  requireCashierOrAbove,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ── POST /api/payhere/initiate ────────────────────────────────────────────────
// Authenticated: cashier calls this to get a PayHere payment URL / QR
router.post("/initiate", requireAuth, requireCashierOrAbove, initiatePayHerePayment);

// ── POST /api/payhere/notify ──────────────────────────────────────────────────
// PUBLIC — PayHere servers call this directly after payment.
// Must NOT have requireAuth; PayHere has no JWT.
router.post("/notify", payhereNotify);

// ── GET /api/payhere/pay/:token ───────────────────────────────────────────────
// PUBLIC — The QR code points here. Generates the auto-submitting POST form.
router.get("/pay/:token", getPayherePage);

// ── GET /api/payhere/success & /cancel ────────────────────────────────────────
// PUBLIC — Phone redirects here after payment completion/cancellation
router.get("/success", payhereSuccess);
router.get("/cancel", payhereCancel);

export default router;


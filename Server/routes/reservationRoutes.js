import express from "express";
import {
  getReservations,
  getReservationById,
  getReservationsByBranch,
  getReservationsByCustomer,
  getReservationsByTable,
  createReservation,
  updateReservation,
  deleteReservation,
} from "../controllers/reservationController.js";
import {
  requireAuth,
  requireCashierOrAbove,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Cashier (3) + Branch Admin (1) + Admin (2)
router.use(requireAuth, requireCashierOrAbove);

// Static routes MUST come before /:id
router.get("/", getReservations);
router.get("/branch/:branchId", getReservationsByBranch);
router.get("/customer/:custId", getReservationsByCustomer);
router.get("/table/:tableId", getReservationsByTable);
router.get("/:id", getReservationById);
router.post("/", createReservation);
router.put("/:id", updateReservation);
router.delete("/:id", deleteReservation);

export default router;

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


const router = express.Router();

router.get("/", getReservations);
router.get("/branch/:branchId", getReservationsByBranch);
router.get("/customer/:custId", getReservationsByCustomer);
router.get("/table/:tableId", getReservationsByTable);
router.get("/:id", getReservationById);
router.post("/", createReservation);
router.put("/:id", updateReservation);
router.delete("/:id", deleteReservation);

export default router;

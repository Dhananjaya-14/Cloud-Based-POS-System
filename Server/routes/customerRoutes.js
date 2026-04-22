import express from "express";
import {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../controllers/customerController.js";
import { requireAuth, requireCashierOrAbove } from "../middleware/authMiddleware.js";

const router = express.Router();

// All roles that can access: Cashier (3), Branch Admin (1), Admin (2)
// requireCashierOrAbove covers all three roles
router.use(requireAuth, requireCashierOrAbove);

router.get("/", getCustomers);
router.get("/:id", getCustomerById);
router.post("/", createCustomer);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);

export default router;

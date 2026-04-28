import express from "express";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplierController.js";
import {
  requireAuth,
  requireBranchAdminOrAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply auth + role to ALL routes at once
router.use(requireAuth, requireBranchAdminOrAdmin);

router.get("/",       getSuppliers);
router.get("/:id",    getSupplierById);
router.post("/",      createSupplier);
router.put("/:id",    updateSupplier);
router.delete("/:id", deleteSupplier);

export default router;

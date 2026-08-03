import express from "express";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  restoreSupplier,
  assignSupplierToBranch,
  removeSupplierFromBranch,
  getSupplierBranches,
} from "../controllers/supplierController.js";
import {
  requireAuth,
  requireBranchAdminOrAdmin,
  requireAdmin
} from "../../../middleware/authMiddleware.js"
import { requireModule } from "../../../middleware/saasMiddleware.js";
;

const router = express.Router();

// All routes require authentication + Suppliers module enabled in package
router.use(requireAuth);
router.use(requireModule("has_inventory"));

// ── Collection routes ──────────────────────────────────────────────────────
router.get("/",   requireBranchAdminOrAdmin, getSuppliers);
router.post("/",  requireAdmin,              createSupplier);

// ── Sub-resource routes  (must be BEFORE /:id to avoid param collision) ────
router.get(   "/:id/branches",          requireAdmin, getSupplierBranches);
router.post(  "/:id/branches",          requireAdmin, assignSupplierToBranch);
router.delete("/:id/branches/:b_id",    requireAdmin, removeSupplierFromBranch);
router.patch( "/:id/restore",           requireAdmin, restoreSupplier);

// ── Single-resource routes ─────────────────────────────────────────────────
router.get(   "/:id", requireBranchAdminOrAdmin, getSupplierById);
router.put(   "/:id", requireAdmin,              updateSupplier);
router.delete("/:id", requireAdmin,              deleteSupplier);

export default router;

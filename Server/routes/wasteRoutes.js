import express from "express";
import {
  requireAuth,
  requireBranchAdminOrAdmin,
  requireAdmin,
} from "../middleware/authMiddleware.js";
import {
  createWaste,
  getAllWaste,
  getWasteById,
  updateWaste,
  deleteWaste,
  getWastePercentage,
} from "../controllers/wasteController.js";

const router = express.Router();

router.use(requireAuth);

// ── Static routes first ───────────────────────
// Dashboard summary — Admin and Branch Admin can view
router.get("/percentage", requireBranchAdminOrAdmin, getWastePercentage);

// ── Standard CRUD ─────────────────────────────
// Branch Admin and above can view and record waste (it happens at branch level)
router.get("/", requireBranchAdminOrAdmin, getAllWaste);
router.get("/:id", requireBranchAdminOrAdmin, getWasteById);
router.post("/", requireBranchAdminOrAdmin, createWaste);

// Branch Admin and Admin can edit or delete waste records
router.put("/:id", requireBranchAdminOrAdmin, updateWaste);
router.delete("/:id", requireBranchAdminOrAdmin, deleteWaste);

export default router;

import express from "express";
import {
  getActivityLogs,
  getActivityLogById,
  getActivityLogSummary,
  deleteActivityLog,
  purgeActivityLogs,
} from "../controllers/activityLogController.js";
import {
  requireAuth,
  requireSuperAdmin,
  requireBranchAdminOrAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

// ── Read routes (Branch Admin, Admin, Super Admin) ─────────────────────
router.get("/",        requireBranchAdminOrAdmin, getActivityLogs);
router.get("/summary", requireBranchAdminOrAdmin, getActivityLogSummary);
router.get("/:id",     requireBranchAdminOrAdmin, getActivityLogById);

// ── Write/Delete routes (Super Admin only) ─────────────────────────────
router.delete("/purge", requireSuperAdmin, purgeActivityLogs);
router.delete("/:id",   requireSuperAdmin, deleteActivityLog);

export default router;

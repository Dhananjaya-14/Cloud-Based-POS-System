import express from "express";
import {
  getTables,
  getTableById,
  getTablesByBranch,
  createTable,
  updateTable,
  updateTableStatus,
  deleteTable,
} from "../controllers/tableController.js";
import { requireAuth, requireBranchAdminOrAdmin, requireWaiterOrAbove } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", requireWaiterOrAbove, getTables);
router.get("/branch/:branchId", requireWaiterOrAbove, getTablesByBranch); 
router.get("/:id", requireWaiterOrAbove, getTableById);
router.post("/", requireBranchAdminOrAdmin, createTable);
router.put("/:id", requireBranchAdminOrAdmin, updateTable);
router.patch("/:id/status", requireBranchAdminOrAdmin, updateTableStatus);
router.delete("/:id", requireBranchAdminOrAdmin, deleteTable);

export default router;

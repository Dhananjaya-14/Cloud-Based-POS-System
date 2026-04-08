import express from "express";
import {
  getTableAssignments,
  getTableAssignmentById,
  getAssignmentsByTable,
  getAssignmentsByUser,
  createTableAssignment,
  updateTableAssignment,
  deleteTableAssignment,
} from "../controllers/tableAssignmentController.js";
import {
  requireAuth,
  requireBranchAdminOrAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Branch Admin (1) + Admin (2) only
router.use(requireAuth, requireBranchAdminOrAdmin);

// Static routes MUST come before /:id to avoid param shadowing
router.get("/", getTableAssignments);
router.get("/table/:tableId", getAssignmentsByTable);
router.get("/user/:userId", getAssignmentsByUser);
router.get("/:id", getTableAssignmentById);
router.post("/", createTableAssignment);
router.put("/:id", updateTableAssignment);
router.delete("/:id", deleteTableAssignment);

export default router;

import express from "express";
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from "../controllers/roleController.js";
import { requireAuth, requireBranchAdminOrAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Apply auth + role check to all role routes
router.use(requireAuth, requireBranchAdminOrAdmin);

router.get("/", getRoles);
router.get("/:id", getRoleById);
router.post("/", createRole);
router.put("/:id", updateRole);
router.delete("/:id", deleteRole);

export default router;

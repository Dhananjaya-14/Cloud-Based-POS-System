import express from "express";
import {
  getTerminals,
  getTerminalById,
  getTerminalsByBranch,
  createTerminal,
  updateTerminal,
  deleteTerminal,
} from "../controllers/terminalController.js";
import { requireAuth, requireBranchAdminOrAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// All terminal routes require auth + Branch Admin or Admin
router.use(requireAuth, requireBranchAdminOrAdmin);

// IMPORTANT: /branch/:branchId must be registered before /:id
// otherwise Express matches "branch" as the :id param
router.get("/", getTerminals);
router.get("/branch/:branchId", getTerminalsByBranch);
router.get("/:id", getTerminalById);
router.post("/", createTerminal);
router.put("/:id", updateTerminal);
router.delete("/:id", deleteTerminal);

export default router;

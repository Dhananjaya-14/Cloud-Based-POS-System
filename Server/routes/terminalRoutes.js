import express from "express";
import {
  getTerminals,
  getTerminalById,
  getTerminalsByBranch,
  createTerminal,
  updateTerminal,
  deleteTerminal,
} from "../controllers/terminalController.js";

const router = express.Router();

router.get("/", getTerminals);
router.get("/branch/:branchId", getTerminalsByBranch);
router.get("/:id", getTerminalById);
router.post("/", createTerminal);
router.put("/:id", updateTerminal);
router.delete("/:id", deleteTerminal);

export default router;

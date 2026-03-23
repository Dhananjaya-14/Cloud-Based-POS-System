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

const router = express.Router();

router.get("/", getTables);
router.get("/:id", getTableById);
router.get("/branch/:branchId", getTablesByBranch);
router.post("/", createTable);
router.put("/:id", updateTable);
router.patch("/:id/status", updateTableStatus);
router.delete("/:id", deleteTable);

export default router;

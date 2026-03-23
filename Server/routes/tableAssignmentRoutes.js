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

<<<<<<< Updated upstream
=======

>>>>>>> Stashed changes
const router = express.Router();

router.get("/", getTableAssignments);
router.get("/table/:tableId", getAssignmentsByTable);
router.get("/user/:userId", getAssignmentsByUser);
router.get("/:id", getTableAssignmentById);
router.post("/", createTableAssignment);
router.put("/:id", updateTableAssignment);
router.delete("/:id", deleteTableAssignment);

export default router;

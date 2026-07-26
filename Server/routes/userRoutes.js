import express from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/userController.js";
import { requireAuth, requireBranchAdminOrAdmin } from "../middleware/authMiddleware.js";
import { checkQuota } from "../middleware/saasMiddleware.js";

const router = express.Router();

// All user routes require auth + Branch Admin or Admin
router.use(requireAuth, requireBranchAdminOrAdmin);

router.get("/", getUsers);
router.get("/:id", getUserById);
router.post("/", checkQuota("max_users", "User"), createUser);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

export default router;

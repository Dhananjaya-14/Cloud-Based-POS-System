import express from "express";
import { getPackages, getPackageById, createPackage, updatePackage, deletePackage } from "../controllers/packageController.js";
import { requireAuth, requireSuperAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", requireAuth, getPackages);
router.get("/:id", requireAuth, getPackageById);

router.post("/", requireAuth, requireSuperAdmin, createPackage);
router.put("/:id", requireAuth, requireSuperAdmin, updatePackage);
router.delete("/:id", requireAuth, requireSuperAdmin, deletePackage);

export default router;

import express from "express";
import {
  requireAuth,
  requireAdmin,
  requireSuperAdmin,
} from "../middleware/authMiddleware.js";
import {
  getCompanies,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  updateCompanySettings,
} from "../controllers/companyController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", requireSuperAdmin, getCompanies);
router.get("/:id", getCompanyById);
router.post("/", requireSuperAdmin, createCompany);
router.put("/:id", requireSuperAdmin, updateCompany);
router.patch("/:id/settings", requireAdmin, updateCompanySettings);
router.delete("/:id", requireSuperAdmin, deleteCompany);

export default router;

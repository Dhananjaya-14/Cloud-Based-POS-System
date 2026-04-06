import express from "express";
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplierController.js";

const router = express.Router();

router.get("/",    getSuppliers);      
router.get("/:id", getSupplierById);   
router.post("/",   createSupplier);   
router.put("/:id", updateSupplier);   
router.delete("/:id", deleteSupplier); 

export default router;
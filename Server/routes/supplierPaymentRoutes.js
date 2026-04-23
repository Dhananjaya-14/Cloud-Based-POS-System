import express from "express";

import {
  getSupplierPayments,
  getSupplierPaymentById,
  getPaymentsBySupplier,
  getPaymentsByOrder,
  createSupplierPayment,
  updateSupplierPayment,
  deleteSupplierPayment,
} from "../controllers/supplierPaymentController.js";

const router = express.Router();

router.get("/", getSupplierPayments);
router.get("/:id", getSupplierPaymentById);
router.get("/supplier/:supId", getPaymentsBySupplier);
router.get("/order/:poId", getPaymentsByOrder);
router.post("/", createSupplierPayment);
router.put("/:id", updateSupplierPayment);
router.delete("/:id", deleteSupplierPayment);

export default router;

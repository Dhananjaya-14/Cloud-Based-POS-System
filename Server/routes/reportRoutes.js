import express from "express";
import {
    getSalesSummaryReport,
    getProductSalesReport,
    getRawMaterialStockReport,
    getRawMaterialConsumptionReport
} from "../controllers/reportController.js";

const router = express.Router();

router.post("/sales", getSalesSummaryReport);
router.post("/productsales",getProductSalesReport);
router.post("/rawmaterialstock", getRawMaterialStockReport);
router.post("/rawmaterialconsumption", getRawMaterialConsumptionReport);

export default router;
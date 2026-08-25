import express from "express";
import {
    getSalesSummaryReport,
    getProductSalesReport,
    getRawMaterialStockReport,
    getRawMaterialConsumptionReport,
    getSalesDetailsReport,
    getBranchWiseSalesReport,
    getCashierPerformanceReport
} from "./reportController.js";

import { requireAuth } from "../../middleware/authMiddleware.js"
import { requireModule } from "../../middleware/saasMiddleware.js";
;

const router = express.Router();

router.use(requireAuth);
router.use(requireModule("has_reports"));

router.post("/sales", getSalesSummaryReport);
router.post("/productsales",getProductSalesReport);
router.post("/rawmaterialstock", getRawMaterialStockReport);
router.post("/rawmaterialconsumption", getRawMaterialConsumptionReport);
router.post("/salesdetails",getSalesDetailsReport);
router.post("/branchsales",getBranchWiseSalesReport);
router.post("/cashierperformance", getCashierPerformanceReport);

export default router;
import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { initializeSocket } from "./utils/socket.js";
import { activityLogger, ensureActivityLogTable } from "./middleware/activityLogger.js";
import activityLogRoutes from "./routes/activityLogRoutes.js";



// ─────────────────────────────────────────────
// ROUTE IMPORTS
// ─────────────────────────────────────────────

// Auth
import authRoutes from "./routes/authRoutes.js";

// User Management
import userRoutes from "./routes/userRoutes.js";
import roleRoutes from "./routes/roleRoutes.js";

// Company & Branch
import companyRoutes from "./routes/companyRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";

// Customers
import customerRoutes from "./routes/customerRoutes.js";

// Tables
import tableRoutes from "./routes/tableRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import tableAssignmentRoutes from "./routes/tableAssignmentRoutes.js";
import reservationRoutes from "./routes/reservationRoutes.js";
import waiterRoutes from "./routes/waiterRoutes.js";

// Products & Categories
import categoryRoutes from "./routes/categoryRoutes.js";
import branchProductRoutes from "./routes/branchProductRoutes.js";
import recipeRoutes from "./routes/recipeRouter.js";

// Raw Materials & Inventory
import rawMaterialRoutes from "./routes/rawMaterialRoutes.js";
import wasteRoutes from "./routes/wasteRoutes.js";

// Suppliers & Purchasing
import supplierRoutes from "./routes/supplierRoutes.js";
import purchaseOrderRoutes from "./routes/purchaseOrderRoutes.js";
import purchaseItemRoutes from "./routes/purchaseItemRoutes.js";
import supplierPaymentRoutes from "./routes/supplierPaymentRoutes.js";

// Orders & Payments
import orderRoutes from "./routes/orderRoutes.js";
import orderItemRoutes from "./routes/orderItemRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import discountRoutes from "./routes/discountRoutes.js";

// Delivery & Terminals
import deliveryRoutes from "./routes/deliveryRoutes.js";
import terminalRoutes from "./routes/terminalRoutes.js";
import productRoutes from "./routes/productRoutes.js";

//stats
import statsRoutes from "./routes/statsRoutes.js";

import dashboardRoutes from "./routes/dashboardRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import payhereRoutes from "./routes/payhereRoutes.js";

// ─────────────────────────────────────────────
// APP INIT
// ─────────────────────────────────────────────
const app = express();

// ─────────────────────────────────────────────
// GLOBAL MIDDLEWARE
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "*",
    credentials: true,
  }),
);
app.use(express.json());
// PayHere notify sends application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));
app.use(activityLogger);

// Ensure activity_log table exists on startup
ensureActivityLogTable().catch((err) =>
  console.error("[ACTIVITY_LOG] Failed to ensure table:", err.message)
);

// ─────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// ─────────────────────────────────────────────
// API ROUTES
// ─────────────────────────────────────────────

// -- Auth
app.use("/api/auth", authRoutes);

// -- User Management
app.use("/api/users", userRoutes);
app.use("/api/roles", roleRoutes);

// -- Company & Branch
app.use("/api/companies", companyRoutes);
app.use("/api/branches", branchRoutes);

// -- Customers
app.use("/api/customers", customerRoutes);

// -- Tables
app.use("/api/tables", tableRoutes);
app.use("/api/table-assignments", tableAssignmentRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/waiter", waiterRoutes);

// -- Products & Categories
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/branch_products", branchProductRoutes);
app.use("/api/recipes", recipeRoutes);

// -- Raw Materials & Inventory
app.use("/api/raw-materials", rawMaterialRoutes);
app.use("/api/waste", wasteRoutes);

// -- Suppliers & Purchasing
app.use("/api/suppliers", supplierRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/purchase-items", purchaseItemRoutes);
app.use("/api/supplier-payments", supplierPaymentRoutes);

// -- Orders & Payments
app.use("/api/orders", orderRoutes);
app.use("/api/order-items", orderItemRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/discounts", discountRoutes);

// -- Delivery & Terminals
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/terminals", terminalRoutes);


//Cashier  Dashboard Stats
app.use("/api/dashboard", dashboardRoutes);

// Stats
app.use("/api/stats", statsRoutes);

//Reports
app.use("/api/reports", reportRoutes);

// PayHere Payment Gateway
app.use("/api/payhere", payhereRoutes);

// Activity Logs
app.use("/api/activity-logs", activityLogRoutes);

// ─────────────────────────────────────────────
// ERROR HANDLING (must be last)
// ─────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// Create HTTP server and initialize Socket.IO
const httpServer = createServer(app);
initializeSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// app.use("/api/stats", statsRoutes);




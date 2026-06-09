import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";
import { emitSocketEvent } from "../utils/socket.js";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const MAX_QUANTITY = 999;
const MAX_UNIT_PRICE = 1_000_000;

// ─────────────────────────────────────────────
// SHARED VALIDATORS
// ─────────────────────────────────────────────

/**
 * Validates pro_quantity — must be a positive integer.
 */
function validateQuantity(pro_quantity) {
  const qty = parseInt(pro_quantity, 10);
  if (isNaN(qty) || qty <= 0 || !Number.isInteger(qty)) {
    return "pro_quantity must be a positive integer";
  }
  if (qty > MAX_QUANTITY) {
    return `pro_quantity cannot exceed ${MAX_QUANTITY}`;
  }
  return null;
}

/**
 * Validates unit_price — must be a non-negative number.
 */
function validateUnitPrice(unit_price) {
  const price = parseFloat(unit_price);
  if (isNaN(price) || price < 0) {
    return "unit_price must be a non-negative number";
  }
  if (price > MAX_UNIT_PRICE) {
    return `unit_price cannot exceed ${MAX_UNIT_PRICE}`;
  }
  return null;
}

/**
 * Verifies that the referenced order exists in the DB.
 * Returns the order row or null.
 */
async function fetchOrder(order_id) {
  const { rows } = await pool.query(
    `SELECT or_id, or_status FROM "ORDER" WHERE or_id = $1`,
    [order_id],
  );
  return rows[0] ?? null;
}

/**
 * Verifies that the referenced branch product exists in the DB.
 * Returns the branch product row or null.
 */
async function fetchBranchProduct(Bpro_id) {
  const { rows } = await pool.query(
    `SELECT "Bpro_id", pro_name, " Pro_Price" AS "Pro_Price"
     FROM public."Branch_Product"
     WHERE "Bpro_id" = $1`,
    [Bpro_id],
  );
  return rows[0] ?? null;
}

/**
 * Block mutations on orders that are already completed or cancelled.
 * Returns an error string or null if the order is still editable.
 */
function guardOrderStatus(or_status, roleId) {
  if (or_status === "cancelled") {
    return `Cannot modify items on a "${or_status}" order`;
  }
  if (or_status === "completed" && roleId !== ROLES.CASHIER) {
    return `Cannot modify items on a "${or_status}" order`;
  }
  return null;
}

/**
 * Transaction-safe stock adjuster for order items.
 *
 * These are pre-made products — raw material ingredients are consumed at
 * prep time when the branch admin adds the product batch (via Recipe Mapper).
 * At POS sale time only the branch showcase quantity is decremented.
 * Raw materials and base product stock are NOT touched here.
 */
export async function adjustStockForOrderItem(client, Bpro_id, quantity, operation) {
  // Only update the branch product's showcase quantity.
  // Recipe / raw-material deduction happens in branchProductController at prep time.
  await client.query(
    `UPDATE public."Branch_Product"
       SET "pro_quantity" = GREATEST(0, "pro_quantity" ${operation === "subtract" ? "-" : "+"} $1)
     WHERE "Bpro_id" = $2`,
    [quantity, Bpro_id]
  );

  return []; // No raw-material warnings at sale time
}

// ─────────────────────────────────────────────
// GET /order-items — list all order items
// ─────────────────────────────────────────────
export const getAllOrderItems = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM public."ORDER_ITEM" ORDER BY "orderItem_id" ASC`,
    );
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /order-items/order/:order_id — items for a specific order
// ─────────────────────────────────────────────
export const getOrderItemsByOrderId = async (req, res) => {
  try {
    const order_id = parseInt(req.params.order_id, 10);
    if (isNaN(order_id) || order_id <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid order ID" });
    }

    // Confirm the parent order exists
    const order = await fetchOrder(order_id);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const result = await pool.query(
      `SELECT
         oi."orderItem_id",
         oi."Bpro_id",
         oi.pro_quantity,
         oi.unit_price,
         oi.total_price,
         oi.order_id,
         bp.pro_name,
         bp." Pro_Price" AS branch_price
       FROM public."ORDER_ITEM" oi
       LEFT JOIN public."Branch_Product" bp
         ON bp."Bpro_id" = oi."Bpro_id"
       WHERE oi.order_id = $1
       ORDER BY oi."orderItem_id" ASC`,
      [order_id],
    );

    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error("[getOrderItemsByOrderId] error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /order-items/:id — single order item
// ─────────────────────────────────────────────
export const getOrderItemById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid order item ID" });
    }

    const result = await pool.query(
      `SELECT * FROM public."ORDER_ITEM" WHERE "orderItem_id" = $1`,
      [id],
    );
    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "Order item not found" });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /order-items — create a new order item
// ─────────────────────────────────────────────
export const createOrderItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const { Bpro_id, pro_quantity, unit_price, order_id } = req.body;

    // ── Required fields ──
    const missing = [];
    if (Bpro_id === undefined || Bpro_id === null) missing.push("Bpro_id");
    if (pro_quantity === undefined || pro_quantity === null)
      missing.push("pro_quantity");
    if (unit_price === undefined || unit_price === null)
      missing.push("unit_price");
    if (order_id === undefined || order_id === null) missing.push("order_id");

    if (missing.length) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // ── Numeric / range validation ──
    const qtyError = validateQuantity(pro_quantity);
    if (qtyError)
      return res.status(400).json({ success: false, error: qtyError });

    const priceError = validateUnitPrice(unit_price);
    if (priceError)
      return res.status(400).json({ success: false, error: priceError });

    const parsedOrderId = parseInt(order_id, 10);
    if (isNaN(parsedOrderId) || parsedOrderId <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid order_id" });
    }

    // ── FK: order must exist and be editable ──
    const order = await fetchOrder(parsedOrderId);
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    const statusError = guardOrderStatus(order.or_status, req.user?.role_id);
    if (statusError)
      return res.status(400).json({ success: false, error: statusError });

    // ── FK: branch product must exist ──
    const bProduct = await fetchBranchProduct(Bpro_id);
    if (!bProduct) {
      return res
        .status(404)
        .json({ success: false, error: "Branch product not found" });
    }

    // ── Compute derived field ──
    const qty = parseInt(pro_quantity, 10);
    const price = parseFloat(unit_price);
    const total_price = parseFloat((price * qty).toFixed(2));

    await client.query("BEGIN");

    // Deduct raw material stock
    const stockWarnings = await adjustStockForOrderItem(client, Bpro_id, qty, "subtract");

    const result = await client.query(
      `INSERT INTO public."ORDER_ITEM" ("Bpro_id", pro_quantity, unit_price, total_price, order_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [Bpro_id, qty, price, total_price, parsedOrderId],
    );

    emitSocketEvent("order:created", {
      orderId: parsedOrderId,
      orderItem: result.rows[0],
    });

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      data: result.rows[0],
      warnings: stockWarnings,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23503") {
      return res.status(400).json({
        success: false,
        error: "Foreign key violation — check Bpro_id and order_id",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────
// PUT /order-items/:id — full update
// ─────────────────────────────────────────────
export const updateOrderItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid order item ID" });
    }

    const { Bpro_id, pro_quantity, unit_price, order_id } = req.body;

    // ── All fields required for full update ──
    const missing = [];
    if (Bpro_id === undefined || Bpro_id === null) missing.push("Bpro_id");
    if (pro_quantity === undefined || pro_quantity === null)
      missing.push("pro_quantity");
    if (unit_price === undefined || unit_price === null)
      missing.push("unit_price");
    if (order_id === undefined || order_id === null) missing.push("order_id");

    if (missing.length) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields for full update: ${missing.join(", ")}`,
      });
    }

    await client.query("BEGIN");

    // ── Confirm item exists ──
    const existing = await client.query(
      `SELECT * FROM public."ORDER_ITEM" WHERE "orderItem_id" = $1 FOR UPDATE`,
      [id],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, error: "Order item not found" });
    }

    const oldItem = existing.rows[0];

    // ── Numeric / range validation ──
    const qtyError = validateQuantity(pro_quantity);
    if (qtyError) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: qtyError });
    }

    const priceError = validateUnitPrice(unit_price);
    if (priceError) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: priceError });
    }

    const parsedOrderId = parseInt(order_id, 10);
    if (isNaN(parsedOrderId) || parsedOrderId <= 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ success: false, error: "Invalid order_id" });
    }

    // ── FK: order must exist and be editable ──
    const order = await fetchOrder(parsedOrderId);
    if (!order) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    const statusError = guardOrderStatus(order.or_status, req.user?.role_id);
    if (statusError) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: statusError });
    }

    // ── FK: branch product must exist ──
    const bProduct = await fetchBranchProduct(Bpro_id);
    if (!bProduct) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, error: "Branch product not found" });
    }

    const qty = parseInt(pro_quantity, 10);
    const price = parseFloat(unit_price);
    const total_price = parseFloat((price * qty).toFixed(2));

    // Calculate quantity difference and adjust stock
    if (Number(oldItem.Bpro_id) !== Number(Bpro_id)) {
      await adjustStockForOrderItem(client, oldItem.Bpro_id, oldItem.pro_quantity, "add");
      await adjustStockForOrderItem(client, Bpro_id, qty, "subtract");
    } else {
      const diff = qty - oldItem.pro_quantity;
      if (diff > 0) {
        await adjustStockForOrderItem(client, Bpro_id, diff, "subtract");
      } else if (diff < 0) {
        await adjustStockForOrderItem(client, Bpro_id, Math.abs(diff), "add");
      }
    }

    const result = await client.query(
      `UPDATE public."ORDER_ITEM"
       SET "Bpro_id" = $1, pro_quantity = $2, unit_price = $3, total_price = $4, order_id = $5
       WHERE "orderItem_id" = $6
       RETURNING *`,
      [Bpro_id, qty, price, total_price, parsedOrderId, id],
    );

    await client.query("COMMIT");

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23503") {
      return res.status(400).json({
        success: false,
        error: "Foreign key violation — check Bpro_id and order_id",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────
// DELETE /order-items/:id — delete an order item
// ─────────────────────────────────────────────
export const deleteOrderItem = async (req, res) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid order item ID" });
    }

    await client.query("BEGIN");

    // ── Confirm item exists ──
    const existing = await client.query(
      `SELECT oi.*, o.or_status
       FROM public."ORDER_ITEM" oi
       JOIN "ORDER" o ON o.or_id = oi.order_id
       WHERE oi."orderItem_id" = $1 FOR UPDATE`,
      [id],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, error: "Order item not found" });
    }

    const item = existing.rows[0];

    // ── Block deletion if the parent order is terminal ──
    const statusError = guardOrderStatus(item.or_status, req.user?.role_id);
    if (statusError) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: statusError });
    }

    // Restore stock levels
    await adjustStockForOrderItem(client, item.Bpro_id, item.pro_quantity, "add");

    const result = await client.query(
      `DELETE FROM public."ORDER_ITEM" WHERE "orderItem_id" = $1 RETURNING *`,
      [id],
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Order item deleted successfully",
      data: result.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};
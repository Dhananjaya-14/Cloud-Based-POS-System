import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";
import { emitSocketEvent, KITCHEN_SOCKET_ROOM } from "../utils/socket.js";

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
 * Converts a recipe quantity into the raw material stock unit.
 */
function convertQuantity(recipeQty, recipeUnit, stockUnit) {
  const rUnit = String(recipeUnit || "").toLowerCase().trim();
  const sUnit = String(stockUnit || "").toLowerCase().trim();

  if (rUnit === sUnit || !rUnit || !sUnit) {
    return recipeQty;
  }

  // Mass conversions
  if (rUnit === "g" && sUnit === "kg") return recipeQty / 1000;
  if (rUnit === "mg" && sUnit === "g") return recipeQty / 1000;
  if (rUnit === "mg" && sUnit === "kg") return recipeQty / 1000000;
  if (rUnit === "kg" && sUnit === "g") return recipeQty * 1000;

  // Volume conversions
  if (rUnit === "ml" && sUnit === "l") return recipeQty / 1000;
  if (rUnit === "l" && sUnit === "ml") return recipeQty * 1000;

  // Count/dozen conversions
  if (rUnit === "pcs" && sUnit === "dozen") return recipeQty / 12;
  if (rUnit === "units" && sUnit === "dozen") return recipeQty / 12;

  return recipeQty;
}

/**
 * Transaction-safe stock adjuster for order items.
 * Finds all mapped recipes and updates branch-scoped raw material stock levels.
 *
 * Fixes:
 *  1. Branch isolation — UPDATE is scoped to the branch's b_id so only the
 *     correct branch row is touched (global rows where b_id IS NULL still work).
 *  2. Low-stock warning — logs insufficient stock and clamps deducted stock to zero.
 *  3. FOR UPDATE — row-level lock prevents race conditions under concurrent orders.
 */
export async function adjustStockForOrderItem(client, Bpro_id, quantity, operation) {
  const stockWarnings = [];

  // Lock raw material rows for this branch product to prevent concurrent overselling
  const recipesResult = await client.query(
    `SELECT
       r."rawmaterial_ID" AS "rawmaterial_id",
       r."quantity_req",
       COALESCE(r."unit", rm."unit") AS "recipe_unit",
       rm."unit"       AS "stock_unit",
       rm."stock_qty",
       rm."rm_name",
       bp."B_id"       AS "b_id"
     FROM public."Branch_Product" bp
     JOIN public."RECIPE"        r  ON r."pro_id"      = bp."pro_id"
     JOIN public."Raw_Material"  rm ON rm."rm_id"      = r."rawmaterial_ID"
     WHERE bp."Bpro_id" = $1
     FOR UPDATE OF rm`,
    [Bpro_id]
  );

  for (const recipe of recipesResult.rows) {
    const totalRecipeQty = recipe.quantity_req * quantity;
    const convertedQty   = convertQuantity(totalRecipeQty, recipe.recipe_unit, recipe.stock_unit);

    // ── Negative-stock guard (subtract only) ──────────────────────────────────
    if (operation === "subtract") {
      const currentStock = parseFloat(recipe.stock_qty);
      if (convertedQty > currentStock) {
        const warningMessage =
          `Insufficient stock for "${recipe.rm_name}": ` +
          `need ${convertedQty.toFixed(3)} ${recipe.stock_unit}, ` +
          `only ${currentStock} ${recipe.stock_unit} available in this branch`;
        stockWarnings.push({
          rawMaterialName: recipe.rm_name,
          needed: Number(convertedQty.toFixed(3)),
          available: currentStock,
          unit: recipe.stock_unit,
          message: warningMessage,
        });
        console.warn(warningMessage);
      }
    }

    const stockExpression =
      operation === "subtract"
        ? "GREATEST(0, stock_qty - $1)"
        : "stock_qty + $1";

    // ── Branch-scoped Raw_Material UPDATE ────────────────────────────────────
    // Raw materials with a specific b_id are branch-level; those with b_id IS NULL
    // are company-wide. Both cases are handled by the OR condition below.
    await client.query(
      `UPDATE "Raw_Material"
         SET stock_qty = ${stockExpression}
       WHERE rm_id = $2
         AND (
           b_id = $3
           OR (b_id IS NULL AND $3::integer IS NULL)
         )`,
      [convertedQty, recipe.rawmaterial_id, recipe.b_id ?? null]
    );
  }

  // ── Branch_Product.pro_quantity UPDATE ───────────────────────────────────────
  // This is the stock count shown on the Branch Admin and Admin product dashboards.
  // GREATEST(0, ...) ensures pro_quantity never goes below zero on subtract.
  await client.query(
    `UPDATE public."Branch_Product"
       SET "pro_quantity" = GREATEST(0, "pro_quantity" ${operation === "subtract" ? "-" : "+"} $1)
     WHERE "Bpro_id" = $2`,
    [quantity, Bpro_id]
  );

  // ── Product.pro_qty UPDATE ───────────────────────────────────────────────────
  // Also adjust the base/global product stock quantity to keep it in sync
  const bpResult = await client.query(
    `SELECT "pro_id" FROM public."Branch_Product" WHERE "Bpro_id" = $1`,
    [Bpro_id]
  );
  if (bpResult.rows.length > 0) {
    const proId = bpResult.rows[0].pro_id;
    if (proId) {
      await client.query(
        `UPDATE public."Product"
         SET "pro_qty" = GREATEST(0, "pro_qty" ${operation === "subtract" ? "-" : "+"} $1)
         WHERE "pro_id" = $2`,
        [quantity, proId]
      );
    }
  }

  return stockWarnings;
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
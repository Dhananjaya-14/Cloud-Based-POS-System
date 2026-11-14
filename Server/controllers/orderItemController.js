import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";
import { emitSocketEvent } from "../utils/socket.js";
import { lockOrder, recalculateOrderTotals, round2 } from "../utils/orderTotals.js";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const MAX_QUANTITY = 999;

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
export async function fetchBranchProduct(Bpro_id) {
  const { rows } = await pool.query(
    `SELECT bp."Bpro_id", bp.pro_name, bp." Pro_Price" AS "Pro_Price", bp.pro_id, bp."B_id", p.product_type
     FROM public."Branch_Product" bp
     JOIN public."Product" p ON p.pro_id = bp.pro_id
     WHERE bp."Bpro_id" = $1`,
    [Bpro_id],
  );
  return rows[0] ?? null;
}

/**
 * Checks that a branch product can be sold on this order:
 * it exists, belongs to the order's branch and has a valid price.
 * Returns { status, error } or null.
 */
export function checkProductForOrder(bProduct, order) {
  if (!bProduct) return { status: 404, error: "Branch product not found" };
  if (Number(bProduct.B_id) !== Number(order.b_id)) {
    return { status: 400, error: `Branch product ${bProduct.Bpro_id} does not belong to this order's branch` };
  }
  const price = Number(bProduct.Pro_Price);
  if (bProduct.Pro_Price === null || !Number.isFinite(price) || price < 0) {
    return { status: 400, error: `Branch product ${bProduct.Bpro_id} has no valid price` };
  }
  return null;
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

// Unit conversion for recipe ingredients
function convertQty(recipeQty, recipeUnit, stockUnit) {
  const rUnit = String(recipeUnit || "").toLowerCase().trim();
  const sUnit = String(stockUnit || "").toLowerCase().trim();

  if (rUnit === sUnit || !rUnit || !sUnit) return recipeQty;

  // Weight conversions
  if (rUnit === "g"  && sUnit === "kg") return recipeQty / 1000;
  if (rUnit === "kg" && sUnit === "g")  return recipeQty * 1000;
  if (rUnit === "mg" && sUnit === "g")  return recipeQty / 1000;
  if (rUnit === "mg" && sUnit === "kg") return recipeQty / 1_000_000;

  // Volume conversions
  if (rUnit === "ml" && sUnit === "l")  return recipeQty / 1000;
  if (rUnit === "l"  && sUnit === "ml") return recipeQty * 1000;

  // Count conversions
  if (rUnit === "pcs"   && sUnit === "dozen") return recipeQty / 12;
  if (rUnit === "units" && sUnit === "dozen") return recipeQty / 12;

  return recipeQty;
}

async function adjustRecipeIngredients(client, pro_id, b_id, quantity, operation) {
  const recipesResult = await client.query(
    `SELECT
       r."rawmaterial_ID" AS "rawmaterial_id",
       r."quantity_req",
       COALESCE(r."unit", rm."unit") AS "recipe_unit",
       rm."unit"                     AS "stock_unit"
     FROM public."RECIPE"        r
     JOIN public."Raw_Material"  rm ON rm."rm_id" = r."rawmaterial_ID"
     WHERE r."pro_id" = $1
     FOR UPDATE OF rm`,
    [pro_id]
  );

  for (const recipe of recipesResult.rows) {
    const totalQty = recipe.quantity_req * quantity;
    const convertedQty = convertQty(totalQty, recipe.recipe_unit, recipe.stock_unit);
    const stockExpr = operation === "subtract"
      ? "GREATEST(0, stock_qty - $1)"
      : "stock_qty + $1";

    await client.query(
      `UPDATE public."Raw_Material"
         SET stock_qty = ${stockExpr}
       WHERE rm_id = $2
         AND (
           b_id = $3
           OR (b_id IS NULL AND $3::integer IS NULL)
         )`,
      [convertedQty, recipe.rawmaterial_id, b_id ?? null]
    );
  }
}

/**
 * Transaction-safe stock adjuster for order items.
 *
 * - Pre-made / finished products: decrement branch showcase qty at sale time
 *   (raw materials were already deducted at prep time by the branch admin).
 * - Made-to-order products: do NOT touch anything at sale time.
 *   Raw material deduction happens when kitchen staff accepts the order
 *   (status → "preparing") in orderController.updateOrderStatus.
 */
export async function adjustStockForOrderItem(client, bProduct, quantity, operation) {
  if (bProduct.product_type === 'made_to_order') {
    // Nothing to do at order creation/deletion for made_to_order.
    // Ingredients are deducted only when kitchen accepts the order.
    return [];
  }

  // For pre_made or finished products, update the branch showcase quantity.
  await client.query(
    `UPDATE public."Branch_Product"
       SET "pro_quantity" = GREATEST(0, "pro_quantity" ${operation === "subtract" ? "-" : "+"} $1)
     WHERE "Bpro_id" = $2`,
    [quantity, bProduct.Bpro_id]
  );

  return [];
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
    // unit_price from the client is ignored — the price always comes from Branch_Product
    const { Bpro_id, pro_quantity, order_id } = req.body;

    // ── Required fields ──
    const missing = [];
    if (Bpro_id === undefined || Bpro_id === null) missing.push("Bpro_id");
    if (pro_quantity === undefined || pro_quantity === null)
      missing.push("pro_quantity");
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

    const parsedOrderId = parseInt(order_id, 10);
    if (isNaN(parsedOrderId) || parsedOrderId <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid order_id" });
    }

    await client.query("BEGIN");

    // ── FK: order must exist and be editable (row locked until COMMIT) ──
    const order = await lockOrder(client, parsedOrderId);
    if (!order) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    const statusError = guardOrderStatus(order.or_status, req.user?.role_id);
    if (statusError) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: statusError });
    }

    // ── FK: branch product must exist, belong to the order's branch, and have a price ──
    const bProduct = await fetchBranchProduct(Bpro_id);
    const productError = checkProductForOrder(bProduct, order);
    if (productError) {
      await client.query("ROLLBACK");
      return res.status(productError.status).json({ success: false, error: productError.error });
    }

    // ── Server-side price ──
    const qty = parseInt(pro_quantity, 10);
    const price = Number(bProduct.Pro_Price);
    const total_price = round2(price * qty);

    // Deduct raw material stock
    const stockWarnings = await adjustStockForOrderItem(client, bProduct, qty, "subtract");

    const result = await client.query(
      `INSERT INTO public."ORDER_ITEM" ("Bpro_id", pro_quantity, unit_price, total_price, order_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [Bpro_id, qty, price, total_price, parsedOrderId],
    );

    const updatedOrder = await recalculateOrderTotals(client, parsedOrderId);

    await client.query("COMMIT");

    emitSocketEvent("order:created", {
      orderId: parsedOrderId,
      orderItem: result.rows[0],
      b_id: order.b_id,
      or_status: order.or_status,
    });

    res.status(201).json({
      success: true,
      data: result.rows[0],
      order: updatedOrder,
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

    // unit_price from the client is ignored — the price always comes from Branch_Product
    const { Bpro_id, pro_quantity, order_id } = req.body;

    // ── All fields required for full update ──
    const missing = [];
    if (Bpro_id === undefined || Bpro_id === null) missing.push("Bpro_id");
    if (pro_quantity === undefined || pro_quantity === null)
      missing.push("pro_quantity");
    if (order_id === undefined || order_id === null) missing.push("order_id");

    if (missing.length) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields for full update: ${missing.join(", ")}`,
      });
    }

    const qtyError = validateQuantity(pro_quantity);
    if (qtyError) {
      return res.status(400).json({ success: false, error: qtyError });
    }

    const parsedOrderId = parseInt(order_id, 10);
    if (isNaN(parsedOrderId) || parsedOrderId <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid order_id" });
    }

    await client.query("BEGIN");

    // ── Confirm item exists ──
    const existing = await client.query(
      `SELECT * FROM public."ORDER_ITEM" WHERE "orderItem_id" = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, error: "Order item not found" });
    }
    const oldItem = existing.rows[0];

    // Lock both the old and the new parent order (lowest id first to avoid deadlocks)
    const orderIds = [...new Set([Number(oldItem.order_id), parsedOrderId])].sort((a, b) => a - b);
    const locked = {};
    for (const oid of orderIds) locked[oid] = await lockOrder(client, oid);
    await client.query(
      `SELECT 1 FROM public."ORDER_ITEM" WHERE "orderItem_id" = $1 FOR UPDATE`,
      [id],
    );

    // ── FK: order must exist and be editable ──
    const order = locked[parsedOrderId];
    if (!order) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    for (const o of Object.values(locked)) {
      const statusError = o && guardOrderStatus(o.or_status, req.user?.role_id);
      if (statusError) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, error: statusError });
      }
    }

    // ── FK: branch product must exist, belong to the order's branch, and have a price ──
    const bProduct = await fetchBranchProduct(Bpro_id);
    const productError = checkProductForOrder(bProduct, order);
    if (productError) {
      await client.query("ROLLBACK");
      return res.status(productError.status).json({ success: false, error: productError.error });
    }

    // ── Server-side price ──
    const qty = parseInt(pro_quantity, 10);
    const price = Number(bProduct.Pro_Price);
    const total_price = round2(price * qty);

    // Calculate quantity difference and adjust stock
    if (Number(oldItem.Bpro_id) !== Number(Bpro_id)) {
      const oldBProduct = await fetchBranchProduct(oldItem.Bpro_id);
      if (oldBProduct) await adjustStockForOrderItem(client, oldBProduct, oldItem.pro_quantity, "add");
      await adjustStockForOrderItem(client, bProduct, qty, "subtract");
    } else {
      const diff = qty - oldItem.pro_quantity;
      if (diff > 0) {
        await adjustStockForOrderItem(client, bProduct, diff, "subtract");
      } else if (diff < 0) {
        await adjustStockForOrderItem(client, bProduct, Math.abs(diff), "add");
      }
    }

    const result = await client.query(
      `UPDATE public."ORDER_ITEM"
       SET "Bpro_id" = $1, pro_quantity = $2, unit_price = $3, total_price = $4, order_id = $5
       WHERE "orderItem_id" = $6
       RETURNING *`,
      [Bpro_id, qty, price, total_price, parsedOrderId, id],
    );

    // Recalculate every order the item touched (old and new parent)
    let updatedOrder = null;
    for (const oid of orderIds) {
      const o = await recalculateOrderTotals(client, oid);
      if (oid === parsedOrderId) updatedOrder = o;
    }

    await client.query("COMMIT");

    res.json({ success: true, data: result.rows[0], order: updatedOrder });
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
      `SELECT * FROM public."ORDER_ITEM" WHERE "orderItem_id" = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ success: false, error: "Order item not found" });
    }
    const item = existing.rows[0];

    // Lock the parent order, then the item
    const order = await lockOrder(client, item.order_id);
    await client.query(
      `SELECT 1 FROM public."ORDER_ITEM" WHERE "orderItem_id" = $1 FOR UPDATE`,
      [id],
    );

    // ── Block deletion if the parent order is terminal ──
    const statusError = order && guardOrderStatus(order.or_status, req.user?.role_id);
    if (statusError) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: statusError });
    }

    // Restore stock levels
    const bProduct = await fetchBranchProduct(item.Bpro_id);
    if (bProduct) await adjustStockForOrderItem(client, bProduct, item.pro_quantity, "add");

    const result = await client.query(
      `DELETE FROM public."ORDER_ITEM" WHERE "orderItem_id" = $1 RETURNING *`,
      [id],
    );

    const updatedOrder = await recalculateOrderTotals(client, item.order_id);

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Order item deleted successfully",
      data: result.rows[0],
      order: updatedOrder,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

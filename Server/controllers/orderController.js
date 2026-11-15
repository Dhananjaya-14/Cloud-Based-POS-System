import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";
import {
  emitSocketEvent,
  getCashierSocketRoom,
  KITCHEN_SOCKET_ROOM,
  SOCKET_EVENTS
} from "../utils/socket.js";
import { adjustStockForOrderItem, fetchBranchProduct, checkProductForOrder } from "./orderItemController.js";
import {
  validateOrderCharges,
  getBranchTaxRate,
  recalculateOrderTotals,
  round2,
} from "../utils/orderTotals.js";


// Unit conversion for recipe ingredients
function convertRecipeQty(recipeQty, recipeUnit, stockUnit) {
  const rUnit = String(recipeUnit || "").toLowerCase().trim();
  const sUnit = String(stockUnit || "").toLowerCase().trim();

  if (rUnit === sUnit || !rUnit || !sUnit) return recipeQty;

  // Weight conversions
  if (rUnit === "g" && sUnit === "kg") return recipeQty / 1000;
  if (rUnit === "kg" && sUnit === "g") return recipeQty * 1000;
  if (rUnit === "mg" && sUnit === "g") return recipeQty / 1000;
  if (rUnit === "mg" && sUnit === "kg") return recipeQty / 1_000_000;

  // Volume conversions
  if (rUnit === "ml" && sUnit === "l") return recipeQty / 1000;
  if (rUnit === "l" && sUnit === "ml") return recipeQty * 1000;

  // Count conversions
  if (rUnit === "pcs" && sUnit === "dozen") return recipeQty / 12;
  if (rUnit === "units" && sUnit === "dozen") return recipeQty / 12;

  return recipeQty;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
// "hold" = order parked by the cashier: saved, but not sent to the kitchen
// and not payable until it is resumed (hold → pending).
const VALID_STATUSES = ["pending", "hold", "preparing", "completed", "cancelled"];
const VALID_TYPES = ["dine-in", "takeaway", "delivery"];

// Legal status transitions for a POS system
// Key = current status, Value = allowed next statuses
const STATUS_TRANSITIONS = {
  pending:   ["preparing", "completed", "cancelled", "hold"],
  hold:      ["pending", "cancelled"],
  preparing: ["completed", "cancelled"],
  completed: [],
  cancelled: [], 
};

// ─────────────────────────────────────────────
// SHARED VALIDATORS
// ─────────────────────────────────────────────

/**
 * Validates order type business rules.
 * Returns an error string or null if valid.
 */
function validateTypeConstraints(or_type, table_id, features) {
  if (or_type === "dine-in" && !table_id) {
    if (features?.has_waiter) {
      return "table_id is required for dine-in orders when Waiter module is active";
    }
  }
  return null;
}

/**
 * Checks whether a status transition is legal.
 * Returns an error string or null if valid.
 */
function validateStatusTransition(currentStatus, newStatus) {
  if (!VALID_STATUSES.includes(newStatus)) {
    return `Invalid status "${newStatus}". Use: ${VALID_STATUSES.join(" | ")}`;
  }
  const allowed = STATUS_TRANSITIONS[currentStatus];
  if (!allowed.includes(newStatus)) {
    if (allowed.length === 0) {
      return `Order is already "${currentStatus}" — no further status changes are allowed`;
    }
    return `Cannot change status from "${currentStatus}" to "${newStatus}". Allowed: ${allowed.join(" | ")}`;
  }
  return null;
}

// ─────────────────────────────────────────────
// GET /orders — list all orders (with filters)
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// POST /orders/check-stock — validate ingredient availability BEFORE order creation
// Body: { items: [{ Bpro_id, pro_quantity }] }
// ─────────────────────────────────────────────
export const checkOrderStock = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "items array is required" });
    }

    // required[rawmaterial_ID] = { name, unit, stock_qty, required }
    const required = new Map();
    const shortages = [];

    for (const item of items) {
      const { Bpro_id, pro_quantity } = item;
      if (!Bpro_id || !pro_quantity) continue;

      const bp = await pool.query(
        `SELECT bp.pro_id, bp.pro_quantity AS branch_qty, bp.pro_name, p.product_type 
         FROM public."Branch_Product" bp
         JOIN public."Product" p ON p.pro_id = bp.pro_id
         WHERE bp."Bpro_id" = $1`,
        [Bpro_id],
      );
      if (!bp.rows.length) continue;

      const pro_id = bp.rows[0].pro_id;
      const productType = bp.rows[0].product_type;
      const branchQty = Number(bp.rows[0].branch_qty || 0);
      const proName = bp.rows[0].pro_name;

      if (productType !== 'made_to_order') {
        // For pre_made and finished, check branch showcase quantity directly
        if (branchQty < pro_quantity) {
          shortages.push({
            ingredient: proName + " (Product Stock)",
            required: pro_quantity,
            available: branchQty,
            unit: "units",
          });
        }
      } else {
        // For made_to_order, check recipe raw materials
        const recipes = await pool.query(
          `SELECT r."rawmaterial_ID", r."quantity_req", r."unit" AS recipe_unit,
                  rm."rm_name", rm."stock_qty", rm."unit" AS stock_unit
           FROM public."RECIPE" r
           JOIN public."Raw_Material" rm ON rm."rm_id" = r."rawmaterial_ID"
           WHERE r."pro_id" = $1`,
          [pro_id],
        );

        for (const recipe of recipes.rows) {
          const rawQty = recipe.quantity_req * pro_quantity;
          const neededQty = convertRecipeQty(
            rawQty,
            recipe.recipe_unit,
            recipe.stock_unit,
          );

          const key = recipe.rawmaterial_ID;
          if (!required.has(key)) {
            required.set(key, {
              rm_name: recipe.rm_name,
              unit: recipe.stock_unit,
              stock_qty: Number(recipe.stock_qty),
              required: 0,
            });
          }
          required.get(key).required += neededQty;
        }
      }
    }

    const ingredientShortages = [...required.values()]
      .filter((r) => r.required > r.stock_qty)
      .map((r) => ({
        ingredient: r.rm_name,
        required: Number(r.required.toFixed(2)),
        available: r.stock_qty,
        unit: r.unit || "",
      }));

    shortages.push(...ingredientShortages);

    if (shortages.length > 0) {
      return res.status(200).json({ success: false, shortages });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /orders — list all orders (with filters)
// ─────────────────────────────────────────────
export const getAllOrders = async (req, res) => {
  try {
    const { status, type, b_id, u_id, date, start_date, end_date, hours } = req.query;

    // Validate filter values if provided
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status filter. Use: ${VALID_STATUSES.join(" | ")}`,
      });
    }
    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid type filter. Use: ${VALID_TYPES.join(" | ")}`,
      });
    }
    if (date && isNaN(Date.parse(date))) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid date format" });
    }
    if (start_date && isNaN(Date.parse(start_date))) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid start_date format" });
    }
    if (end_date && isNaN(Date.parse(end_date))) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid end_date format" });
    }
    if (hours && isNaN(Number(hours))) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid hours format" });
    }

    const conditions = [];
    const values = [];
    let i = 1;

    if (status) {
      conditions.push(`o.or_status = $${i++}`);
      values.push(status);
    }
    if (type) {
      conditions.push(`o.or_type = $${i++}`);
      values.push(type);
    }
    if (b_id) {
      conditions.push(`o.b_id = $${i++}`);
      values.push(b_id);
    }
    if (u_id) {
      conditions.push(`o.u_id = $${i++}`);
      values.push(u_id);
    }
    if (date) {
      conditions.push(`o.or_date = $${i++}`);
      values.push(date);
    }
    if (hours) {
      // Last N hours or current calendar day, whichever matches best
      conditions.push(`((o.or_date + o.or_time) >= (NOW() - ($${i++} || ' hours')::INTERVAL) OR o.or_date >= CURRENT_DATE)`);
      values.push(Number(hours));
    } else {
      if (start_date) {
        conditions.push(`o.or_date >= $${i++}`);
        values.push(start_date);
      }
      if (end_date) {
        conditions.push(`o.or_date <= $${i++}`);
        values.push(end_date);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT o.*, p.pay_status
       FROM "ORDER" o
       LEFT JOIN "Payment" p ON p.or_id = o.or_id 
       ${where} 
       ORDER BY o.or_date DESC, o.or_time DESC`,
      values,
    );

    res.status(200).json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Shared filter parser for the branch/company order list endpoints.
// Returns { error } on invalid input, otherwise { conditions, values }.
function buildOrderFilters(query, startIndex = 1) {
  const { status, type, b_id, u_id, date, start_date, end_date, hours } = query;

  if (status && !VALID_STATUSES.includes(status)) {
    return { error: `Invalid status filter. Use: ${VALID_STATUSES.join(" | ")}` };
  }
  if (type && !VALID_TYPES.includes(type)) {
    return { error: `Invalid type filter. Use: ${VALID_TYPES.join(" | ")}` };
  }
  if (b_id && isNaN(Number(b_id))) return { error: "Invalid b_id format" };
  if (u_id && isNaN(Number(u_id))) return { error: "Invalid u_id format" };
  if (date && isNaN(Date.parse(date))) return { error: "Invalid date format" };
  if (start_date && isNaN(Date.parse(start_date))) return { error: "Invalid start_date format" };
  if (end_date && isNaN(Date.parse(end_date))) return { error: "Invalid end_date format" };
  if (hours && isNaN(Number(hours))) return { error: "Invalid hours format" };

  const conditions = [];
  const values = [];
  let i = startIndex;

  if (status) {
    conditions.push(`o.or_status = $${i++}`);
    values.push(status);
  }
  if (type) {
    conditions.push(`o.or_type = $${i++}`);
    values.push(type);
  }
  if (b_id) {
    conditions.push(`o.b_id = $${i++}`);
    values.push(Number(b_id));
  }
  if (u_id) {
    conditions.push(`o.u_id = $${i++}`);
    values.push(Number(u_id));
  }
  if (date) {
    conditions.push(`o.or_date = $${i++}`);
    values.push(date);
  }
  if (hours) {
    conditions.push(`((o.or_date + o.or_time) >= (NOW() - ($${i++} || ' hours')::INTERVAL) OR o.or_date >= CURRENT_DATE)`);
    values.push(Number(hours));
  } else {
    if (start_date) {
      conditions.push(`o.or_date >= $${i++}`);
      values.push(start_date);
    }
    if (end_date) {
      conditions.push(`o.or_date <= $${i++}`);
      values.push(end_date);
    }
  }

  return { conditions, values };
}

// ─────────────────────────────────────────────
// GET /orders/branch/:branchId — all orders of one branch
// Super Admin: any branch | Admin: branches of own company
// Branch Admin / Cashier / Waiter / Kitchen: own branch only
// Query filters: status, type, u_id, date, start_date, end_date, hours
// ─────────────────────────────────────────────
export const getOrdersByBranch = async (req, res) => {
  try {
    const branchId = parseInt(req.params.branchId, 10);
    if (isNaN(branchId) || branchId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid branch ID" });
    }

    const roleId = Number(req.user?.role_id);
    const userBranchId = req.user?.b_id ?? req.user?.B_id;
    const userComId = req.user?.com_id;

    const branchRes = await pool.query(
      `SELECT "B_id", "B_name", "com_id" FROM "Branch" WHERE "B_id" = $1`,
      [branchId],
    );
    if (!branchRes.rows.length) {
      return res.status(404).json({ success: false, error: "Branch not found" });
    }
    const branch = branchRes.rows[0];

    if (roleId === ROLES.ADMIN) {
      if (userComId == null || Number(userComId) !== Number(branch.com_id)) {
        return res.status(403).json({
          success: false,
          error: "You can only view orders of branches in your company.",
        });
      }
    } else if (roleId !== ROLES.SUPER_ADMIN) {
      if (userBranchId == null || Number(userBranchId) !== branchId) {
        return res.status(403).json({
          success: false,
          error: "You can only view orders of your assigned branch.",
        }); 
      }
    }

    // Branch comes from the URL, so ignore any b_id query param
    const { b_id: _ignored, ...query } = req.query;
    const filters = buildOrderFilters(query, 2);
    if (filters.error) {
      return res.status(400).json({ success: false, error: filters.error });
    }
    const conditions = ["o.b_id = $1", ...filters.conditions];
    const values = [branchId, ...filters.values];

    const { rows } = await pool.query(
      `SELECT o.*, p.pay_status
       FROM "ORDER" o
       LEFT JOIN "Payment" p ON p.or_id = o.or_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY o.or_date DESC, o.or_time DESC`,
      values,
    );

    res.status(200).json({
      success: true,
      branch: { b_id: branch.B_id, b_name: branch.B_name, com_id: branch.com_id },
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /orders/company/:companyId — all orders across a company's branches
// Super Admin: any company | Admin: own company only
// Query filters: status, type, b_id, u_id, date, start_date, end_date, hours
// ─────────────────────────────────────────────
export const getOrdersByCompany = async (req, res) => {
  try {
    const companyId = parseInt(req.params.companyId, 10);
    if (isNaN(companyId) || companyId <= 0) {
      return res.status(400).json({ success: false, error: "Invalid company ID" });
    }

    const roleId = Number(req.user?.role_id);
    if (roleId === ROLES.ADMIN) {
      if (req.user?.com_id == null || Number(req.user.com_id) !== companyId) {
        return res.status(403).json({
          success: false,
          error: "You can only view orders of your own company.",
        });
      }
    }

    const companyRes = await pool.query(
      `SELECT "com_id", "com_name" FROM "Company" WHERE "com_id" = $1`,
      [companyId],
    );
    if (!companyRes.rows.length) {
      return res.status(404).json({ success: false, error: "Company not found" });
    }

    const filters = buildOrderFilters(req.query, 2);
    if (filters.error) {
      return res.status(400).json({ success: false, error: filters.error });
    }
    const conditions = [`b."com_id" = $1`, ...filters.conditions];
    const values = [companyId, ...filters.values];

    const { rows } = await pool.query(
      `SELECT o.*, p.pay_status, b."B_name" AS b_name
       FROM "ORDER" o
       JOIN "Branch" b ON b."B_id" = o.b_id
       LEFT JOIN "Payment" p ON p.or_id = o.or_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY o.or_date DESC, o.or_time DESC`,
      values,
    );

    res.status(200).json({
      success: true,
      company: companyRes.rows[0],
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /orders/:id — get one order
// ─────────────────────────────────────────────
export const getOrderById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid order ID" });
    }

    const { rows } = await pool.query(
      `SELECT * FROM "ORDER" WHERE or_id = $1`,
      [id],
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /orders — create new order
// Roles allowed: Cashier (3), Branch Admin (1), Admin (2)
// ─────────────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    // or_tax / or_totalcost / or_totalCostWtax from the client are ignored:
    // the tax rate comes from the company and totals are calculated from the items.
    const {
      or_status = "pending",
      or_type,
      u_id,
      b_id,
      table_id,
      or_notes = null,
      or_addons = null,
      or_addons_price = 0,
      or_allergies = null,
      or_discount_pct = 0,
      or_service_fee = 0,
    } = req.body;

    // ── Required fields ──
    const missing = [];
    if (!or_type) missing.push("or_type");
    if (!u_id) missing.push("u_id");
    if (!b_id) missing.push("b_id");

    if (missing.length) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // ── Enum validation ──
    if (!VALID_TYPES.includes(or_type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid or_type. Use: ${VALID_TYPES.join(" | ")}`,
      });
    }
    if (!VALID_STATUSES.includes(or_status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid or_status. Use: ${VALID_STATUSES.join(" | ")}`,
      });
    }
    // New orders start as pending, or as hold when the cashier parks the order
    if (or_status !== "pending" && or_status !== "hold") {
      return res.status(400).json({
        success: false,
        error: 'New orders must start with status "pending" or "hold"',
      });
    }

    // ── Charge validation (discount %, service fee, add-ons) ──
    const chargeError = validateOrderCharges({ or_discount_pct, or_service_fee, or_addons_price });
    if (chargeError) {
      return res.status(400).json({ success: false, error: chargeError });
    }

    const typeError = validateTypeConstraints(or_type, table_id, req.user?.features);
    if (typeError) {
      return res.status(400).json({ success: false, error: typeError });
    }

    const client = await pool.connect();
    let createdOrder;
    try {
      await client.query("BEGIN");

      // Tax rate is fixed on the order when it is created
      const taxRate = await getBranchTaxRate(client, b_id);

      const { rows } = await client.query(
        `INSERT INTO "ORDER"
           (or_tax, or_totalcost, "or_totalCostWtax", or_status, or_type, u_id, b_id, table_id,
            or_notes, or_addons, or_addons_price, or_allergies, or_discount_pct, or_service_fee)
         VALUES ($1, 0, 0, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING or_id`,
        [
          taxRate,
          or_status,
          or_type,
          u_id,
          b_id,
          table_id ?? null,
          or_notes || null,
          or_addons || null,
          Number(or_addons_price) || 0,
          or_allergies || null,
          Number(or_discount_pct) || 0,
          Number(or_service_fee) || 0,
        ],
      );

      // No items yet — totals start from service fee + add-ons; every item
      // added through /order-items recalculates them.
      createdOrder = await recalculateOrderTotals(client, rows[0].or_id);
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    emitSocketEvent("order:created", createdOrder);

    res.status(201).json({ success: true, data: createdOrder });
  } catch (err) {
    if (err.code === "23514") {
      return res
        .status(400)
        .json({
          success: false,
          error: "Constraint violation: invalid status or type value",
        });
    }
    if (err.code === "23503") {
      return res
        .status(400)
        .json({
          success: false,
          error: "Foreign key violation — check b_id, u_id, table_id",
        });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// PUT /orders/:id — update order (unified)
// ─────────────────────────────────────────────
export const updateOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, error: "Invalid order ID" });
    }

    await client.query("BEGIN");

    // Fetch existing order FOR UPDATE
    const existingResult = await client.query(
      `SELECT * FROM "ORDER" WHERE or_id = $1 FOR UPDATE`,
      [id]
    );
    if (!existingResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    const existing = existingResult.rows[0];

    // Merge incoming data with existing.
    // or_tax / or_totalcost / or_totalCostWtax from the client are ignored —
    // the tax rate stays as fixed at creation and totals are recalculated.
    const or_status = req.body.or_status !== undefined ? req.body.or_status : existing.or_status;
    const or_type = req.body.or_type !== undefined ? req.body.or_type : existing.or_type;
    const u_id = req.body.u_id !== undefined ? req.body.u_id : existing.u_id;
    const b_id = req.body.b_id !== undefined ? req.body.b_id : existing.b_id;
    const table_id = req.body.table_id !== undefined ? req.body.table_id : existing.table_id;
    const or_notes = req.body.or_notes !== undefined ? req.body.or_notes : existing.or_notes;
    const or_addons = req.body.or_addons !== undefined ? req.body.or_addons : existing.or_addons;
    const or_addons_price = req.body.or_addons_price !== undefined ? req.body.or_addons_price : existing.or_addons_price;
    const or_allergies = req.body.or_allergies !== undefined ? req.body.or_allergies : existing.or_allergies;
    const or_discount_pct = req.body.or_discount_pct !== undefined ? req.body.or_discount_pct : existing.or_discount_pct;
    const or_service_fee = req.body.or_service_fee !== undefined ? req.body.or_service_fee : existing.or_service_fee;

    const items = req.body.items; // array or undefined

    // Validation
    if (!VALID_TYPES.includes(or_type)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: `Invalid or_type. Use: ${VALID_TYPES.join(" | ")}` });
    }

    if (or_status !== existing.or_status) {
      const transitionError = validateStatusTransition(existing.or_status, or_status);
      if (transitionError) {
        await client.query("ROLLBACK");
        return res.status(400).json({ success: false, error: transitionError });
      }
    }

    const isCashier = req.user?.role_id === ROLES.CASHIER;
    const isStatusUnchanged = or_status === existing.or_status;
    if (
      existing.or_status === "cancelled" ||
      (existing.or_status === "completed" && !(isCashier && isStatusUnchanged))
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: `Cannot edit a "${existing.or_status}" order` });
    }

    const chargeError = validateOrderCharges({ or_discount_pct, or_service_fee, or_addons_price });
    if (chargeError) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: chargeError });
    }

    const typeError = validateTypeConstraints(or_type, table_id, req.user?.features);
    if (typeError) {
      await client.query("ROLLBACK");
      return res.status(400).json({ success: false, error: typeError });
    }

    // UPDATE ORDER (totals are recalculated below)
    await client.query(
      `UPDATE "ORDER" SET
         or_status = $1, or_type = $2, u_id = $3, b_id = $4,
         table_id = $5, or_notes = $6, or_addons = $7,
         or_addons_price = $8, or_allergies = $9,
         or_discount_pct = $10, or_service_fee = $11
       WHERE or_id = $12`,
      [
        or_status, or_type, u_id, b_id, table_id || null, or_notes || null, or_addons || null,
        Number(or_addons_price) || 0, or_allergies || null,
        Number(or_discount_pct) || 0, Number(or_service_fee) || 0, id
      ]
    );

    // Table transitions
    if (existing.table_id && existing.table_id !== table_id) {
      await client.query(`UPDATE "TABLES" SET table_status = 'available' WHERE table_id = $1`, [existing.table_id]);
      emitSocketEvent(SOCKET_EVENTS.TABLE_UPDATED, { table_id: existing.table_id, table_status: 'available', branch_id: existing.b_id }, { room: `branch-updates` });
    }
    if (table_id && existing.table_id !== table_id) {
      await client.query(`UPDATE "TABLES" SET table_status = 'occupied' WHERE table_id = $1`, [table_id]);
      emitSocketEvent(SOCKET_EVENTS.TABLE_UPDATED, { table_id: table_id, table_status: 'occupied', branch_id: existing.b_id }, { room: `branch-updates` });
    }

    // Item replacements
    if (items !== undefined && Array.isArray(items)) {
      const oldItemsRes = await client.query(
        `SELECT "orderItem_id", "Bpro_id", pro_quantity FROM "ORDER_ITEM" WHERE order_id = $1 FOR UPDATE`,
        [id]
      );
      for (const item of oldItemsRes.rows) {
        const bProduct = await fetchBranchProduct(item.Bpro_id);
        if (bProduct) await adjustStockForOrderItem(client, bProduct, item.pro_quantity, "add");
        await client.query(`DELETE FROM "ORDER_ITEM" WHERE "orderItem_id" = $1`, [item.orderItem_id]);
      }
      for (const item of items) {
        const bProduct = await fetchBranchProduct(item.Bpro_id);
        const productError = checkProductForOrder(bProduct, { b_id });
        if (productError) {
          await client.query("ROLLBACK");
          return res.status(productError.status).json({ success: false, error: productError.error });
        }
        const qty = parseInt(item.qty || item.pro_quantity || 1, 10);
        if (!Number.isInteger(qty) || qty <= 0 || qty > 999) {
          await client.query("ROLLBACK");
          return res.status(400).json({ success: false, error: "Item quantity must be an integer between 1 and 999" });
        }
        // Server-side price — any unit_price sent by the client is ignored
        const price = Number(bProduct.Pro_Price);
        const total_price = round2(price * qty);
        await adjustStockForOrderItem(client, bProduct, qty, "subtract");
        await client.query(
          `INSERT INTO "ORDER_ITEM" ("Bpro_id", pro_quantity, unit_price, total_price, order_id) VALUES ($1, $2, $3, $4, $5)`,
          [item.Bpro_id, qty, price, total_price, id]
        );
      }
    }

    const orderUpdate = { rows: [await recalculateOrderTotals(client, id)] };

    await client.query("COMMIT");

    emitSocketEvent(SOCKET_EVENTS.ORDER_UPDATED, orderUpdate.rows[0]);
    if (orderUpdate.rows[0].or_status === "completed") {
      emitSocketEvent("order:ready", orderUpdate.rows[0]);
    }
    res.status(200).json({ success: true, data: orderUpdate.rows[0] });
  } catch (err) {
    await client.query("ROLLBACK");
    if (err.code === "23514") {
      return res.status(400).json({ success: false, error: "Constraint violation: invalid status or type value" });
    }
    if (err.code === "23503") {
      return res.status(400).json({ success: false, error: "Foreign key violation — check b_id, u_id, table_id" });
    }
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────
// PATCH /orders/:id — partial update
// Roles allowed: Branch Admin (1), Admin (2)
// ─────────────────────────────────────────────
export const patchOrder = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid order ID" });
    }

    // or_tax / or_totalcost / or_totalCostWtax are calculated by the server and can't be patched
    const allowed = [
      "or_status",
      "or_type",
      "u_id",
      "b_id",
      "table_id",
      "or_notes",
      "or_addons",
      "or_addons_price",
      "or_allergies",
      "or_discount_pct",
      "or_service_fee",
    ];

    // Filter to only fields present in the request body
    const incoming = Object.fromEntries(
      allowed
        .filter((k) => req.body[k] !== undefined)
        .map((k) => {
          let val = req.body[k];
          if ((k === "or_notes" || k === "or_addons" || k === "or_allergies") && val === "") {
            val = null;
          }
          return [k, val];
        }),
    );

    if (!Object.keys(incoming).length) {
      return res
        .status(400)
        .json({ success: false, error: "No valid fields to update" });
    }

    // ── Fetch current order ──
    const existing = await pool.query(
      `SELECT * FROM "ORDER" WHERE or_id = $1`,
      [id],
    );
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    const current = existing.rows[0];

    // ── Block editing terminal orders unless only status is being changed ──
    const isOnlyStatusChange =
      Object.keys(incoming).length === 1 && incoming.or_status;
    if (
      !isOnlyStatusChange &&
      (current.or_status === "completed" || current.or_status === "cancelled")
    ) {
      return res.status(400).json({
        success: false,
        error: `Cannot edit a "${current.or_status}" order`,
      });
    }

    // ── Validate type if being changed ──
    const newType = incoming.or_type ?? current.or_type;
    if (incoming.or_type && !VALID_TYPES.includes(incoming.or_type)) {
      return res
        .status(400)
        .json({
          success: false,
          error: `Invalid or_type. Use: ${VALID_TYPES.join(" | ")}`,
        });
    }

    // ── Validate status transition if status is being changed ──
    if (incoming.or_status && incoming.or_status !== current.or_status) {
      const transitionError = validateStatusTransition(
        current.or_status,
        incoming.or_status,
      );
      if (transitionError) {
        return res.status(400).json({ success: false, error: transitionError });
      }
    }

    // ── Validate charges if any is being changed ──
    const chargeError = validateOrderCharges(incoming);
    if (chargeError) {
      return res.status(400).json({ success: false, error: chargeError });
    }
    const chargesChanged = ["or_discount_pct", "or_service_fee", "or_addons_price"].some(
      (k) => k in incoming,
    );

    // ── Type-specific business rules using merged state ──
    const newTableId = incoming.table_id ?? current.table_id;
    const typeError = validateTypeConstraints(newType, newTableId, req.user?.features);
    if (typeError) {
      return res.status(400).json({ success: false, error: typeError });
    }

    // ── Build dynamic UPDATE ──
    const updates = [];
    const values = [];
    let i = 1;

    for (const key of Object.keys(incoming)) {
      const col = key === "or_totalCostWtax" ? `"or_totalCostWtax"` : key;
      updates.push(`${col} = $${i++}`);
      const numericFields = ["or_addons_price", "or_discount_pct", "or_service_fee"];
      values.push(
        numericFields.includes(key) ? parseFloat(incoming[key]) : incoming[key],
      );
    }

    values.push(id);

    let rows;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      ({ rows } = await client.query(
        `UPDATE "ORDER" SET ${updates.join(", ")} WHERE or_id = $${i} RETURNING *`,
        values,
      ));
      // Totals follow the new discount / service fee / add-ons
      if (chargesChanged) rows = [await recalculateOrderTotals(client, id)];
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // Emit real-time update event for order changes
    emitSocketEvent("order:updated", rows[0]);
    if (rows[0].or_status === "completed") {
      emitSocketEvent("order:ready", rows[0]);
    }

    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "23514")
      return res
        .status(400)
        .json({
          success: false,
          error: "Constraint violation: invalid status or type value",
        });
    if (err.code === "23503")
      return res
        .status(400)
        .json({
          success: false,
          error: "Foreign key violation — check b_id, u_id, table_id",
        });
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// PATCH /orders/:id/status — update status only
// Roles allowed: Cashier (3), Branch Admin (1), Admin (2)
// ─────────────────────────────────────────────
export const updateOrderStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid order ID" });
    }

    const { status } = req.body;

    if (!status) {
      return res
        .status(400)
        .json({ success: false, error: "status field is required" });
    }

    // ── Fetch current status ──
    const existing = await pool.query(
      `SELECT or_status FROM "ORDER" WHERE or_id = $1`,
      [id],
    );
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    const currentStatus = existing.rows[0].or_status;

    // ── Guard: no-op update ──
    if (status === currentStatus) {
      return res.status(400).json({
        success: false,
        error: `Order is already "${currentStatus}"`,
      });
    }

    // ── Transition guard ──
    const transitionError = validateStatusTransition(currentStatus, status);
    if (transitionError) {
      return res.status(400).json({ success: false, error: transitionError });
    }

    const client = await pool.connect();
    let updatedOrder;

    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        `UPDATE "ORDER" SET or_status = $1 WHERE or_id = $2 RETURNING *`,
        [status, id],
      );
      updatedOrder = rows[0];

      if (status === "cancelled" && updatedOrder.table_id) {
        await client.query(
          `UPDATE "TABLES" SET table_status = 'available' WHERE table_id = $1`,
          [updatedOrder.table_id]
        );
        emitSocketEvent(SOCKET_EVENTS.TABLE_UPDATED, { table_id: updatedOrder.table_id, table_status: 'available', branch_id: updatedOrder.b_id }, { room: `branch-updates` });
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(500).json({
        success: false,
        error: err.message
      });
    }

    client.release();

    emitSocketEvent(
      "order:updated",
      updatedOrder,
      { room: KITCHEN_SOCKET_ROOM },
    );

    // Resumed from hold → kitchen sees it as a new order
    if (currentStatus === "hold" && status === "pending") {
      emitSocketEvent("order:created", updatedOrder);
    }

    if (status === "completed") {
      emitSocketEvent("order:ready", updatedOrder, {
        room: `branch-updates`,
      });
    }

if (status === "cancelled") {
  emitSocketEvent("order:rejected", updatedOrder, {
    room: getCashierSocketRoom(updatedOrder.u_id),
  });
}

res.status(200).json({ success: true, data: updatedOrder });
  } catch (err) {
    if (err.code === "23514") {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Use: ${VALID_STATUSES.join(" | ")}`,
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /orders/:id — delete order
// Roles allowed: Admin (2) only
// Cannot delete completed or preparing orders
// ─────────────────────────────────────────────
export const deleteOrder = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid order ID" });
    }

    // ── Fetch current order to check status ──
    const existing = await pool.query(
      `SELECT or_status, u_id FROM "ORDER" WHERE or_id = $1`,
      [id],
    );
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const { or_status } = existing.rows[0];

    if (
      req.user?.role_id === ROLES.WAITER &&
      Number(existing.rows[0].u_id) !== Number(req.user.u_id)
    ) {
      return res.status(403).json({
        success: false,
        error: "Waiters can only delete orders created by themselves",
      });
    }

    // ── Business rule: cannot hard-delete active or completed orders ──
    if (or_status === "preparing" || or_status === "completed") {
      return res.status(400).json({
        success: false,
        error: `Cannot delete an order with status "${or_status}". Cancel it first.`,
      });
    }

    const client = await pool.connect();
    let rows;
    try {
      await client.query("BEGIN");

      // Fetch all items in the order to restore their raw materials
      const itemsResult = await client.query(
        `SELECT oi."Bpro_id", oi.pro_quantity, bp.pro_id, bp."B_id", p.product_type
         FROM public."ORDER_ITEM" oi
         JOIN public."Branch_Product" bp ON bp."Bpro_id" = oi."Bpro_id"
         JOIN public."Product" p ON p.pro_id = bp.pro_id
         WHERE oi.order_id = $1`,
        [id]
      );

      for (const item of itemsResult.rows) {
        await adjustStockForOrderItem(client, item, item.pro_quantity, "add");
      }

      await client.query(`DELETE FROM public."ORDER_ITEM" WHERE order_id = $1`, [
        id,
      ]);

      const deleted = await client.query(
        `DELETE FROM "ORDER" WHERE or_id = $1 RETURNING *`,
        [id],
      );
      rows = deleted.rows;
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res
      .status(200)
      .json({
        success: true,
        message: "Order deleted successfully",
        data: rows[0],
      });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";
import {
  emitSocketEvent,
  getCashierSocketRoom,
  KITCHEN_SOCKET_ROOM,
} from "../utils/socket.js";
import { adjustStockForOrderItem } from "./orderItemController.js";


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
const VALID_STATUSES = ["pending", "preparing", "completed", "cancelled"];
const VALID_TYPES = ["dine-in", "takeaway", "delivery"];

// Legal status transitions for a POS system
// Key = current status, Value = allowed next statuses
const STATUS_TRANSITIONS = {
  pending: ["preparing", "cancelled"],
  preparing: ["completed", "cancelled"],
  completed: [], // terminal — no further changes
  cancelled: [], // terminal — no further changes
};

// ─────────────────────────────────────────────
// SHARED VALIDATORS
// ─────────────────────────────────────────────

/**
 * Validates cost fields and business logic relationships.
 * Returns an error string or null if valid.
 */
function validateCosts(or_tax, or_totalcost, or_totalCostWtax) {
  const tax = parseFloat(or_tax);
  const cost = parseFloat(or_totalcost);
  const costWtx = parseFloat(or_totalCostWtax);

  if (isNaN(cost) || cost < 0) {
    return "or_totalcost must be a non-negative number";
  }
  if (isNaN(costWtx) || costWtx < 0) {
    return "or_totalCostWtax must be a non-negative number";
  }
  if (or_tax !== undefined && or_tax !== null) {
    if (isNaN(tax) || tax < 0) {
      return "or_tax must be a number greater than or equal to 0";
    }
  }
  if (costWtx < cost) {
    return "or_totalCostWtax cannot be less than or_totalcost";
  }
  // Sanity check: cost with tax should roughly match (within 1% tolerance for rounding)
  if (or_tax !== undefined && or_tax !== null && !isNaN(tax)) {
    const expected = parseFloat((cost + tax).toFixed(2));
    const diff = Math.abs(expected - costWtx);
    if (diff > 0.05) {
      return `or_totalCostWtax (${costWtx}) does not match or_totalcost + or_tax = ${expected}`;
    }
  }
  return null;
}

/**
 * Validates order type business rules:
 * - delivery → cust_id required
 * Returns an error string or null if valid.
 */
function validateTypeConstraints(or_type, cust_id, table_id) {
  if (or_type === "dine-in" && !table_id) {
    return "table_id is required for dine-in orders";
  }
  if (or_type === "delivery" && !cust_id) {
    return "cust_id is required for delivery orders";
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
    const { status, type, b_id, cust_id, u_id, date } = req.query;

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

    const conditions = [];
    const values = [];
    let i = 1;

    if (status) {
      conditions.push(`or_status = $${i++}`);
      values.push(status);
    }
    if (type) {
      conditions.push(`or_type = $${i++}`);
      values.push(type);
    }
    if (b_id) {
      conditions.push(`b_id = $${i++}`);
      values.push(b_id);
    }
    if (cust_id) {
      conditions.push(`cust_id = $${i++}`);
      values.push(cust_id);
    }
    if (u_id) {
      conditions.push(`u_id = $${i++}`);
      values.push(u_id);
    }
    if (date) {
      conditions.push(`or_date = $${i++}`);
      values.push(date);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT * FROM "ORDER" ${where} ORDER BY or_date DESC, or_time DESC`,
      values,
    );

    res.status(200).json({ success: true, count: rows.length, data: rows });
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
    const {
      or_tax = 0,
      or_totalcost,
      or_totalCostWtax,
      or_status = "pending",
      or_type,
      cust_id,
      u_id,
      b_id,
      table_id,
      or_notes = null,
      or_addons = null,
      or_addons_price = 0,
      or_allergies = null,
    } = req.body;

    // ── Required fields ──
    const missing = [];
    if (or_totalcost === undefined) missing.push("or_totalcost");
    if (or_totalCostWtax === undefined) missing.push("or_totalCostWtax");
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
    // New orders can only start as pending (Cashier restriction)
    if (or_status !== "pending") {
      return res.status(400).json({
        success: false,
        error: 'New orders must start with status "pending"',
      });
    }

    // ── Cost validation ──
    const costError = validateCosts(or_tax, or_totalcost, or_totalCostWtax);
    if (costError) {
      return res.status(400).json({ success: false, error: costError });
    }

    // ── Type-specific business rules ──
    const typeError = validateTypeConstraints(or_type, cust_id, table_id);
    if (typeError) {
      return res.status(400).json({ success: false, error: typeError });
    }

    if (req.user?.role_id === ROLES.WAITER) {
      if (Number(u_id) !== Number(req.user.u_id)) {
        return res.status(403).json({
          success: false,
          error: "Waiters can only create orders under their own user account",
        });
      }
      if (or_type !== "dine-in") {
        return res.status(403).json({
          success: false,
          error: "Waiters can only create dine-in orders",
        });
      }

      const table = await pool.query(
        `SELECT branch_id FROM "TABLES" WHERE table_id = $1`,
        [table_id],
      );
      if (!table.rows.length) {
        return res.status(404).json({
          success: false,
          error: "Table not found",
        });
      }
      if (Number(table.rows[0].branch_id) !== Number(b_id)) {
        return res.status(403).json({
          success: false,
          error: "Order branch must match the selected table branch",
        });
      }

      const today = new Date().toISOString().split("T")[0];
      const assigned = await pool.query(
        `SELECT assign_id
         FROM "TABLE_ASSIGNMENT"
         WHERE u_id = $1 AND table_id = $2 AND assigned_date = $3
         LIMIT 1`,
        [req.user.u_id, table_id, today],
      );
      if (!assigned.rows.length) {
        return res.status(403).json({
          success: false,
          error: "Waiters can only create orders for tables assigned to them today",
        });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO "ORDER"
         (or_tax, or_totalcost, "or_totalCostWtax", or_status, or_type, cust_id, u_id, b_id, table_id, or_notes, or_addons, or_addons_price, or_allergies)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        parseFloat(or_tax),
        parseFloat(or_totalcost),
        parseFloat(or_totalCostWtax),
        or_status,
        or_type,
        cust_id ?? null,
        u_id,
        b_id,
        table_id ?? null,
        or_notes,
        or_addons,
        parseFloat(or_addons_price),
        or_allergies,
      ],
    );

    emitSocketEvent("order:created", rows[0]);

    res.status(201).json({ success: true, data: rows[0] });
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
          error: "Foreign key violation — check b_id, u_id, cust_id, table_id",
        });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// PUT /orders/:id — full update
// Roles allowed: Branch Admin (1), Admin (2)
// ─────────────────────────────────────────────
export const updateOrder = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid order ID" });
    }

    const {
      or_tax,
      or_totalcost,
      or_totalCostWtax,
      or_status,
      or_type,
      cust_id,
      u_id,
      b_id,
      table_id,
      or_notes = null,
      or_addons = null,
      or_addons_price = 0,
      or_allergies = null,
    } = req.body;

    // ── Required fields for full update ──
    const missing = [];
    if (or_tax === undefined) missing.push("or_tax");
    if (or_totalcost === undefined) missing.push("or_totalcost");
    if (or_totalCostWtax === undefined) missing.push("or_totalCostWtax");
    if (!or_status) missing.push("or_status");
    if (!or_type) missing.push("or_type");
    if (!u_id) missing.push("u_id");
    if (!b_id) missing.push("b_id");

    if (missing.length) {
      return res.status(400).json({
        success: false,
        error: `Missing required fields for full update: ${missing.join(", ")}`,
      });
    }

    // ── Fetch current order to validate status transition ──
    const existing = await pool.query(
      `SELECT or_status FROM "ORDER" WHERE or_id = $1`,
      [id],
    );
    if (!existing.rows.length) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    const currentStatus = existing.rows[0].or_status;

    // ── Enum validation ──
    if (!VALID_TYPES.includes(or_type)) {
      return res
        .status(400)
        .json({
          success: false,
          error: `Invalid or_type. Use: ${VALID_TYPES.join(" | ")}`,
        });
    }

    // ── Status transition guard ──
    if (or_status !== currentStatus) {
      const transitionError = validateStatusTransition(
        currentStatus,
        or_status,
      );
      if (transitionError) {
        return res.status(400).json({ success: false, error: transitionError });
      }
    }

    // ── Block editing terminal orders (completed / cancelled) ──
    const isCashier = req.user?.role_id === ROLES.CASHIER;
    const isStatusUnchanged = or_status === currentStatus;
    if (
      currentStatus === "cancelled" ||
      (currentStatus === "completed" && !(isCashier && isStatusUnchanged))
    ) {
      return res.status(400).json({
        success: false,
        error: `Cannot edit a "${currentStatus}" order`,
      });
    }

    // ── Cost validation ──
    const costError = validateCosts(or_tax, or_totalcost, or_totalCostWtax);
    if (costError) {
      return res.status(400).json({ success: false, error: costError });
    }

    // ── Type-specific business rules ──
    const typeError = validateTypeConstraints(or_type, cust_id, table_id);
    if (typeError) {
      return res.status(400).json({ success: false, error: typeError });
    }

    const { rows } = await pool.query(
      `UPDATE "ORDER" SET
         or_tax             = $1,
         or_totalcost       = $2,
         "or_totalCostWtax" = $3,
         or_status          = $4,
         or_type            = $5,
         cust_id            = $6,
         u_id               = $7,
         b_id               = $8,
         table_id           = $9,
         or_notes           = $10,
         or_addons          = $11,
         or_addons_price    = $12,
         or_allergies       = $13
       WHERE or_id = $14
       RETURNING *`,
      [
        parseFloat(or_tax),
        parseFloat(or_totalcost),
        parseFloat(or_totalCostWtax),
        or_status,
        or_type,
        cust_id ?? null,
        u_id,
        b_id,
        table_id ?? null,
        or_notes,
        or_addons,
        parseFloat(or_addons_price),
        or_allergies,
        id,
      ],
    );

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
          error: "Foreign key violation — check b_id, u_id, cust_id, table_id",
        });
    res.status(500).json({ success: false, error: err.message });
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

    const allowed = [
      "or_tax",
      "or_totalcost",
      "or_totalCostWtax",
      "or_status",
      "or_type",
      "cust_id",
      "u_id",
      "b_id",
      "table_id",
      "or_notes",
      "or_addons",
      "or_addons_price",
      "or_allergies",
    ];

    // Filter to only fields present in the request body
    const incoming = Object.fromEntries(
      allowed
        .filter((k) => req.body[k] !== undefined)
        .map((k) => [k, req.body[k]]),
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

    // ── Validate costs if any cost field is being changed ──
    const hasCostField = ["or_tax", "or_totalcost", "or_totalCostWtax"].some(
      (k) => k in incoming,
    );
    if (hasCostField) {
      const merged = {
        or_tax: incoming.or_tax ?? current.or_tax,
        or_totalcost: incoming.or_totalcost ?? current.or_totalcost,
        or_totalCostWtax: incoming.or_totalCostWtax ?? current.or_totalCostWtax,
      };
      const costError = validateCosts(
        merged.or_tax,
        merged.or_totalcost,
        merged.or_totalCostWtax,
      );
      if (costError) {
        return res.status(400).json({ success: false, error: costError });
      }
    }

    // ── Type-specific business rules using merged state ──
    const newCustId = incoming.cust_id ?? current.cust_id;
    const newTableId = incoming.table_id ?? current.table_id;
    const typeError = validateTypeConstraints(newType, newCustId, newTableId);
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
      const numericFields = ["or_tax", "or_totalcost", "or_totalCostWtax", "or_addons_price"];
      values.push(
        numericFields.includes(key) ? parseFloat(incoming[key]) : incoming[key],
      );
    }

    values.push(id);

    const { rows } = await pool.query(
      `UPDATE "ORDER" SET ${updates.join(", ")} WHERE or_id = $${i} RETURNING *`,
      values,
    );

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
          error: "Foreign key violation — check b_id, u_id, cust_id, table_id",
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

      // ── When Kitchen ACCEPTS order → deduct raw material ingredients (made_to_order only) ──
      if (status === "preparing") {
        // Get all made_to_order items in this order
        const orderItems = await client.query(
          `SELECT oi."Bpro_id", oi.pro_quantity, bp."pro_id", bp."B_id"
       FROM public."ORDER_ITEM" oi
       JOIN public."Branch_Product" bp ON bp."Bpro_id" = oi."Bpro_id"
       JOIN public."Product" p ON p.pro_id = bp.pro_id
       WHERE oi.order_id = $1
         AND p.product_type = 'made_to_order'`,
          [id]
        );

        for (const item of orderItems.rows) {
          const { pro_id, pro_quantity, B_id } = item;

          // Get recipe ingredients for this product
          const recipes = await client.query(
            `SELECT r."rawmaterial_ID", r."quantity_req",
                COALESCE(r."unit", rm."unit") AS recipe_unit,
                rm."unit" AS stock_unit
         FROM public."RECIPE" r
         JOIN public."Raw_Material" rm 
           ON rm."rm_id" = r."rawmaterial_ID"
         WHERE r."pro_id" = $1`,
            [pro_id]
          );

          for (const recipe of recipes.rows) {
            const rawQty = recipe.quantity_req * pro_quantity;
            const convertedQty = convertRecipeQty(
              rawQty,
              recipe.recipe_unit,
              recipe.stock_unit
            );

            await client.query(
              `UPDATE public."Raw_Material"
           SET stock_qty = GREATEST(0, stock_qty - $1)
           WHERE rm_id = $2`,
              [convertedQty, recipe.rawmaterial_ID]
            );
          }
        }
      }

      // ── When order is CANCELLED after kitchen accepted → restore raw material ingredients ──
      if (status === "cancelled" && currentStatus === "preparing") {
        const orderItems = await client.query(
          `SELECT oi."Bpro_id", oi.pro_quantity, bp."pro_id", bp."B_id"
       FROM public."ORDER_ITEM" oi
       JOIN public."Branch_Product" bp ON bp."Bpro_id" = oi."Bpro_id"
       JOIN public."Product" p ON p.pro_id = bp.pro_id
       WHERE oi.order_id = $1
         AND p.product_type = 'made_to_order'`,
          [id]
        );

        for (const item of orderItems.rows) {
          const { pro_id, pro_quantity } = item;

          const recipes = await client.query(
            `SELECT r."rawmaterial_ID", r."quantity_req",
                COALESCE(r."unit", rm."unit") AS recipe_unit,
                rm."unit" AS stock_unit
         FROM public."RECIPE" r
         JOIN public."Raw_Material" rm 
           ON rm."rm_id" = r."rawmaterial_ID"
         WHERE r."pro_id" = $1`,
            [pro_id]
          );

          for (const recipe of recipes.rows) {
            const rawQty = recipe.quantity_req * pro_quantity;
            const convertedQty = convertRecipeQty(
              rawQty,
              recipe.recipe_unit,
              recipe.stock_unit
            );

            await client.query(
              `UPDATE public."Raw_Material"
           SET stock_qty = stock_qty + $1
           WHERE rm_id = $2`,
              [convertedQty, recipe.rawmaterial_ID]
            );
          }
        }
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

    if (status === "completed") {
      emitSocketEvent("order:ready", updatedOrder, {
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
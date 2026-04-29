import pool from "../config/database.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const MAX_NAME_LENGTH = 120;
const MAX_UNIT_LENGTH = 20;

const VALID_UNITS = [
  "kg",
  "g",
  "mg",
  "l",
  "ml",
  "pcs",
  "units",
  "dozen",
  "box",
  "pack",
  "bag",
  "bottle",
  "can",
];

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`${fieldName} must be a positive integer`), {
      status: 400,
    });
  }
  return parsed;
}

function parseNonNegativeDecimal(value, fieldName) {
  const parsed = parseFloat(value);
  if (isNaN(parsed) || parsed < 0) {
    throw Object.assign(
      new Error(`${fieldName} must be a non-negative number`),
      { status: 400 },
    );
  }
  return parseFloat(parsed.toFixed(3));
}

function sanitizeBody(body, allowedFields) {
  const sanitized = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      sanitized[field] =
        typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  }
  return sanitized;
}

// ─── NEW: shared name validator ───────────────────────────────────────────────
function validateName(rm_name) {
  if (typeof rm_name !== "string") {
    throw Object.assign(new Error("rm_name must be a string"), { status: 400 });
  }
  if (rm_name.length === 0) {
    throw Object.assign(new Error("rm_name cannot be empty"), { status: 400 });
  }
  if (rm_name.length > MAX_NAME_LENGTH) {
    throw Object.assign(
      new Error(`rm_name cannot exceed ${MAX_NAME_LENGTH} characters`),
      { status: 400 },
    );
  }
  // ── NEW: block special characters — name should be alphanumeric + spaces/hyphens only
  if (!/^[\w\s\-().&/]+$/.test(rm_name)) {
    throw Object.assign(new Error("rm_name contains invalid characters"), {
      status: 400,
    });
  }
}

// ─── GET /api/raw-materials ──────────────────────────────────────────────────
export async function getRawMaterials(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT rm_id, rm_name, unit, stock_qty, record_level,
              CASE WHEN stock_qty <= record_level THEN true ELSE false END AS low_stock
       FROM "Raw_Material"
       ORDER BY rm_name ASC`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/raw-materials/low-stock ────────────────────────────────────────
export async function getLowStockMaterials(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT rm_id, rm_name, unit, stock_qty, record_level,
              (record_level - stock_qty) AS shortage_qty
       FROM "Raw_Material"
       WHERE stock_qty <= record_level
       ORDER BY shortage_qty DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/raw-materials/:id ──────────────────────────────────────────────
export async function getRawMaterialById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "rm_id");

    const result = await pool.query(
      `SELECT rm_id, rm_name, unit, stock_qty, record_level,
              CASE WHEN stock_qty <= record_level THEN true ELSE false END AS low_stock
       FROM "Raw_Material"
       WHERE rm_id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Raw material not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/raw-materials ──────────────────────────────────────────────────
export async function createRawMaterial(req, res, next) {
  try {
    // ── NEW: body must be an object, not an array or null ──
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      res.status(400);
      throw new Error("Request body must be a JSON object");
    }

    const body = sanitizeBody(req.body, [
      "rm_name",
      "unit",
      "stock_qty",
      "record_level",
    ]);

    const { rm_name, unit, stock_qty, record_level } = body;

    // ── Required fields ──
    if (!rm_name || !unit) {
      res.status(400);
      throw new Error("rm_name and unit are required");
    }

    // ── Name validation (shared helper) ──
    validateName(rm_name);

    // ── Unit validation ──
    if (typeof unit !== "string") {
      res.status(400);
      throw new Error("unit must be a string");
    }
    const unitLower = unit.toLowerCase();
    if (!VALID_UNITS.includes(unitLower)) {
      res.status(400);
      throw new Error(`unit must be one of: ${VALID_UNITS.join(", ")}`);
    }

    // ── Numeric validation ──
    const stockQty =
      stock_qty !== undefined
        ? parseNonNegativeDecimal(stock_qty, "stock_qty")
        : 0;
    const recordLevel =
      record_level !== undefined
        ? parseNonNegativeDecimal(record_level, "record_level")
        : 0;

    // ── NEW: stock_qty and record_level must be numbers, not strings ──
    if (stock_qty !== undefined && typeof stock_qty === "boolean") {
      res.status(400);
      throw new Error("stock_qty must be a number");
    }
    if (record_level !== undefined && typeof record_level === "boolean") {
      res.status(400);
      throw new Error("record_level must be a number");
    }

    // ── NEW: cap at DB column max NUMERIC(10,3) ──
    if (stockQty > 9999999.999) {
      res.status(400);
      throw new Error("stock_qty value is unrealistically high");
    }
    if (recordLevel > 99999.999) {
      res.status(400);
      throw new Error("record_level value is unrealistically high");
    }

    // ── NEW: reorder level sanity — should not exceed stock ──
    if (recordLevel > stockQty && stockQty > 0) {
      res.status(400);
      throw new Error(
        "record_level (reorder point) should not exceed the initial stock_qty",
      );
    }

    // ── Duplicate name check ──
    const dupCheck = await pool.query(
      'SELECT rm_id FROM "Raw_Material" WHERE LOWER(rm_name) = LOWER($1)',
      [rm_name],
    );
    if (dupCheck.rows.length > 0) {
      res.status(409);
      throw new Error(`A raw material named "${rm_name}" already exists`);
    }

    const result = await pool.query(
      `INSERT INTO "Raw_Material" (rm_name, unit, stock_qty, record_level)
       VALUES ($1, $2, $3, $4)
       RETURNING rm_id, rm_name, unit, stock_qty, record_level`,
      [rm_name, unitLower, stockQty, recordLevel],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/raw-materials/:id ───────────────────────────────────────────────
export async function updateRawMaterial(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "rm_id");

    // ── NEW: reject empty body ──
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      res.status(400);
      throw new Error("Request body must be a JSON object");
    }

    const body = sanitizeBody(req.body, [
      "rm_name",
      "unit",
      "stock_qty",
      "record_level",
    ]);

    // ── NEW: at least one field required ──
    if (Object.keys(body).length === 0) {
      res.status(400);
      throw new Error("No valid fields provided to update");
    }

    const { rm_name, unit, stock_qty, record_level } = body;

    // ── Existence check ──
    const existing = await pool.query(
      'SELECT rm_id, rm_name FROM "Raw_Material" WHERE rm_id = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Raw material not found");
    }

    // ── Name validation ──
    if (rm_name !== undefined) {
      validateName(rm_name);

      const dupCheck = await pool.query(
        'SELECT rm_id FROM "Raw_Material" WHERE LOWER(rm_name) = LOWER($1) AND rm_id <> $2',
        [rm_name, id],
      );
      if (dupCheck.rows.length > 0) {
        res.status(409);
        throw new Error(`A raw material named "${rm_name}" already exists`);
      }
    }

    // ── Unit validation ──
    let unitLower = null;
    if (unit !== undefined) {
      if (typeof unit !== "string") {
        res.status(400);
        throw new Error("unit must be a string");
      }
      unitLower = unit.toLowerCase();
      if (!VALID_UNITS.includes(unitLower)) {
        res.status(400);
        throw new Error(`unit must be one of: ${VALID_UNITS.join(", ")}`);
      }
    }

    // ── Numeric validation ──
    let stockQty = null;
    let recordLevel = null;

    if (stock_qty !== undefined) {
      if (typeof stock_qty === "boolean") {
        res.status(400);
        throw new Error("stock_qty must be a number");
      }
      stockQty = parseNonNegativeDecimal(stock_qty, "stock_qty");
      if (stockQty > 9999999.999) {
        res.status(400);
        throw new Error("stock_qty value is unrealistically high");
      }
    }

    if (record_level !== undefined) {
      if (typeof record_level === "boolean") {
        res.status(400);
        throw new Error("record_level must be a number");
      }
      recordLevel = parseNonNegativeDecimal(record_level, "record_level");
      if (recordLevel > 99999.999) {
        res.status(400);
        throw new Error("record_level value is unrealistically high");
      }
    }

    // ── NEW: if both are provided, reorder level should not exceed stock ──
    if (
      stockQty !== null &&
      recordLevel !== null &&
      recordLevel > stockQty &&
      stockQty > 0
    ) {
      res.status(400);
      throw new Error(
        "record_level (reorder point) should not exceed stock_qty",
      );
    }

    const result = await pool.query(
      `UPDATE "Raw_Material"
       SET
         rm_name      = COALESCE($1, rm_name),
         unit         = COALESCE($2, unit),
         stock_qty    = COALESCE($3, stock_qty),
         record_level = COALESCE($4, record_level)
       WHERE rm_id = $5
       RETURNING rm_id, rm_name, unit, stock_qty, record_level,
                 CASE WHEN stock_qty <= record_level THEN true ELSE false END AS low_stock`,
      [rm_name ?? null, unitLower, stockQty, recordLevel, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/raw-materials/:id/stock ───────────────────────────────────────
export async function adjustStock(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "rm_id");

    // ── NEW: body guard ──
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      res.status(400);
      throw new Error("Request body must be a JSON object");
    }

    const body = sanitizeBody(req.body, ["adjustment", "operation"]);
    const { adjustment, operation } = body;

    if (adjustment === undefined || !operation) {
      res.status(400);
      throw new Error(
        "adjustment (number) and operation ('add' or 'subtract') are required",
      );
    }

    // ── NEW: operation type guard ──
    if (typeof operation !== "string") {
      res.status(400);
      throw new Error("operation must be a string: 'add' or 'subtract'");
    }
    if (!["add", "subtract"].includes(operation.toLowerCase())) {
      res.status(400);
      throw new Error("operation must be 'add' or 'subtract'");
    }

    // ── NEW: boolean guard — parseFloat(true) = 1, which is misleading ──
    if (typeof adjustment === "boolean") {
      res.status(400);
      throw new Error("adjustment must be a number");
    }

    const adjValue = parseFloat(adjustment);
    if (isNaN(adjValue) || adjValue <= 0) {
      res.status(400);
      throw new Error("adjustment must be a positive number");
    }

    // ── NEW: cap unrealistically large adjustments ──
    if (adjValue > 9999999.999) {
      res.status(400);
      throw new Error("adjustment value is unrealistically high");
    }

    const adjRounded = parseFloat(adjValue.toFixed(3));

    const existing = await pool.query(
      'SELECT rm_id, rm_name, stock_qty, record_level, unit FROM "Raw_Material" WHERE rm_id = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Raw material not found");
    }

    const current = existing.rows[0];

    if (operation === "subtract") {
      const currentQty = parseFloat(current.stock_qty);
      if (adjRounded > currentQty) {
        res.status(409);
        throw new Error(
          `Cannot subtract ${adjRounded} ${current.unit} — only ${currentQty} ${current.unit} in stock`,
        );
      }
    }

    const operator = operation === "add" ? "+" : "-";

    const result = await pool.query(
      `UPDATE "Raw_Material"
       SET stock_qty = stock_qty ${operator} $1
       WHERE rm_id = $2
       RETURNING rm_id, rm_name, unit, stock_qty, record_level,
                 CASE WHEN stock_qty <= record_level THEN true ELSE false END AS low_stock`,
      [adjRounded, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/raw-materials/:id ────────────────────────────────────────────
export async function deleteRawMaterial(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "rm_id");

    const stockCheck = await pool.query(
      'SELECT stock_qty FROM "Raw_Material" WHERE rm_id = $1',
      [id],
    );
    if (stockCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Raw material not found");
    }
    if (parseFloat(stockCheck.rows[0].stock_qty) > 0) {
      res.status(409);
      throw new Error(
        "Cannot delete raw material while it still has stock. Set stock to 0 first.",
      );
    }

    await pool.query(
      'DELETE FROM "Raw_Material" WHERE rm_id = $1 RETURNING rm_id',
      [id],
    );

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(409);
      return next(
        new Error("Cannot delete raw material because it is used in recipes"),
      );
    }
    next(err);
  }
}

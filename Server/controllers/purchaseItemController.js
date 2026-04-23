import pool from "../config/database.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`${fieldName} must be a positive integer`), {
      status: 400,
    });
  }
  return parsed;
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

function parsePositiveDecimal(value, fieldName) {
  const parsed = Number(value);
  if (isNaN(parsed) || parsed <= 0) {
    throw Object.assign(
      new Error(`${fieldName} must be a positive number`),
      { status: 400 },
    );
  }
  return parsed;
}

const MAX_QTY        = 100_000;
const MAX_UNIT_PRICE = 999_999.99;

// ─── GET /api/purchase-items ──────────────────────────────────────────────────
export async function getPurchaseItems(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         pi.pi_id,
         pi.qty,
         pi.price,
         pi.unit_price,
         po.po_id,
         po.status      AS order_status,
         po.order_date,
         rm.rm_id,
         rm.rm_name,
         rm.unit        AS rm_unit
       FROM purchase_item pi
       JOIN purchase_order po ON po.po_id = pi.po_id
       JOIN "Raw_Material" rm ON rm.rm_id = pi.rm_id
       ORDER BY pi.pi_id ASC`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/purchase-orders/:orderId/items ──────────────────────────────────
export async function getPurchaseItemsByOrder(req, res, next) {
  try {
    const orderId = parsePositiveInt(req.params.orderId, "po_id");

    const orderCheck = await pool.query(
      `SELECT po_id FROM purchase_order WHERE po_id = $1`,
      [orderId],
    );
    if (orderCheck.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase order not found");
    }

    const result = await pool.query(
      `SELECT
         pi.pi_id,
         pi.qty,
         pi.price,
         pi.unit_price,
         rm.rm_id,
         rm.rm_name,
         rm.unit AS rm_unit
       FROM purchase_item pi
       JOIN "Raw_Material" rm ON rm.rm_id = pi.rm_id
       WHERE pi.po_id = $1
       ORDER BY pi.pi_id ASC`,
      [orderId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/purchase-items/:id ──────────────────────────────────────────────
export async function getPurchaseItemById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "pi_id");

    const result = await pool.query(
      `SELECT
         pi.pi_id,
         pi.qty,
         pi.price,
         pi.unit_price,
         po.po_id,
         po.status      AS order_status,
         po.order_date,
         rm.rm_id,
         rm.rm_name,
         rm.unit        AS rm_unit
       FROM purchase_item pi
       JOIN purchase_order po ON po.po_id = pi.po_id
       JOIN "Raw_Material" rm ON rm.rm_id = pi.rm_id
       WHERE pi.pi_id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase item not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/purchase-items ─────────────────────────────────────────────────
export async function createPurchaseItem(req, res, next) {
  try {
    const body = sanitizeBody(req.body, [
      "po_id",
      "rm_id",
      "qty",
      "price",
      "unit_price",
    ]);

    const { po_id, rm_id, qty, price, unit_price } = body;

    // ── Required fields ──
    if (
      po_id      === undefined ||
      rm_id      === undefined ||
      qty        === undefined ||
      price      === undefined ||
      unit_price === undefined
    ) {
      res.status(400);
      throw new Error("po_id, rm_id, qty, price and unit_price are required");
    }

    const parsedPoId      = parsePositiveInt(po_id,      "po_id");
    const parsedRmId      = parsePositiveInt(rm_id,      "rm_id");
    const parsedQty       = parsePositiveDecimal(qty,        "qty");
    const parsedPrice     = parsePositiveDecimal(price,      "price");
    const parsedUnitPrice = parsePositiveDecimal(unit_price, "unit_price");

    if (parsedQty > MAX_QTY) {
      res.status(400);
      throw new Error(`qty cannot exceed ${MAX_QTY.toLocaleString()}`);
    }
    if (parsedUnitPrice > MAX_UNIT_PRICE) {
      res.status(400);
      throw new Error(`unit_price cannot exceed ${MAX_UNIT_PRICE.toLocaleString()}`);
    }

    // ── price must match qty × unit_price (±0.05 rounding tolerance) ──
    const expectedPrice = parsedQty * parsedUnitPrice;
    if (Math.abs(parsedPrice - expectedPrice) > 0.05) {
      res.status(400);
      throw new Error(
        `price (${parsedPrice}) does not match qty × unit_price (${expectedPrice.toFixed(2)})`,
      );
    }

    // ── Purchase order existence & status check ──
    const orderCheck = await pool.query(
      `SELECT po_id, status FROM purchase_order WHERE po_id = $1`,
      [parsedPoId],
    );
    if (orderCheck.rows.length === 0) {
      res.status(404);
      throw new Error(`Purchase order with id ${parsedPoId} not found`);
    }
    if (orderCheck.rows[0].status === "received") {
      res.status(409);
      throw new Error(
        "Cannot add items to a purchase order that has already been received",
      );
    }

    // ── Raw material existence check ──
    const rmCheck = await pool.query(
      `SELECT rm_id FROM "Raw_Material" WHERE rm_id = $1`,
      [parsedRmId],
    );
    if (rmCheck.rows.length === 0) {
      res.status(404);
      throw new Error(`Raw material with id ${parsedRmId} not found`);
    }

    // ── Duplicate raw material in same order ──
    const dupItem = await pool.query(
      `SELECT pi_id FROM purchase_item WHERE po_id = $1 AND rm_id = $2`,
      [parsedPoId, parsedRmId],
    );
    if (dupItem.rows.length > 0) {
      res.status(409);
      throw new Error(
        "This raw material is already listed in the purchase order — update the existing item instead",
      );
    }

    const result = await pool.query(
      `INSERT INTO purchase_item (po_id, rm_id, qty, price, unit_price)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING pi_id, po_id, rm_id, qty, price, unit_price`,
      [parsedPoId, parsedRmId, parsedQty, parsedPrice, parsedUnitPrice],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/purchase-items/:id ──────────────────────────────────────────────
export async function updatePurchaseItem(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "pi_id");

    const body = sanitizeBody(req.body, [
      "po_id",
      "rm_id",
      "qty",
      "price",
      "unit_price",
    ]);

    if (Object.keys(body).length === 0) {
      res.status(400);
      throw new Error("No fields provided to update");
    }

    const { po_id, rm_id, qty, price, unit_price } = body;

    // ── Existence check ──
    const existing = await pool.query(
      `SELECT pi.pi_id, pi.po_id, pi.rm_id, pi.qty, pi.unit_price, po.status AS order_status
       FROM purchase_item pi
       JOIN purchase_order po ON po.po_id = pi.po_id
       WHERE pi.pi_id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase item not found");
    }

    const current = existing.rows[0];

    // ── Cannot edit items on a received order ──
    if (current.order_status === "received") {
      res.status(409);
      throw new Error(
        "Cannot edit items on a purchase order that has already been received",
      );
    }

    // ── FK validations ──
    if (po_id !== undefined) {
      const parsedPoId = parsePositiveInt(po_id, "po_id");
      const orderCheck = await pool.query(
        `SELECT po_id, status FROM purchase_order WHERE po_id = $1`,
        [parsedPoId],
      );
      if (orderCheck.rows.length === 0) {
        res.status(404);
        throw new Error(`Purchase order with id ${parsedPoId} not found`);
      }
      if (orderCheck.rows[0].status === "received") {
        res.status(409);
        throw new Error("Cannot move item to a received purchase order");
      }
    }

    if (rm_id !== undefined) {
      const parsedRmId = parsePositiveInt(rm_id, "rm_id");
      const rmCheck = await pool.query(
        `SELECT rm_id FROM "Raw_Material" WHERE rm_id = $1`,
        [parsedRmId],
      );
      if (rmCheck.rows.length === 0) {
        res.status(404);
        throw new Error(`Raw material with id ${parsedRmId} not found`);
      }

      const resolvedPoId = po_id ? Number(po_id) : current.po_id;
      const dupItem = await pool.query(
        `SELECT pi_id FROM purchase_item
         WHERE po_id = $1 AND rm_id = $2 AND pi_id <> $3`,
        [resolvedPoId, parsedRmId, id],
      );
      if (dupItem.rows.length > 0) {
        res.status(409);
        throw new Error(
          "This raw material is already listed in the purchase order",
        );
      }
    }

    // ── Numeric validations ──
    const parsedQty       = qty        !== undefined ? parsePositiveDecimal(qty,        "qty")        : null;
    const parsedUnitPrice = unit_price !== undefined ? parsePositiveDecimal(unit_price, "unit_price") : null;
    const parsedPrice     = price      !== undefined ? parsePositiveDecimal(price,      "price")      : null;

    if (parsedQty !== null && parsedQty > MAX_QTY) {
      res.status(400);
      throw new Error(`qty cannot exceed ${MAX_QTY.toLocaleString()}`);
    }
    if (parsedUnitPrice !== null && parsedUnitPrice > MAX_UNIT_PRICE) {
      res.status(400);
      throw new Error(`unit_price cannot exceed ${MAX_UNIT_PRICE.toLocaleString()}`);
    }

    // ── Price consistency check ──
    const resolvedQty       = parsedQty       ?? Number(current.qty);
    const resolvedUnitPrice = parsedUnitPrice ?? Number(current.unit_price);
    if (parsedPrice !== null) {
      const expectedPrice = resolvedQty * resolvedUnitPrice;
      if (Math.abs(parsedPrice - expectedPrice) > 0.05) {
        res.status(400);
        throw new Error(
          `price (${parsedPrice}) does not match qty × unit_price (${expectedPrice.toFixed(2)})`,
        );
      }
    }

    const result = await pool.query(
      `UPDATE purchase_item
       SET
         po_id      = COALESCE($1, po_id),
         rm_id      = COALESCE($2, rm_id),
         qty        = COALESCE($3, qty),
         price      = COALESCE($4, price),
         unit_price = COALESCE($5, unit_price)
       WHERE pi_id = $6
       RETURNING pi_id, po_id, rm_id, qty, price, unit_price`,
      [
        po_id      ? Number(po_id) : null,
        rm_id      ? Number(rm_id) : null,
        parsedQty       ?? null,
        parsedPrice     ?? null,
        parsedUnitPrice ?? null,
        id,
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/purchase-items/:id ───────────────────────────────────────────
export async function deletePurchaseItem(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "pi_id");

    const existing = await pool.query(
      `SELECT pi.pi_id, po.status AS order_status
       FROM purchase_item pi
       JOIN purchase_order po ON po.po_id = pi.po_id
       WHERE pi.pi_id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase item not found");
    }

    if (existing.rows[0].order_status === "received") {
      res.status(409);
      throw new Error(
        "Cannot delete items from a purchase order that has already been received",
      );
    }

    await pool.query(`DELETE FROM purchase_item WHERE pi_id = $1`, [id]);

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
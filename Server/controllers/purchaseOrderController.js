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

const VALID_STATUSES = ["pending", "received"];

// ─── GET /api/purchase-orders ─────────────────────────────────────────────────
export async function getPurchaseOrders(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         po.po_id,
         po.status,
         po.order_date,
         po.received_date,
         s.sup_id,
         s.sup_name,
         s.sup_contact,
         b."B_id",
         b."B_name"
       FROM purchase_order po
       JOIN "SUPPLIER" s ON s.sup_id = po.sup_id
       JOIN "Branch"   b ON b."B_id" = po.b_id
       ORDER BY po.order_date DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/purchase-orders/supplier/:supId ────────────────────────────────
export async function getPurchaseOrdersBySupplier(req, res, next) {
  try {
    const supId = parsePositiveInt(req.params.supId, "sup_id");

    const supCheck = await pool.query(
      `SELECT sup_id FROM "SUPPLIER" WHERE sup_id = $1`,
      [supId],
    );
    if (supCheck.rows.length === 0) {
      res.status(404);
      throw new Error(`Supplier with id ${supId} not found`);
    }

    const result = await pool.query(
      `SELECT
         po.po_id,
         po.status,
         po.order_date,
         po.received_date,
         s.sup_id,
         s.sup_name,
         s.sup_contact,
         b."B_id",
         b."B_name"
       FROM purchase_order po
       JOIN "SUPPLIER" s ON s.sup_id = po.sup_id
       JOIN "Branch"   b ON b."B_id" = po.b_id
       WHERE po.sup_id = $1
       ORDER BY po.order_date DESC`,
      [supId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/purchase-orders/:id ─────────────────────────────────────────────
export async function getPurchaseOrderById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "po_id");

    const result = await pool.query(
      `SELECT
         po.po_id,
         po.status,
         po.order_date,
         po.received_date,
         s.sup_id,
         s.sup_name,
         s.sup_contact,
         b."B_id",
         b."B_name"
       FROM purchase_order po
       JOIN "SUPPLIER" s ON s.sup_id = po.sup_id
       JOIN "Branch"   b ON b."B_id" = po.b_id
       WHERE po.po_id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase order not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/purchase-orders ────────────────────────────────────────────────
export async function createPurchaseOrder(req, res, next) {
  try {
    const body = sanitizeBody(req.body, [
      "sup_id",
      "B_id",
      "status",
      "order_date",
      "received_date",
    ]);

    const { sup_id, B_id, status, order_date, received_date } = body;

    // ── Required fields ──
    if (sup_id === undefined || B_id === undefined) {
      res.status(400);
      throw new Error("sup_id and B_id are required");
    }

    const parsedSupId = parsePositiveInt(sup_id, "sup_id");
    const parsedBId   = parsePositiveInt(B_id,   "B_id");

    // ── Status validation ──
    const resolvedStatus = status ?? "pending";
    if (!VALID_STATUSES.includes(resolvedStatus)) {
      res.status(400);
      throw new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    // ── received_date only allowed when status is 'received' ──
    if (received_date && resolvedStatus !== "received") {
      res.status(400);
      throw new Error("received_date can only be set when status is 'received'");
    }

    // ── Date format validation ──
    if (order_date && isNaN(Date.parse(order_date))) {
      res.status(400);
      throw new Error("order_date is not a valid date");
    }
    if (received_date && isNaN(Date.parse(received_date))) {
      res.status(400);
      throw new Error("received_date is not a valid date");
    }

    // ── received_date cannot be before order_date ──
    if (order_date && received_date) {
      if (new Date(received_date) < new Date(order_date)) {
        res.status(400);
        throw new Error("received_date cannot be before order_date");
      }
    }

    // ── Supplier existence check ──
    const supCheck = await pool.query(
      `SELECT sup_id FROM "SUPPLIER" WHERE sup_id = $1`,
      [parsedSupId],
    );
    if (supCheck.rows.length === 0) {
      res.status(404);
      throw new Error(`Supplier with id ${parsedSupId} not found`);
    }

    // ── Branch existence check ──
    const branchCheck = await pool.query(
      `SELECT "B_id" FROM "Branch" WHERE "B_id" = $1`,
      [parsedBId],
    );
    if (branchCheck.rows.length === 0) {
      res.status(404);
      throw new Error(`Branch with id ${parsedBId} not found`);
    }

    const result = await pool.query(
      `INSERT INTO purchase_order (sup_id, b_id, status, order_date, received_date)
       VALUES ($1, $2, $3, COALESCE($4::TIMESTAMP, CURRENT_TIMESTAMP), $5::TIMESTAMP)
       RETURNING po_id, sup_id, b_id, status, order_date, received_date`,
      [
        parsedSupId,
        parsedBId,
        resolvedStatus,
        order_date    || null,
        received_date || null,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/purchase-orders/:id ─────────────────────────────────────────────
export async function updatePurchaseOrder(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "po_id");

    const body = sanitizeBody(req.body, [
      "sup_id",
      "B_id",
      "status",
      "order_date",
      "received_date",
    ]);

    if (Object.keys(body).length === 0) {
      res.status(400);
      throw new Error("No fields provided to update");
    }

    const { sup_id, B_id, status, order_date, received_date } = body;

    // ── Existence check ──
    const existing = await pool.query(
      `SELECT po_id, status, order_date FROM purchase_order WHERE po_id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase order not found");
    }

    const currentStatus    = existing.rows[0].status;
    const currentOrderDate = existing.rows[0].order_date;

    // ── Cannot edit a received order ──
    if (currentStatus === "received" && status && status !== "received") {
      res.status(409);
      throw new Error("Cannot revert a received purchase order back to pending");
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      res.status(400);
      throw new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    const resolvedStatus = status ?? currentStatus;
    if (received_date && resolvedStatus !== "received") {
      res.status(400);
      throw new Error("received_date can only be set when status is 'received'");
    }

    if (order_date && isNaN(Date.parse(order_date))) {
      res.status(400);
      throw new Error("order_date is not a valid date");
    }
    if (received_date && isNaN(Date.parse(received_date))) {
      res.status(400);
      throw new Error("received_date is not a valid date");
    }

    const resolvedOrderDate = order_date
      ? new Date(order_date)
      : new Date(currentOrderDate);
    if (received_date && new Date(received_date) < resolvedOrderDate) {
      res.status(400);
      throw new Error("received_date cannot be before order_date");
    }

    // ── FK validations ──
    if (sup_id !== undefined) {
      const parsedSupId = parsePositiveInt(sup_id, "sup_id");
      const supCheck = await pool.query(
        `SELECT sup_id FROM "SUPPLIER" WHERE sup_id = $1`,
        [parsedSupId],
      );
      if (supCheck.rows.length === 0) {
        res.status(404);
        throw new Error(`Supplier with id ${parsedSupId} not found`);
      }
    }

    if (B_id !== undefined) {
      const parsedBId = parsePositiveInt(B_id, "B_id");
      const branchCheck = await pool.query(
        `SELECT "B_id" FROM "Branch" WHERE "B_id" = $1`,
        [parsedBId],
      );
      if (branchCheck.rows.length === 0) {
        res.status(404);
        throw new Error(`Branch with id ${parsedBId} not found`);
      }
    }

    const result = await pool.query(
      `UPDATE purchase_order
       SET
         sup_id        = COALESCE($1, sup_id),
         b_id          = COALESCE($2, b_id),
         status        = COALESCE($3, status),
         order_date    = COALESCE($4::TIMESTAMP, order_date),
         received_date = COALESCE($5::TIMESTAMP, received_date)
       WHERE po_id = $6
       RETURNING po_id, sup_id, b_id, status, order_date, received_date`,
      [
        sup_id        ? Number(sup_id) : null,
        B_id          ? Number(B_id)   : null,
        status        ?? null,
        order_date    || null,
        received_date || null,
        id,
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/purchase-orders/:id/status ───────────────────────────────────
export async function updatePurchaseOrderStatus(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "po_id");

    const body = sanitizeBody(req.body, ["status"]);
    const { status } = body;

    if (!status) {
      res.status(400);
      throw new Error("status is required");
    }

    if (!VALID_STATUSES.includes(status)) {
      res.status(400);
      throw new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`);
    }

    const existing = await pool.query(
      `SELECT po_id, status FROM purchase_order WHERE po_id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase order not found");
    }

    const currentStatus = existing.rows[0].status;

    if (currentStatus === "received" && status !== "received") {
      res.status(409);
      throw new Error("Cannot revert a received purchase order back to pending");
    }

    if (currentStatus === status) {
      res.status(409);
      throw new Error(`Purchase order is already '${status}'`);
    }

    if (status === "received") {
      const itemCheck = await pool.query(
        `SELECT pi_id FROM purchase_item WHERE po_id = $1 LIMIT 1`,
        [id],
      );
      if (itemCheck.rows.length === 0) {
        res.status(422);
        throw new Error(
          "Cannot mark order as received — no purchase items exist for this order",
        );
      }
    }

    const result = await pool.query(
      `UPDATE purchase_order
       SET
         status        = $1::VARCHAR,
         received_date = CASE WHEN $1::VARCHAR = 'received' THEN CURRENT_TIMESTAMP ELSE received_date END
       WHERE po_id = $2
       RETURNING po_id, sup_id, b_id, status, order_date, received_date`,
      [status, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/purchase-orders/:id ─────────────────────────────────────────
export async function deletePurchaseOrder(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "po_id");

    const existing = await pool.query(
      `SELECT po_id, status FROM purchase_order WHERE po_id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Purchase order not found");
    }

    if (existing.rows[0].status === "received") {
      res.status(409);
      throw new Error("Cannot delete a received purchase order");
    }

    // ── Cascade-safe: delete items first, then order ──
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM purchase_item  WHERE po_id = $1`, [id]);
      await client.query(`DELETE FROM purchase_order WHERE po_id = $1`, [id]);
      await client.query("COMMIT");
    } catch (txErr) {
      await client.query("ROLLBACK");
      throw txErr;
    } finally {
      client.release();
    }

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(409);
      return next(
        new Error("Cannot delete purchase order because it is referenced elsewhere"),
      );
    }
    next(err);
  }
}
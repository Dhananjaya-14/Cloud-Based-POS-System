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

const VALID_METHODS = ["cash", "card", "bank_transfer", "cheque", "online"];
const MAX_AMOUNT    = 9_999_999.99;

// ─── GET /api/supplier-payments ───────────────────────────────────────────────
export async function getSupplierPayments(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         sp.pay_id,
         sp.amount,
         sp.payment_date,
         sp.method,
         s.sup_id,
         s.sup_name,
         s.sup_contact,
         po.po_id,
         po.status AS order_status
       FROM supplier_payment sp
       JOIN "SUPPLIER"     s  ON s.sup_id = sp.sup_id
       JOIN purchase_order po ON po.po_id  = sp.po_id
       ORDER BY sp.payment_date DESC`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/supplier-payments/:id ──────────────────────────────────────────
export async function getSupplierPaymentById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "pay_id");

    const result = await pool.query(
      `SELECT
         sp.pay_id,
         sp.amount,
         sp.payment_date,
         sp.method,
         s.sup_id,
         s.sup_name,
         s.sup_contact,
         po.po_id,
         po.status AS order_status
       FROM supplier_payment sp
       JOIN "SUPPLIER"     s  ON s.sup_id = sp.sup_id
       JOIN purchase_order po ON po.po_id  = sp.po_id
       WHERE sp.pay_id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Supplier payment not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/supplier-payments/supplier/:supId ───────────────────────────────
export async function getPaymentsBySupplier(req, res, next) {
  try {
    const supId = parsePositiveInt(req.params.supId, "sup_id");

    // ── Supplier existence check ──
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
         sp.pay_id,
         sp.amount,
         sp.payment_date,
         sp.method,
         po.po_id,
         po.status AS order_status
       FROM supplier_payment sp
       JOIN purchase_order po ON po.po_id = sp.po_id
       WHERE sp.sup_id = $1
       ORDER BY sp.payment_date DESC`,
      [supId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/supplier-payments/order/:poId ───────────────────────────────────
export async function getPaymentsByOrder(req, res, next) {
  try {
    const poId = parsePositiveInt(req.params.poId, "po_id");

    // ── Order existence check ──
    const orderCheck = await pool.query(
      `SELECT po_id FROM purchase_order WHERE po_id = $1`,
      [poId],
    );
    if (orderCheck.rows.length === 0) {
      res.status(404);
      throw new Error(`Purchase order with id ${poId} not found`);
    }

    const result = await pool.query(
      `SELECT
         sp.pay_id,
         sp.amount,
         sp.payment_date,
         sp.method,
         s.sup_id,
         s.sup_name
       FROM supplier_payment sp
       JOIN "SUPPLIER" s ON s.sup_id = sp.sup_id
       WHERE sp.po_id = $1
       ORDER BY sp.payment_date DESC`,
      [poId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/supplier-payments ─────────────────────────────────────────────
export async function createSupplierPayment(req, res, next) {
  try {
    const body = sanitizeBody(req.body, [
      "sup_id",
      "po_id",
      "amount",
      "method",
      "payment_date",
    ]);

    const { sup_id, po_id, amount, method, payment_date } = body;

    // ── Required fields ──
    if (
      sup_id === undefined ||
      po_id  === undefined ||
      amount === undefined ||
      !method
    ) {
      res.status(400);
      throw new Error("sup_id, po_id, amount and method are required");
    }

    const parsedSupId = parsePositiveInt(sup_id, "sup_id");
    const parsedPoId  = parsePositiveInt(po_id,  "po_id");
    const parsedAmount = parsePositiveDecimal(amount, "amount");

    // ── Amount cap ──
    if (parsedAmount > MAX_AMOUNT) {
      res.status(400);
      throw new Error(`amount cannot exceed ${MAX_AMOUNT.toLocaleString()}`);
    }

    // ── Method validation ──
    if (!VALID_METHODS.includes(method)) {
      res.status(400);
      throw new Error(`method must be one of: ${VALID_METHODS.join(", ")}`);
    }

    // ── Payment date validation ──
    if (payment_date && isNaN(Date.parse(payment_date))) {
      res.status(400);
      throw new Error("payment_date is not a valid date");
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

    // ── Purchase order existence check ──
    const orderCheck = await pool.query(
      `SELECT po_id, sup_id, status FROM purchase_order WHERE po_id = $1`,
      [parsedPoId],
    );
    if (orderCheck.rows.length === 0) {
      res.status(404);
      throw new Error(`Purchase order with id ${parsedPoId} not found`);
    }

    // ── Payment supplier must match order supplier ──
    if (orderCheck.rows[0].sup_id !== parsedSupId) {
      res.status(409);
      throw new Error(
        "sup_id does not match the supplier on this purchase order",
      );
    }

    // ── Can only pay for received orders ──
    if (orderCheck.rows[0].status !== "received") {
      res.status(409);
      throw new Error(
        "Cannot record payment — purchase order has not been received yet",
      );
    }

    // ── Overpayment guard: sum existing payments + new amount ──
    const totalPaid = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM supplier_payment
       WHERE po_id = $1`,
      [parsedPoId],
    );

    // Get total order value from purchase items
    const orderTotal = await pool.query(
      `SELECT COALESCE(SUM(price), 0) AS total
       FROM purchase_item
       WHERE po_id = $1`,
      [parsedPoId],
    );

    const alreadyPaid  = Number(totalPaid.rows[0].total);
    const orderValue   = Number(orderTotal.rows[0].total);
    const afterPayment = alreadyPaid + parsedAmount;

    if (orderValue > 0 && afterPayment > orderValue) {
      res.status(409);
      throw new Error(
        `Payment would exceed order total. ` +
        `Order value: ${orderValue.toFixed(2)}, ` +
        `already paid: ${alreadyPaid.toFixed(2)}, ` +
        `this payment: ${parsedAmount.toFixed(2)}`,
      );
    }

    const result = await pool.query(
      `INSERT INTO supplier_payment (sup_id, po_id, amount, method, payment_date)
       VALUES ($1, $2, $3, $4, COALESCE($5::TIMESTAMP, CURRENT_TIMESTAMP))
       RETURNING pay_id, sup_id, po_id, amount, method, payment_date`,
      [
        parsedSupId,
        parsedPoId,
        parsedAmount,
        method,
        payment_date || null,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/supplier-payments/:id ──────────────────────────────────────────
export async function updateSupplierPayment(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "pay_id");

    const body = sanitizeBody(req.body, [
      "amount",
      "method",
      "payment_date",
    ]);

    if (Object.keys(body).length === 0) {
      res.status(400);
      throw new Error("No fields provided to update");
    }

    const { amount, method, payment_date } = body;

    // ── Existence check ──
    const existing = await pool.query(
      `SELECT pay_id, po_id, amount FROM supplier_payment WHERE pay_id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Supplier payment not found");
    }

    const current = existing.rows[0];

    // ── Amount validation ──
    let parsedAmount = null;
    if (amount !== undefined) {
      parsedAmount = parsePositiveDecimal(amount, "amount");
      if (parsedAmount > MAX_AMOUNT) {
        res.status(400);
        throw new Error(`amount cannot exceed ${MAX_AMOUNT.toLocaleString()}`);
      }

      // ── Overpayment guard ──
      const totalPaid = await pool.query(
        `SELECT COALESCE(SUM(amount), 0) AS total
         FROM supplier_payment
         WHERE po_id = $1 AND pay_id <> $2`,
        [current.po_id, id],
      );
      const orderTotal = await pool.query(
        `SELECT COALESCE(SUM(price), 0) AS total
         FROM purchase_item
         WHERE po_id = $1`,
        [current.po_id],
      );
      const othersPaid = Number(totalPaid.rows[0].total);
      const orderValue = Number(orderTotal.rows[0].total);
      if (orderValue > 0 && othersPaid + parsedAmount > orderValue) {
        res.status(409);
        throw new Error(
          `Payment would exceed order total. ` +
          `Order value: ${orderValue.toFixed(2)}, ` +
          `other payments: ${othersPaid.toFixed(2)}, ` +
          `this payment: ${parsedAmount.toFixed(2)}`,
        );
      }
    }

    // ── Method validation ──
    if (method !== undefined && !VALID_METHODS.includes(method)) {
      res.status(400);
      throw new Error(`method must be one of: ${VALID_METHODS.join(", ")}`);
    }

    // ── Payment date validation ──
    if (payment_date && isNaN(Date.parse(payment_date))) {
      res.status(400);
      throw new Error("payment_date is not a valid date");
    }

    const result = await pool.query(
      `UPDATE supplier_payment
       SET
         amount       = COALESCE($1, amount),
         method       = COALESCE($2, method),
         payment_date = COALESCE($3::TIMESTAMP, payment_date)
       WHERE pay_id = $4
       RETURNING pay_id, sup_id, po_id, amount, method, payment_date`,
      [
        parsedAmount    ?? null,
        method          ?? null,
        payment_date    || null,
        id,
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/supplier-payments/:id ───────────────────────────────────────
export async function deleteSupplierPayment(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "pay_id");

    const existing = await pool.query(
      `SELECT pay_id FROM supplier_payment WHERE pay_id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Supplier payment not found");
    }

    await pool.query(`DELETE FROM supplier_payment WHERE pay_id = $1`, [id]);

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(409);
      return next(
        new Error("Cannot delete payment because it is referenced elsewhere"),
      );
    }
    next(err);
  }
}
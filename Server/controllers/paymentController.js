// controllers/paymentController.js
import { body, param, query, validationResult } from "express-validator";
import pool from "../config/database.js";
import { emitSocketEvent, ADMIN_PAYMENT_ROOM, SOCKET_EVENTS } from "../utils/socket.js";
import { releaseTableIfNoOpenOrders } from "../utils/tableOccupancy.js";

// ─── DB-Aligned Constants ─────────────────────────────────────────────────────
// Adjust these to match your Payment table CHECK constraints if you have them
const PAY_METHODS = ["cash", "card", "mobile_pay", "voucher", "split"];
const PAY_STATUSES = ["pending", "paid", "failed", "refunded", "voided"];

// ─── Validation Error Handler ─────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
        value: e.value,
      })),
    });
  }
  next();
};

// ─── Reusable: p_id param ─────────────────────────────────────────────────────
const v_pId = param("id")
  .notEmpty()
  .withMessage("Payment ID is required")
  .isInt({ min: 1 })
  .withMessage("Payment ID must be a positive integer")
  .toInt();

// pay_amount_received — cash handed over by the customer (cash payments only).
// Must cover the total bill (pay_amount). Shared by POST and PUT.
const v_amountReceived = body("pay_amount_received")
  .optional({ values: "null" })
  .isFloat({ min: 0, max: 99999999.99 })
  .withMessage("pay_amount_received must be between 0 and 99,999,999.99")
  .toFloat()
  .custom((val, { req }) => {
    if (Math.round(val * 100) / 100 !== val) {
      throw new Error("pay_amount_received must have at most 2 decimal places");
    }
    if (req.body.pay_method !== "cash") {
      throw new Error("pay_amount_received is only allowed for cash payments");
    }
    if (val < Number(req.body.pay_amount)) {
      throw new Error("pay_amount_received cannot be less than pay_amount (total bill)");
    }
    return true;
  });

// ─── Cash tender helpers ─────────────────────────────────────────────────────
// Change to return, worked out in cents to avoid floating-point drift.
function calcBalance(amountReceived, payAmount) {
  if (amountReceived == null) return null;
  return Math.round(Number(amountReceived) * 100 - Number(payAmount) * 100) / 100;
}

// pg returns NUMERIC as strings — convert, and add a summary the cashier screen
// can show directly: total bill, amount paid by the customer, change to return.
// Non-cash (or cash with no tender recorded): amount paid = bill, change = 0.
function formatPayment(row) {
  if (!row) return row;
  const pay_amount = Number(row.pay_amount);
  const pay_amount_received = row.pay_amount_received != null ? Number(row.pay_amount_received) : null;
  const pay_balance = row.pay_balance != null ? Number(row.pay_balance) : null;
  return {
    ...row,
    pay_amount,
    pay_amount_received,
    pay_balance,
    summary: {
      total_bill: pay_amount,
      amount_paid: pay_amount_received ?? pay_amount,
      balance: pay_balance ?? 0,
    },
  };
}

// ─── DB error handler ─────────────────────────────────────────────────────────
const handleDbError = (err, res, next) => {
  if (err.code === "23503") {
    // FK violation — or_id doesn't exist
    return res.status(422).json({
      success: false,
      message: "The referenced order (or_id) does not exist.",
      detail: err.detail,
    });
  }
  if (err.code === "23514") {
    // CHECK constraint violation
    if (err.constraint === "payment_cash_tender_chk") {
      return res.status(422).json({
        success: false,
        message: "pay_amount_received must cover pay_amount (total bill).",
      });
    }
    return res.status(422).json({
      success: false,
      message:
        "A database constraint was violated. Check pay_method or pay_status.",
      detail: err.detail,
    });
  }
  if (err.code === "23505") {
    // Unique violation
    return res.status(409).json({
      success: false,
      message: "A payment record with this data already exists.",
      detail: err.detail,
    });
  }
  next(err);
};

// ═════════════════════════════════════════════════════════════════════════════
//  GET /payments
//  Access: Cashier | Branch Admin | Admin  (requireCashierOrAbove)
// ═════════════════════════════════════════════════════════════════════════════
export const getPaymentsValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("limit must be 1–200")
    .toInt(),

  query("pay_method")
    .optional()
    .isIn(PAY_METHODS)
    .withMessage(`pay_method must be one of: ${PAY_METHODS.join(", ")}`),

  query("pay_status")
    .optional()
    .isIn(PAY_STATUSES)
    .withMessage(`pay_status must be one of: ${PAY_STATUSES.join(", ")}`),

  query("or_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("or_id must be a positive integer")
    .toInt(),

  // pay_date range filters
  query("date_from")
    .optional()
    .isDate({ format: "YYYY-MM-DD" })
    .withMessage("date_from must be YYYY-MM-DD"),

  query("date_to")
    .optional()
    .isDate({ format: "YYYY-MM-DD" })
    .withMessage("date_to must be YYYY-MM-DD")
    .custom((to, { req }) => {
      if (req.query.date_from && new Date(to) < new Date(req.query.date_from)) {
        throw new Error("date_to must not be before date_from");
      }
      return true;
    }),

  // Amount range filters
  query("amount_min")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("amount_min must be a non-negative number")
    .toFloat(),

  query("amount_max")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("amount_max must be a non-negative number")
    .toFloat()
    .custom((max, { req }) => {
      const min = parseFloat(req.query.amount_min);
      if (!isNaN(min) && max < min) {
        throw new Error(
          "amount_max must be greater than or equal to amount_min",
        );
      }
      return true;
    }),

  validate,
];

export async function getPayments(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      pay_method,
      pay_status,
      or_id,
      date_from,
      date_to,
      amount_min,
      amount_max,
    } = req.query;

    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (pay_method) {
      conditions.push(`pay_method = $${idx++}`);
      values.push(pay_method);
    }
    if (pay_status) {
      conditions.push(`pay_status = $${idx++}`);
      values.push(pay_status);
    }
    if (or_id) {
      conditions.push(`or_id = $${idx++}`);
      values.push(or_id);
    }
    if (date_from) {
      conditions.push(`pay_date >= $${idx++}`);
      values.push(date_from);
    }
    if (date_to) {
      conditions.push(`pay_date <= $${idx++}`);
      values.push(date_to);
    }
    if (amount_min !== undefined) {
      conditions.push(`pay_amount >= $${idx++}`);
      values.push(amount_min);
    }
    if (amount_max !== undefined) {
      conditions.push(`pay_amount <= $${idx++}`);
      values.push(amount_max);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [
      {
        rows: [{ count }],
      },
      { rows: data },
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM "Payment" ${where}`, values),
      pool.query(
        `SELECT p_id, pay_method, pay_status, pay_date, pay_amount,
                pay_amount_received, pay_balance, or_id
         FROM "Payment" ${where}
         ORDER BY pay_date DESC, p_id DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, +limit, offset],
      ),
    ]);

    res.json({
      success: true,
      data: data.map(formatPayment),
      meta: {
        total: +count,
        page: +page,
        limit: +limit,
        pages: Math.ceil(+count / +limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  GET /payments/:id
//  Access: Cashier | Branch Admin | Admin  (requireCashierOrAbove)
// ═════════════════════════════════════════════════════════════════════════════
export const getPaymentByIdValidation = [v_pId, validate];

export async function getPaymentById(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM "Payment" WHERE p_id = $1',
      [req.params.id],
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    res.json({ success: true, data: formatPayment(rows[0]) });
  } catch (err) {
    next(err);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  POST /payments
//  Access: Cashier | Branch Admin | Admin  (requireCashierOrAbove)
// ═════════════════════════════════════════════════════════════════════════════
export const createPaymentValidation = [
  // pay_method — how the customer is paying
  body("pay_method")
    .notEmpty()
    .withMessage("pay_method is required")
    .isIn(PAY_METHODS)
    .withMessage(`pay_method must be one of: ${PAY_METHODS.join(", ")}`),


  // pay_date — must be a real date, not in the future
  body("pay_date")
    .notEmpty()
    .withMessage("pay_date is required")
    .isDate({ format: "YYYY-MM-DD" })
    .withMessage("pay_date must be a valid date (YYYY-MM-DD)")
    .custom((val) => {
      if (new Date(val) > new Date()) {
        throw new Error("pay_date cannot be a future date");
      }
      return true;
    }),

  // pay_amount — must be positive, max matches NUMERIC(10,2)
  body("pay_amount")
    .notEmpty()
    .withMessage("pay_amount is required")
    .isFloat({ min: 0.01, max: 99999999.99 })
    .withMessage("pay_amount must be between 0.01 and 99,999,999.99")
    .toFloat()
    .custom((val) => {
      // Reject more than 2 decimal places (NUMERIC(10,2) would silently round)
      if (Math.round(val * 100) / 100 !== val) {
        throw new Error("pay_amount must have at most 2 decimal places");
      }
      return true;
    }),

  v_amountReceived,

  // or_id — FK → public.ORDER(or_id), NOT NULL
  body("or_id")
    .notEmpty()
    .withMessage("or_id is required")
    .isInt({ min: 1 })
    .withMessage("or_id must be a positive integer")
    .toInt()
    .custom(async (or_id) => {
      // Verify the order exists and is in a payable state
      const { rows } = await pool.query(
        'SELECT or_status FROM "ORDER" WHERE or_id = $1',
        [or_id],
      );
      if (!rows.length) {
        throw new Error(`Order ${or_id} does not exist`);
      }
      if (!["pending", "preparing", "completed"].includes(rows[0].or_status)) {
        throw new Error(
          `Cannot create a payment for an order with status '${rows[0].or_status}'. ` +
          `Order must be pending, preparing, or completed.`,
        );
      }
      return true;
    }),

  body("pay_status")
    .optional()
    .isIn(PAY_STATUSES)
    .withMessage(`pay_status must be one of: ${PAY_STATUSES.join(", ")}`)
    .custom((val) => {
      if (val && !["pending", "paid"].includes(val)) {
        throw new Error("pay_status on a new payment must be 'pending' or 'paid'");
      }
      return true;
    }),

  validate,
];

export async function createPayment(req, res, next) {
  const client = await pool.connect();
  try {
    const {
      pay_method,
      pay_status = "paid", // Defaults to 'paid' if not provided
      pay_date,
      pay_amount,
      pay_amount_received = null,
      or_id,
    } = req.body;

    // Balance (change) to return to the customer — always computed server-side
    const pay_balance = calcBalance(pay_amount_received, pay_amount);

    await client.query('BEGIN');

    const paymentResult = await client.query(
      `INSERT INTO "Payment" (pay_method, pay_status, pay_date, pay_amount, pay_amount_received, pay_balance, or_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [pay_method, pay_status, pay_date, pay_amount, pay_amount_received, pay_balance, or_id],
    );

    let updatedTableId = null;
    let branchId = null;

    if (pay_status === "paid") {
      const orderRes = await client.query(`SELECT table_id, b_id FROM "ORDER" WHERE or_id = $1`, [or_id]);
      // Other parties may still be seated at this table — only free it when none are open
      if (
        orderRes.rows.length &&
        (await releaseTableIfNoOpenOrders(client, orderRes.rows[0].table_id, Number(or_id)))
      ) {
        updatedTableId = orderRes.rows[0].table_id;
        branchId = orderRes.rows[0].b_id;
      }
    }

    await client.query('COMMIT');

    if (updatedTableId && branchId) {
      emitSocketEvent(SOCKET_EVENTS.TABLE_UPDATED, { table_id: updatedTableId, table_status: 'available', branch_id: branchId }, { room: `branch-updates` });
    }

    res.status(201).json({ success: true, data: formatPayment(paymentResult.rows[0]) });
  } catch (err) {
    await client.query('ROLLBACK');
    handleDbError(err, res, next);
  } finally {
    client.release();
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  PUT /payments/:id  — full replace
//  Access: Branch Admin | Admin  (requireBranchAdminOrAdmin)
// ═════════════════════════════════════════════════════════════════════════════

// Payment status state machine
const PAY_STATUS_TRANSITIONS = {
  pending: ["paid", "failed", "voided"],
  paid: ["refunded"],
  failed: ["pending"], // allow retry
  refunded: [], // terminal
  voided: [], // terminal
};

export const updatePaymentValidation = [
  v_pId,

  body("pay_method")
    .notEmpty()
    .withMessage("pay_method is required")
    .isIn(PAY_METHODS)
    .withMessage(`pay_method must be one of: ${PAY_METHODS.join(", ")}`),

  body("pay_status")
    .notEmpty()
    .withMessage("pay_status is required")
    .isIn(PAY_STATUSES)
    .withMessage(`pay_status must be one of: ${PAY_STATUSES.join(", ")}`)
    .custom(async (newStatus, { req }) => {
      // Enforce state machine — fetch current status from DB
      const { rows } = await pool.query(
        'SELECT pay_status FROM "Payment" WHERE p_id = $1',
        [req.params.id],
      );
      if (!rows.length) return true; // 404 handled in controller

      const curr = rows[0].pay_status;
      const allowed = PAY_STATUS_TRANSITIONS[curr] ?? [];

      if (curr === newStatus) return true; // no-op update is fine

      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Cannot transition pay_status from '${curr}' to '${newStatus}'. ` +
          `Allowed: [${allowed.join(", ") || "none — this status is terminal"}]`,
        );
      }
      return true;
    }),

  body("pay_date")
    .notEmpty()
    .withMessage("pay_date is required")
    .isDate({ format: "YYYY-MM-DD" })
    .withMessage("pay_date must be YYYY-MM-DD")
    .custom((val) => {
      if (new Date(val) > new Date())
        throw new Error("pay_date cannot be a future date");
      return true;
    }),

  body("pay_amount")
    .notEmpty()
    .withMessage("pay_amount is required")
    .isFloat({ min: 0.01, max: 99999999.99 })
    .withMessage("pay_amount must be between 0.01 and 99,999,999.99")
    .toFloat()
    .custom((val) => {
      if (Math.round(val * 100) / 100 !== val)
        throw new Error("pay_amount must have at most 2 decimal places");
      return true;
    }),

  v_amountReceived,

  body("or_id")
    .notEmpty()
    .withMessage("or_id is required")
    .isInt({ min: 1 })
    .withMessage("or_id must be a positive integer")
    .toInt()
    .custom(async (or_id) => {
      const { rows } = await pool.query(
        'SELECT or_id FROM "ORDER" WHERE or_id = $1',
        [or_id],
      );
      if (!rows.length) throw new Error(`Order ${or_id} does not exist`);
      return true;
    }),

  // Refund requires a reason
  body("refund_reason")
    .if(body("pay_status").equals("refunded"))
    .notEmpty()
    .withMessage("refund_reason is required when refunding a payment")
    .isString()
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage("refund_reason must be 5–300 characters"),

  validate,
];

export async function updatePayment(req, res, next) {
  try {
    const { id } = req.params;
    const { pay_method, pay_status, pay_date, pay_amount, or_id } = req.body;

    // Retrieve current status to detect transition
    const { rows: prevRows } = await pool.query(
      'SELECT pay_status, pay_amount_received FROM "Payment" WHERE p_id = $1',
      [id]
    );
    const prevStatus = prevRows[0]?.pay_status;

    // Cash tender: use the new value if sent, otherwise keep the stored one.
    // Non-cash payments never carry a tender or change.
    let pay_amount_received = null;
    if (pay_method === "cash") {
      pay_amount_received =
        req.body.pay_amount_received !== undefined
          ? req.body.pay_amount_received
          : prevRows[0]?.pay_amount_received ?? null;
      if (pay_amount_received != null && Number(pay_amount_received) < pay_amount) {
        return res.status(400).json({
          success: false,
          message:
            "The stored pay_amount_received no longer covers the new pay_amount — send a new pay_amount_received.",
        });
      }
    }
    const pay_balance = calcBalance(pay_amount_received, pay_amount);

    const { rows } = await pool.query(
      `UPDATE "Payment"
       SET pay_method          = $1,
           pay_status          = $2,
           pay_date            = $3,
           pay_amount          = $4,
           or_id               = $5,
           pay_amount_received = $6,
           pay_balance         = $7
       WHERE p_id = $8
       RETURNING *`,
      [pay_method, pay_status, pay_date, pay_amount, or_id, pay_amount_received, pay_balance, id],
    );

    let updatedTableId = null;
    let branchId = null;
    if (pay_status === "paid" && prevStatus !== "paid") {
      const orderRes = await pool.query(`SELECT table_id, b_id FROM "ORDER" WHERE or_id = $1`, [or_id]);
      // Other parties may still be seated at this table — only free it when none are open
      if (
        orderRes.rows.length &&
        (await releaseTableIfNoOpenOrders(pool, orderRes.rows[0].table_id, Number(or_id)))
      ) {
        updatedTableId = orderRes.rows[0].table_id;
        branchId = orderRes.rows[0].b_id;
      }
    }

    if (updatedTableId && branchId) {
      emitSocketEvent(SOCKET_EVENTS.TABLE_UPDATED, { table_id: updatedTableId, table_status: 'available', branch_id: branchId }, { room: `branch-updates` });
    }

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    const payment = formatPayment(rows[0]);

      // Emit socket event to all clients for real-time updates across roles
      emitSocketEvent("payment:completed", payment);
      // Also emit to admin payment room for admin-specific listeners
      emitSocketEvent("payment:completed", payment, { room: ADMIN_PAYMENT_ROOM });

    res.json({ success: true, data: payment });
  } catch (err) {
    handleDbError(err, res, next);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  DELETE /payments/:id
//  Access: Admin only  (requireAdmin)
//  Only voided or failed payments may be hard-deleted
// ═════════════════════════════════════════════════════════════════════════════
export const deletePaymentValidation = [
  v_pId,

  // Guard: only terminal/failed payments can be deleted
  param("id").custom(async (id) => {
    const { rows } = await pool.query(
      'SELECT pay_status FROM "Payment" WHERE p_id = $1',
      [id],
    );
    if (!rows.length) return true; // 404 handled in controller

    const deletable = ["voided", "failed"];
    if (!deletable.includes(rows[0].pay_status)) {
      throw new Error(
        `Cannot delete a payment with status '${rows[0].pay_status}'. ` +
        `Only voided or failed payments may be deleted.`,
      );
    }
    return true;
  }),

  validate,
];

export async function deletePayment(req, res, next) {
  try {
    const { rows } = await pool.query(
      'DELETE FROM "Payment" WHERE p_id = $1 RETURNING p_id',
      [req.params.id],
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });
    }

    res.json({
      success: true,
      message: `Payment ${rows[0].p_id} deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
}

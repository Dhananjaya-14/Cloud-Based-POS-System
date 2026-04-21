//hazardoes
import pool from "../config/database.js";

// GET /api/payments
export async function getPayments(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT "p_id", "pay_method", "pay_status", "pay_date", "pay_amount", "or_id" FROM "Payment" ORDER BY "p_id"'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/payments/:id
export async function getPaymentById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM "Payment" WHERE "p_id" = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Payment not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/payments
export async function createPayment(req, res, next) {
  try {
    const { pay_method, pay_status, pay_date, pay_amount, or_id } = req.body;

    if (!pay_method || !pay_status || !pay_date || !pay_amount || !or_id) {
      res.status(400);
      throw new Error("All fields are required");
    }

    const result = await pool.query(
      `INSERT INTO "Payment" 
      ("pay_method", "pay_status", "pay_date", "pay_amount", "or_id")
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [pay_method, pay_status, pay_date, pay_amount, or_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Invalid or_id (order not found)"));
    }
    next(err);
  }
}

// PUT /api/payments/:id
export async function updatePayment(req, res, next) {
  try {
    const { id } = req.params;
    const { pay_method, pay_status, pay_date, pay_amount, or_id } = req.body;

    const existing = await pool.query(
      'SELECT "p_id" FROM "Payment" WHERE "p_id" = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Payment not found");
    }

    const result = await pool.query(
      `UPDATE "Payment"
      SET
        "pay_method" = COALESCE($1, "pay_method"),
        "pay_status" = COALESCE($2, "pay_status"),
        "pay_date" = COALESCE($3, "pay_date"),
        "pay_amount" = COALESCE($4, "pay_amount"),
        "or_id" = COALESCE($5, "or_id")
      WHERE "p_id" = $6
      RETURNING *`,
      [
        pay_method ?? null,
        pay_status ?? null,
        pay_date ?? null,
        pay_amount ?? null,
        or_id ?? null,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/payments/:id
export async function deletePayment(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM "Payment" WHERE "p_id" = $1 RETURNING "p_id"',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Payment not found");
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
import pool from "../config/database.js";

// GET /api/delivery
export async function getDeliveries(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT 
        delivery_id,
        delivery_partner,
        delivery_address,
        contact_number,
        delivery_status,
        estimated_time,
        delivery_fee,
        or_id
      FROM "DELIVERY"
      ORDER BY delivery_id`
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET BY ID
export async function getDeliveryById(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM "DELIVERY" WHERE delivery_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Delivery not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST
export async function createDelivery(req, res, next) {
  try {
    const {
      delivery_partner,
      delivery_address,
      contact_number,
      delivery_status,
      estimated_time,
      delivery_fee,
      or_id,
    } = req.body;

    if (
      !delivery_partner ||
      !delivery_address ||
      !contact_number ||
      !delivery_status ||
      !estimated_time ||
      !delivery_fee ||
      !or_id
    ) {
      res.status(400);
      throw new Error("All fields are required");
    }

    const result = await pool.query(
      `INSERT INTO "DELIVERY"
      (delivery_partner, delivery_address, contact_number, delivery_status, estimated_time, delivery_fee, or_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        delivery_partner,
        delivery_address,
        contact_number,
        delivery_status,
        estimated_time,
        delivery_fee,
        or_id,
      ]
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

// PUT
export async function updateDelivery(req, res, next) {
  try {
    const { id } = req.params;

    const {
      delivery_partner,
      delivery_address,
      contact_number,
      delivery_status,
      estimated_time,
      delivery_fee,
      or_id,
    } = req.body;

    const existing = await pool.query(
      'SELECT delivery_id FROM "DELIVERY" WHERE delivery_id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Delivery not found");
    }

    const result = await pool.query(
      `UPDATE "DELIVERY"
      SET
        delivery_partner = COALESCE($1, delivery_partner),
        delivery_address = COALESCE($2, delivery_address),
        contact_number = COALESCE($3, contact_number),
        delivery_status = COALESCE($4, delivery_status),
        estimated_time = COALESCE($5, estimated_time),
        delivery_fee = COALESCE($6, delivery_fee),
        or_id = COALESCE($7, or_id)
      WHERE delivery_id = $8
      RETURNING *`,
      [
        delivery_partner ?? null,
        delivery_address ?? null,
        contact_number ?? null,
        delivery_status ?? null,
        estimated_time ?? null,
        delivery_fee ?? null,
        or_id ?? null,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// DELETE
export async function deleteDelivery(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM "DELIVERY" WHERE delivery_id = $1 RETURNING delivery_id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Delivery not found");
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
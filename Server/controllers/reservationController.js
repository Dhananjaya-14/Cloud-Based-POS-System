import pool from "../config/database.js";

// GET /api/reservations
export async function getReservations(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT reserv_id, reserv_date, pay_date, cust_id, table_id, branch_id FROM "RESERVATION" ORDER BY reserv_id',
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/reservations/:id
export async function getReservationById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT reserv_id, reserv_date, pay_date, cust_id, table_id, branch_id FROM "RESERVATION" WHERE reserv_id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Reservation not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// GET /api/reservations/branch/:branchId
export async function getReservationsByBranch(req, res, next) {
  try {
    const { branchId } = req.params;
    const result = await pool.query(
      'SELECT reserv_id, reserv_date, pay_date, cust_id, table_id, branch_id FROM "RESERVATION" WHERE branch_id = $1 ORDER BY reserv_date DESC',
      [branchId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/reservations/customer/:custId
export async function getReservationsByCustomer(req, res, next) {
  try {
    const { custId } = req.params;
    const result = await pool.query(
      'SELECT reserv_id, reserv_date, pay_date, cust_id, table_id, branch_id FROM "RESERVATION" WHERE cust_id = $1 ORDER BY reserv_date DESC',
      [custId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/reservations/table/:tableId
export async function getReservationsByTable(req, res, next) {
  try {
    const { tableId } = req.params;
    const result = await pool.query(
      'SELECT reserv_id, reserv_date, pay_date, cust_id, table_id, branch_id FROM "RESERVATION" WHERE table_id = $1 ORDER BY reserv_date DESC',
      [tableId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/reservations
export async function createReservation(req, res, next) {
  try {
    const { reserv_date, pay_date, cust_id, table_id, branch_id } = req.body;

    if (!reserv_date || !cust_id || !table_id || !branch_id) {
      res.status(400);
      throw new Error(
        "reserv_date, cust_id, table_id and branch_id are required",
      );
    }

    const insertQuery = `
      INSERT INTO "RESERVATION" (reserv_date, pay_date, cust_id, table_id, branch_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING reserv_id, reserv_date, pay_date, cust_id, table_id, branch_id
    `;

    const result = await pool.query(insertQuery, [
      reserv_date,
      pay_date || null,
      cust_id,
      table_id,
      branch_id,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error(
          "Invalid foreign key: cust_id, table_id or branch_id does not exist",
        ),
      );
    }
    next(err);
  }
}

// PUT /api/reservations/:id
export async function updateReservation(req, res, next) {
  try {
    const { id } = req.params;
    const { reserv_date, pay_date, cust_id, table_id, branch_id } = req.body;

    const existing = await pool.query(
      'SELECT reserv_id FROM "RESERVATION" WHERE reserv_id = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Reservation not found");
    }

    const updateQuery = `
      UPDATE "RESERVATION"
      SET
        reserv_date = COALESCE($1, reserv_date),
        pay_date    = COALESCE($2, pay_date),
        cust_id     = COALESCE($3, cust_id),
        table_id    = COALESCE($4, table_id),
        branch_id   = COALESCE($5, branch_id)
      WHERE reserv_id = $6
      RETURNING reserv_id, reserv_date, pay_date, cust_id, table_id, branch_id
    `;

    const result = await pool.query(updateQuery, [
      reserv_date ?? null,
      pay_date ?? null,
      cust_id ?? null,
      table_id ?? null,
      branch_id ?? null,
      id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error(
          "Invalid foreign key: cust_id, table_id or branch_id does not exist",
        ),
      );
    }
    next(err);
  }
}

// DELETE /api/reservations/:id
export async function deleteReservation(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM "RESERVATION" WHERE reserv_id = $1 RETURNING reserv_id',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Reservation not found");
    }

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error("Cannot delete reservation because it is currently in use"),
      );
    }
    next(err);
  }
}

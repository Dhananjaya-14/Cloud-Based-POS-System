import pool from "../config/database.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`${fieldName} must be a positive integer`), {
      status: 400,
    });
  }
  return parsed;
}

function parseDate(value, fieldName) {
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw Object.assign(
      new Error(`${fieldName} must be a valid date (YYYY-MM-DD)`),
      { status: 400 },
    );
  }
  return d;
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

// ─── GET /api/reservations ───────────────────────────────────────────────────
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

// ─── GET /api/reservations/:id ──────────────────────────────────────────────
export async function getReservationById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "reserv_id");

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

// ─── GET /api/reservations/branch/:branchId ─────────────────────────────────
export async function getReservationsByBranch(req, res, next) {
  try {
    const branchId = parsePositiveInt(req.params.branchId, "branch_id");

    const result = await pool.query(
      'SELECT reserv_id, reserv_date, pay_date, cust_id, table_id, branch_id FROM "RESERVATION" WHERE branch_id = $1 ORDER BY reserv_date DESC',
      [branchId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/reservations/customer/:custId ─────────────────────────────────
export async function getReservationsByCustomer(req, res, next) {
  try {
    const custId = parsePositiveInt(req.params.custId, "cust_id");

    const result = await pool.query(
      'SELECT reserv_id, reserv_date, pay_date, cust_id, table_id, branch_id FROM "RESERVATION" WHERE cust_id = $1 ORDER BY reserv_date DESC',
      [custId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/reservations/table/:tableId ───────────────────────────────────
export async function getReservationsByTable(req, res, next) {
  try {
    const tableId = parsePositiveInt(req.params.tableId, "table_id");

    const result = await pool.query(
      'SELECT reserv_id, reserv_date, pay_date, cust_id, table_id, branch_id FROM "RESERVATION" WHERE table_id = $1 ORDER BY reserv_date DESC',
      [tableId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/reservations ─────────────────────────────────────────────────
export async function createReservation(req, res, next) {
  try {
    const body = sanitizeBody(req.body, [
      "reserv_date",
      "pay_date",
      "cust_id",
      "table_id",
      "branch_id",
    ]);

    const { reserv_date, pay_date, cust_id, table_id, branch_id } = body;

    // ── Required fields ──
    if (!reserv_date || !cust_id || !table_id || !branch_id) {
      res.status(400);
      throw new Error(
        "reserv_date, cust_id, table_id and branch_id are required",
      );
    }

    // ── Type checks ──
    const custIdInt = parsePositiveInt(cust_id, "cust_id");
    const tableIdInt = parsePositiveInt(table_id, "table_id");
    const branchIdInt = parsePositiveInt(branch_id, "branch_id");

    // ── Date validation ──
    const reservDate = parseDate(reserv_date, "reserv_date");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reservDate < today) {
      res.status(400);
      throw new Error("reserv_date cannot be in the past");
    }

    let payDateParsed = null;
    if (pay_date) {
      payDateParsed = parseDate(pay_date, "pay_date");
      if (payDateParsed < reservDate) {
        res.status(400);
        throw new Error("pay_date cannot be earlier than reserv_date");
      }
    }

    // ── Cross-branch validation: table must belong to given branch ──
    const tableCheck = await pool.query(
      'SELECT table_id, table_status FROM "TABLES" WHERE table_id = $1 AND branch_id = $2',
      [tableIdInt, branchIdInt],
    );
    if (tableCheck.rows.length === 0) {
      res.status(400);
      throw new Error(
        "The specified table does not belong to the given branch",
      );
    }

    // ── Table availability check ──
    const tableStatus = tableCheck.rows[0].table_status;
    if (tableStatus !== "available") {
      res.status(409);
      throw new Error(
        `Table is currently '${tableStatus}' and cannot be reserved`,
      );
    }

    // ── Double-booking check ──
    const conflict = await pool.query(
      `SELECT reserv_id FROM "RESERVATION"
       WHERE table_id = $1 AND reserv_date::date = $2::date`,
      [tableIdInt, reservDate],
    );
    if (conflict.rows.length > 0) {
      res.status(409);
      throw new Error("Table is already reserved for this date");
    }

    const result = await pool.query(
      `INSERT INTO "RESERVATION" (reserv_date, pay_date, cust_id, table_id, branch_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING reserv_id, reserv_date, pay_date, cust_id, table_id, branch_id`,
      [reservDate, payDateParsed, custIdInt, tableIdInt, branchIdInt],
    );

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

// ─── PUT /api/reservations/:id ──────────────────────────────────────────────
export async function updateReservation(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "reserv_id");

    const body = sanitizeBody(req.body, [
      "reserv_date",
      "pay_date",
      "cust_id",
      "table_id",
      "branch_id",
    ]);

    const { reserv_date, pay_date, cust_id, table_id, branch_id } = body;

    // ── Existence check ──
    const existing = await pool.query(
      'SELECT reserv_id, table_id, branch_id, reserv_date FROM "RESERVATION" WHERE reserv_id = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Reservation not found");
    }

    const current = existing.rows[0];

    // ── Type checks ──
    let custIdInt = null;
    let tableIdInt = null;
    let branchIdInt = null;

    if (cust_id !== undefined) custIdInt = parsePositiveInt(cust_id, "cust_id");
    if (table_id !== undefined)
      tableIdInt = parsePositiveInt(table_id, "table_id");
    if (branch_id !== undefined)
      branchIdInt = parsePositiveInt(branch_id, "branch_id");

    // ── Date validation ──
    let reservDateParsed = null;
    if (reserv_date !== undefined) {
      reservDateParsed = parseDate(reserv_date, "reserv_date");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (reservDateParsed < today) {
        res.status(400);
        throw new Error("reserv_date cannot be in the past");
      }
    }

    let payDateParsed = null;
    if (pay_date !== undefined) {
      payDateParsed = parseDate(pay_date, "pay_date");
      const baseReservDate = reservDateParsed ?? new Date(current.reserv_date);
      if (payDateParsed < baseReservDate) {
        res.status(400);
        throw new Error("pay_date cannot be earlier than reserv_date");
      }
    }

    // ── Cross-branch validation (if table or branch is changing) ──
    const resolvedTableId = tableIdInt ?? current.table_id;
    const resolvedBranchId = branchIdInt ?? current.branch_id;

    if (tableIdInt !== null || branchIdInt !== null) {
      const tableCheck = await pool.query(
        'SELECT table_id FROM "TABLES" WHERE table_id = $1 AND branch_id = $2',
        [resolvedTableId, resolvedBranchId],
      );
      if (tableCheck.rows.length === 0) {
        res.status(400);
        throw new Error(
          "The specified table does not belong to the given branch",
        );
      }
    }

    // ── Double-booking check (if date or table is changing) ──
    if (reservDateParsed !== null || tableIdInt !== null) {
      const resolvedDate = reservDateParsed ?? new Date(current.reserv_date);
      const conflict = await pool.query(
        `SELECT reserv_id FROM "RESERVATION"
         WHERE table_id = $1 AND reserv_date::date = $2::date AND reserv_id <> $3`,
        [resolvedTableId, resolvedDate, id],
      );
      if (conflict.rows.length > 0) {
        res.status(409);
        throw new Error("Table is already reserved for this date");
      }
    }

    const result = await pool.query(
      `UPDATE "RESERVATION"
       SET
         reserv_date = COALESCE($1, reserv_date),
         pay_date    = COALESCE($2, pay_date),
         cust_id     = COALESCE($3, cust_id),
         table_id    = COALESCE($4, table_id),
         branch_id   = COALESCE($5, branch_id)
       WHERE reserv_id = $6
       RETURNING reserv_id, reserv_date, pay_date, cust_id, table_id, branch_id`,
      [reservDateParsed, payDateParsed, custIdInt, tableIdInt, branchIdInt, id],
    );

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

// ─── DELETE /api/reservations/:id ───────────────────────────────────────────
export async function deleteReservation(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "reserv_id");

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
      res.status(409);
      return next(
        new Error("Cannot delete reservation because it is currently in use"),
      );
    }
    next(err);
  }
}

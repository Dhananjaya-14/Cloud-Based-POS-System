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
  // Normalize to midnight UTC to avoid timezone drift
  return new Date(d.toISOString().split("T")[0] + "T00:00:00.000Z");
}

/**
 * Validates time string — must be HH:MM or HH:MM:SS (24-hour)
 */
function parseTime(value, fieldName) {
  if (typeof value !== "string") {
    throw Object.assign(
      new Error(`${fieldName} must be a string in HH:MM or HH:MM:SS format`),
      { status: 400 },
    );
  }
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
  if (!timeRegex.test(value.trim())) {
    throw Object.assign(
      new Error(`${fieldName} must be a valid 24-hour time (e.g. 14:30)`),
      { status: 400 },
    );
  }
  return value.trim();
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

/**
 * pay_date is the advance payment date.
 * Rule: must be strictly before reserv_date
 * (customer pays the deposit ahead of the reservation).
 */
function validatePayDate(payDateParsed, reservDateParsed) {
  if (payDateParsed >= reservDateParsed) {
    throw Object.assign(
      new Error("pay_date (advance payment) must be before reserv_date"),
      { status: 400 },
    );
  }
}

// ─── GET /api/reservations ───────────────────────────────────────────────────
export async function getReservations(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT reserv_id, reserv_date, reserv_time, duration_minutes,
              pay_date, cust_id, table_id, branch_id
       FROM "RESERVATION"
       ORDER BY reserv_date DESC, reserv_time ASC`,
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
      `SELECT reserv_id, reserv_date, reserv_time, duration_minutes,
              pay_date, cust_id, table_id, branch_id
       FROM "RESERVATION"
       WHERE reserv_id = $1`,
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
      `SELECT reserv_id, reserv_date, reserv_time, duration_minutes,
              pay_date, cust_id, table_id, branch_id
       FROM "RESERVATION"
       WHERE branch_id = $1
       ORDER BY reserv_date DESC, reserv_time ASC`,
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
      `SELECT reserv_id, reserv_date, reserv_time, duration_minutes,
              pay_date, cust_id, table_id, branch_id
       FROM "RESERVATION"
       WHERE cust_id = $1
       ORDER BY reserv_date DESC, reserv_time ASC`,
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
      `SELECT reserv_id, reserv_date, reserv_time, duration_minutes,
              pay_date, cust_id, table_id, branch_id
       FROM "RESERVATION"
       WHERE table_id = $1
       ORDER BY reserv_date DESC, reserv_time ASC`,
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
      "reserv_time",
      "duration_minutes",
      "pay_date",
      "cust_id",
      "table_id",
      "branch_id",
    ]);

    const {
      reserv_date,
      reserv_time,
      duration_minutes,
      pay_date,
      cust_id,
      table_id,
      branch_id,
    } = body;

    // ── Required fields ──
    if (!reserv_date || !reserv_time || !cust_id || !table_id || !branch_id) {
      res.status(400);
      throw new Error(
        "reserv_date, reserv_time, cust_id, table_id and branch_id are required",
      );
    }

    // ── Type checks ──
    const custIdInt = parsePositiveInt(cust_id, "cust_id");
    const tableIdInt = parsePositiveInt(table_id, "table_id");
    const branchIdInt = parsePositiveInt(branch_id, "branch_id");

    // duration_minutes — optional, defaults to 60 (matches DB DEFAULT), max 8 hours
    let durationInt = 60;
    if (duration_minutes !== undefined) {
      durationInt = parsePositiveInt(duration_minutes, "duration_minutes");
      if (durationInt > 480) {
        res.status(400);
        throw new Error("duration_minutes cannot exceed 480 (8 hours)");
      }
    }

    // ── reserv_date: must not be in the past ──
    const reservDate = parseDate(reserv_date, "reserv_date");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (reservDate < today) {
      res.status(400);
      throw new Error("reserv_date cannot be in the past");
    }

    // ── reserv_time: valid format ──
    const reservTime = parseTime(reserv_time, "reserv_time");

    // ── If today's date, time must not already be past ──
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    if (reservDate.getTime() === todayDate.getTime()) {
      const now = new Date();
      const [hours, minutes] = reservTime.split(":").map(Number);
      const slotTime = new Date();
      slotTime.setHours(hours, minutes, 0, 0);
      if (slotTime <= now) {
        res.status(400);
        throw new Error("reserv_time cannot be in the past for today's date");
      }
    }

    // ── pay_date: advance payment date — must be today or earlier, and <= reserv_date ──
    let payDateParsed = null;
    if (pay_date) {
      payDateParsed = parseDate(pay_date, "pay_date");
      validatePayDate(payDateParsed, reservDate);
    }

    // ── Cross-branch: table must belong to the given branch ──
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

    // ── Occupied check: only block if reserving TODAY and table is currently occupied ──
    // A table occupied right now can still be booked for future dates/times
    const isToday = reservDate.getTime() === todayDate.getTime();
    if (isToday && tableCheck.rows[0].table_status === "occupied") {
      const now = new Date();
      const [slotHours, slotMinutes] = reservTime.split(":").map(Number);
      const slotStart = new Date();
      slotStart.setHours(slotHours, slotMinutes, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationInt * 60000);

      // Block only if the requested time slot overlaps with right now
      if (slotStart <= now && now < slotEnd) {
        res.status(409);
        throw new Error(
          "Table is currently occupied — cannot reserve for an ongoing time slot",
        );
      }
    }

    // ── Time-slot overlap check ──
    // Overlap: existing_start < new_end  AND  existing_end > new_start
    const overlapCheck = await pool.query(
      `SELECT reserv_id
       FROM "RESERVATION"
       WHERE table_id = $1
         AND reserv_date::date = $2::date
         AND reserv_time < (CAST($3 AS TIME) + ($4 || ' minutes')::INTERVAL)
         AND (reserv_time + (duration_minutes || ' minutes')::INTERVAL) > CAST($3 AS TIME)`,
      [tableIdInt, reservDate, reservTime, durationInt],
    );
    if (overlapCheck.rows.length > 0) {
      res.status(409);
      throw new Error(
        "This table already has a reservation that overlaps with the requested time slot",
      );
    }

    const result = await pool.query(
      `INSERT INTO "RESERVATION"
         (reserv_date, reserv_time, duration_minutes, pay_date, cust_id, table_id, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING reserv_id, reserv_date, reserv_time, duration_minutes,
                 pay_date, cust_id, table_id, branch_id`,
      [
        reservDate,
        reservTime,
        durationInt,
        payDateParsed,
        custIdInt,
        tableIdInt,
        branchIdInt,
      ],
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
      "reserv_time",
      "duration_minutes",
      "pay_date",
      "cust_id",
      "table_id",
      "branch_id",
    ]);

    const {
      reserv_date,
      reserv_time,
      duration_minutes,
      pay_date,
      cust_id,
      table_id,
      branch_id,
    } = body;

    // ── Existence check ──
    const existing = await pool.query(
      `SELECT reserv_id, table_id, branch_id, reserv_date, reserv_time, duration_minutes
       FROM "RESERVATION" WHERE reserv_id = $1`,
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

    let durationInt = null;
    if (duration_minutes !== undefined) {
      durationInt = parsePositiveInt(duration_minutes, "duration_minutes");
      if (durationInt > 480) {
        res.status(400);
        throw new Error("duration_minutes cannot exceed 480 (8 hours)");
      }
    }

    // ── reserv_date validation ──
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

    // ── reserv_time validation ──
    let reservTimeParsed = null;
    if (reserv_time !== undefined) {
      reservTimeParsed = parseTime(reserv_time, "reserv_time");
    }

    // ── pay_date: advance payment — must be today or earlier, and <= reserv_date ──
    let payDateParsed = null;
    if (pay_date !== undefined) {
      payDateParsed = parseDate(pay_date, "pay_date");
      const baseReservDate =
        reservDateParsed ??
        parseDate(current.reserv_date.toISOString(), "reserv_date");
      validatePayDate(payDateParsed, baseReservDate);
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

    // ── Time-slot overlap check (only when something time-related is changing) ──
    if (
      reservDateParsed !== null ||
      reservTimeParsed !== null ||
      durationInt !== null ||
      tableIdInt !== null
    ) {
      const resolvedDate = reservDateParsed ?? current.reserv_date;
      const resolvedTime = reservTimeParsed ?? current.reserv_time;
      const resolvedDuration = durationInt ?? current.duration_minutes;

      const overlapCheck = await pool.query(
        `SELECT reserv_id
         FROM "RESERVATION"
         WHERE table_id = $1
           AND reserv_date::date = $2::date
           AND reserv_id <> $3
           AND reserv_time < (CAST($4 AS TIME) + ($5 || ' minutes')::INTERVAL)
           AND (reserv_time + (duration_minutes || ' minutes')::INTERVAL) > CAST($4 AS TIME)`,
        [resolvedTableId, resolvedDate, id, resolvedTime, resolvedDuration],
      );
      if (overlapCheck.rows.length > 0) {
        res.status(409);
        throw new Error(
          "This table already has a reservation that overlaps with the requested time slot",
        );
      }
    }

    const result = await pool.query(
      `UPDATE "RESERVATION"
       SET
         reserv_date      = COALESCE($1, reserv_date),
         reserv_time      = COALESCE($2, reserv_time),
         duration_minutes = COALESCE($3, duration_minutes),
         pay_date         = COALESCE($4, pay_date),
         cust_id          = COALESCE($5, cust_id),
         table_id         = COALESCE($6, table_id),
         branch_id        = COALESCE($7, branch_id)
       WHERE reserv_id = $8
       RETURNING reserv_id, reserv_date, reserv_time, duration_minutes,
                 pay_date, cust_id, table_id, branch_id`,
      [
        reservDateParsed,
        reservTimeParsed,
        durationInt,
        payDateParsed,
        custIdInt,
        tableIdInt,
        branchIdInt,
        id,
      ],
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

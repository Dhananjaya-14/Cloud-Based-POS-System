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

// Strict YYYY-MM-DD only
function parseDate(value, fieldName) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    throw Object.assign(
      new Error(`${fieldName} must be a valid date in YYYY-MM-DD format`),
      { status: 400 },
    );
  }
  const d = new Date(value.trim());
  if (isNaN(d.getTime())) {
    throw Object.assign(
      new Error(`${fieldName} must be a valid date in YYYY-MM-DD format`),
      { status: 400 },
    );
  }
  return value.trim();
}

// HH:MM or HH:MM:SS 24-hour format
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

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

// pay_date must be strictly before reserv_date
function validatePayDate(payDateStr, reservDateStr) {
  if (payDateStr >= reservDateStr) {
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
      `SELECT
         r.reserv_id,
         r.reserv_date,
         r.reserv_time,
         r.duration_minutes,
         r.pay_date,
         r.cust_id,
         r.table_id,
         r.branch_id,
         c.cust_name,
         c.cust_phone,
         t.table_number,
         b."B_name" AS branch_name
       FROM "RESERVATION" r
       LEFT JOIN "CUSTOMER" c  ON r.cust_id   = c.cust_id
       LEFT JOIN "TABLES"   t  ON r.table_id  = t.table_id
       LEFT JOIN "Branch"   b  ON r.branch_id = b."B_id"
       ORDER BY r.reserv_date DESC, r.reserv_time ASC`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/reservations/:id ───────────────────────────────────────────────
export async function getReservationById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "reserv_id");

    const result = await pool.query(
      `SELECT
         r.reserv_id,
         r.reserv_date,
         r.reserv_time,
         r.duration_minutes,
         r.pay_date,
         r.cust_id,
         r.table_id,
         r.branch_id,
         c.cust_name,
         c.cust_phone,
         t.table_number,
         b."B_name" AS branch_name
       FROM "RESERVATION" r
       LEFT JOIN "CUSTOMER" c  ON r.cust_id   = c.cust_id
       LEFT JOIN "TABLES"   t  ON r.table_id  = t.table_id
       LEFT JOIN "Branch"   b  ON r.branch_id = b."B_id"
       WHERE r.reserv_id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      return next(new Error("Reservation not found"));
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/reservations/branch/:branchId ──────────────────────────────────
export async function getReservationsByBranch(req, res, next) {
  try {
    const branchId = parsePositiveInt(req.params.branchId, "branch_id");

    // Confirm branch exists
    const branchCheck = await pool.query(
      'SELECT "B_id" FROM "Branch" WHERE "B_id" = $1',
      [branchId],
    );
    if (branchCheck.rows.length === 0) {
      res.status(404);
      return next(new Error("Branch not found"));
    }

    const result = await pool.query(
      `SELECT
         r.reserv_id,
         r.reserv_date,
         r.reserv_time,
         r.duration_minutes,
         r.pay_date,
         r.cust_id,
         r.table_id,
         r.branch_id,
         c.cust_name,
         c.cust_phone,
         t.table_number,
         b."B_name" AS branch_name
       FROM "RESERVATION" r
       LEFT JOIN "CUSTOMER" c  ON r.cust_id   = c.cust_id
       LEFT JOIN "TABLES"   t  ON r.table_id  = t.table_id
       LEFT JOIN "Branch"   b  ON r.branch_id = b."B_id"
       WHERE r.branch_id = $1
       ORDER BY r.reserv_date DESC, r.reserv_time ASC`,
      [branchId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/reservations/customer/:custId ──────────────────────────────────
export async function getReservationsByCustomer(req, res, next) {
  try {
    const custId = parsePositiveInt(req.params.custId, "cust_id");

    // Confirm customer exists
    const custCheck = await pool.query(
      'SELECT cust_id FROM "CUSTOMER" WHERE cust_id = $1',
      [custId],
    );
    if (custCheck.rows.length === 0) {
      res.status(404);
      return next(new Error("Customer not found"));
    }

    const result = await pool.query(
      `SELECT
         r.reserv_id,
         r.reserv_date,
         r.reserv_time,
         r.duration_minutes,
         r.pay_date,
         r.cust_id,
         r.table_id,
         r.branch_id,
         c.cust_name,
         c.cust_phone,
         t.table_number,
         b."B_name" AS branch_name
       FROM "RESERVATION" r
       LEFT JOIN "CUSTOMER" c  ON r.cust_id   = c.cust_id
       LEFT JOIN "TABLES"   t  ON r.table_id  = t.table_id
       LEFT JOIN "Branch"   b  ON r.branch_id = b."B_id"
       WHERE r.cust_id = $1
       ORDER BY r.reserv_date DESC, r.reserv_time ASC`,
      [custId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/reservations/table/:tableId ────────────────────────────────────
export async function getReservationsByTable(req, res, next) {
  try {
    const tableId = parsePositiveInt(req.params.tableId, "table_id");

    // Confirm table exists
    const tableCheck = await pool.query(
      'SELECT table_id FROM "TABLES" WHERE table_id = $1',
      [tableId],
    );
    if (tableCheck.rows.length === 0) {
      res.status(404);
      return next(new Error("Table not found"));
    }

    const result = await pool.query(
      `SELECT
         r.reserv_id,
         r.reserv_date,
         r.reserv_time,
         r.duration_minutes,
         r.pay_date,
         r.cust_id,
         r.table_id,
         r.branch_id,
         c.cust_name,
         c.cust_phone,
         t.table_number,
         b."B_name" AS branch_name
       FROM "RESERVATION" r
       LEFT JOIN "CUSTOMER" c  ON r.cust_id   = c.cust_id
       LEFT JOIN "TABLES"   t  ON r.table_id  = t.table_id
       LEFT JOIN "Branch"   b  ON r.branch_id = b."B_id"
       WHERE r.table_id = $1
       ORDER BY r.reserv_date DESC, r.reserv_time ASC`,
      [tableId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/reservations ──────────────────────────────────────────────────
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

    // Required fields
    if (!reserv_date || !reserv_time || !cust_id || !table_id || !branch_id) {
      res.status(400);
      return next(
        new Error(
          "reserv_date, reserv_time, cust_id, table_id and branch_id are required",
        ),
      );
    }

    const custIdInt = parsePositiveInt(cust_id, "cust_id");
    const tableIdInt = parsePositiveInt(table_id, "table_id");
    const branchIdInt = parsePositiveInt(branch_id, "branch_id");

    // duration_minutes — optional, default 60, max 480 (8 hours)
    let durationInt = 60;
    if (duration_minutes !== undefined) {
      durationInt = parsePositiveInt(duration_minutes, "duration_minutes");
      if (durationInt < 15) {
        res.status(400);
        return next(new Error("duration_minutes must be at least 15"));
      }
      if (durationInt > 480) {
        res.status(400);
        return next(new Error("duration_minutes cannot exceed 480 (8 hours)"));
      }
    }

    const dateStr = parseDate(reserv_date, "reserv_date");
    const timeStr = parseTime(reserv_time, "reserv_time");
    const today = getTodayStr();

    // No past dates
    if (dateStr < today) {
      res.status(400);
      return next(new Error("reserv_date cannot be in the past"));
    }

    // Max 90 days in advance — realistic restaurant booking window
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    const maxDateStr = maxDate.toISOString().split("T")[0];
    if (dateStr > maxDateStr) {
      res.status(400);
      return next(
        new Error("reserv_date cannot be more than 90 days in advance"),
      );
    }

    // If today — time must not already be past
    if (dateStr === today) {
      const now = new Date();
      const [h, m] = timeStr.split(":").map(Number);
      const slotTime = new Date();
      slotTime.setHours(h, m, 0, 0);
      if (slotTime <= now) {
        res.status(400);
        return next(
          new Error("reserv_time cannot be in the past for today's date"),
        );
      }
    }

    // pay_date must be before reserv_date
    let payDateStr = null;
    if (pay_date) {
      payDateStr = parseDate(pay_date, "pay_date");
      validatePayDate(payDateStr, dateStr);
    }

    // Customer existence check
    const custCheck = await pool.query(
      'SELECT cust_id FROM "CUSTOMER" WHERE cust_id = $1',
      [custIdInt],
    );
    if (custCheck.rows.length === 0) {
      res.status(404);
      return next(new Error("Customer not found"));
    }

    // Table must belong to the given branch
    const tableCheck = await pool.query(
      'SELECT table_id, table_status, table_capacity FROM "TABLES" WHERE table_id = $1 AND branch_id = $2',
      [tableIdInt, branchIdInt],
    );
    if (tableCheck.rows.length === 0) {
      res.status(400);
      return next(
        new Error("The specified table does not belong to the given branch"),
      );
    }

    // Block if table is occupied RIGHT NOW and reservation is for now
    if (dateStr === today && tableCheck.rows[0].table_status === "occupied") {
      const now = new Date();
      const [h, m] = timeStr.split(":").map(Number);
      const slotStart = new Date();
      slotStart.setHours(h, m, 0, 0);
      const slotEnd = new Date(slotStart.getTime() + durationInt * 60000);
      if (slotStart <= now && now < slotEnd) {
        res.status(409);
        return next(
          new Error(
            "Table is currently occupied — cannot reserve for an ongoing time slot",
          ),
        );
      }
    }

    // Time-slot overlap check
    // Overlap condition: existing_start < new_end AND existing_end > new_start
    const overlapCheck = await pool.query(
      `SELECT reserv_id FROM "RESERVATION"
       WHERE table_id = $1
         AND reserv_date::date = $2::date
         AND reserv_time < (CAST($3 AS TIME) + ($4 || ' minutes')::INTERVAL)
         AND (reserv_time + (duration_minutes || ' minutes')::INTERVAL) > CAST($3 AS TIME)`,
      [tableIdInt, dateStr, timeStr, durationInt],
    );
    if (overlapCheck.rows.length > 0) {
      res.status(409);
      return next(
        new Error(
          "This table already has a reservation that overlaps with the requested time slot",
        ),
      );
    }

    // Customer double-booking check — same customer, same date, overlapping time
    const custOverlap = await pool.query(
      `SELECT reserv_id FROM "RESERVATION"
       WHERE cust_id = $1
         AND reserv_date::date = $2::date
         AND reserv_time < (CAST($3 AS TIME) + ($4 || ' minutes')::INTERVAL)
         AND (reserv_time + (duration_minutes || ' minutes')::INTERVAL) > CAST($3 AS TIME)`,
      [custIdInt, dateStr, timeStr, durationInt],
    );
    if (custOverlap.rows.length > 0) {
      res.status(409);
      return next(
        new Error(
          "This customer already has a reservation that overlaps with the requested time slot",
        ),
      );
    }

    const result = await pool.query(
      `INSERT INTO "RESERVATION"
         (reserv_date, reserv_time, duration_minutes, pay_date, cust_id, table_id, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING
         reserv_id, reserv_date, reserv_time, duration_minutes,
         pay_date, cust_id, table_id, branch_id`,
      [
        dateStr,
        timeStr,
        durationInt,
        payDateStr,
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

// ─── PUT /api/reservations/:id ───────────────────────────────────────────────
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

    // Reject empty body
    if (
      reserv_date === undefined &&
      reserv_time === undefined &&
      duration_minutes === undefined &&
      pay_date === undefined &&
      cust_id === undefined &&
      table_id === undefined &&
      branch_id === undefined
    ) {
      res.status(400);
      return next(new Error("No fields provided to update"));
    }

    // Existence check
    const existing = await pool.query(
      `SELECT reserv_id, table_id, branch_id, cust_id,
              reserv_date, reserv_time, duration_minutes
       FROM "RESERVATION" WHERE reserv_id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      return next(new Error("Reservation not found"));
    }

    const current = existing.rows[0];

    // Block editing past reservations
    const currentDateStr = new Date(current.reserv_date)
      .toISOString()
      .split("T")[0];
    const today = getTodayStr();
    if (currentDateStr < today) {
      res.status(409);
      return next(new Error("Cannot edit a past reservation"));
    }

    let custIdInt = null;
    let tableIdInt = null;
    let branchIdInt = null;
    let durationInt = null;
    let dateStr = null;
    let timeStr = null;
    let payDateStr = null;

    if (cust_id !== undefined) custIdInt = parsePositiveInt(cust_id, "cust_id");
    if (table_id !== undefined)
      tableIdInt = parsePositiveInt(table_id, "table_id");
    if (branch_id !== undefined)
      branchIdInt = parsePositiveInt(branch_id, "branch_id");

    if (duration_minutes !== undefined) {
      durationInt = parsePositiveInt(duration_minutes, "duration_minutes");
      if (durationInt < 15) {
        res.status(400);
        return next(new Error("duration_minutes must be at least 15"));
      }
      if (durationInt > 480) {
        res.status(400);
        return next(new Error("duration_minutes cannot exceed 480 (8 hours)"));
      }
    }

    if (reserv_date !== undefined) {
      dateStr = parseDate(reserv_date, "reserv_date");
      if (dateStr < today) {
        res.status(400);
        return next(new Error("reserv_date cannot be in the past"));
      }
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 90);
      if (dateStr > maxDate.toISOString().split("T")[0]) {
        res.status(400);
        return next(
          new Error("reserv_date cannot be more than 90 days in advance"),
        );
      }
    }

    if (reserv_time !== undefined) {
      timeStr = parseTime(reserv_time, "reserv_time");
    }

    // If rescheduling to today, time must not be past
    const resolvedDate = dateStr ?? currentDateStr;
    const resolvedTime = timeStr ?? current.reserv_time;
    if (resolvedDate === today && timeStr !== null) {
      const now = new Date();
      const [h, m] = resolvedTime.split(":").map(Number);
      const slotTime = new Date();
      slotTime.setHours(h, m, 0, 0);
      if (slotTime <= now) {
        res.status(400);
        return next(
          new Error("reserv_time cannot be in the past for today's date"),
        );
      }
    }

    if (pay_date !== undefined) {
      payDateStr = parseDate(pay_date, "pay_date");
      validatePayDate(payDateStr, resolvedDate);
    }

    // Customer existence check
    if (custIdInt !== null) {
      const custCheck = await pool.query(
        'SELECT cust_id FROM "CUSTOMER" WHERE cust_id = $1',
        [custIdInt],
      );
      if (custCheck.rows.length === 0) {
        res.status(404);
        return next(new Error("Customer not found"));
      }
    }

    // Cross-branch: table must belong to the resolved branch
    const resolvedTableId = tableIdInt ?? current.table_id;
    const resolvedBranchId = branchIdInt ?? current.branch_id;

    if (tableIdInt !== null || branchIdInt !== null) {
      const tableCheck = await pool.query(
        'SELECT table_id FROM "TABLES" WHERE table_id = $1 AND branch_id = $2',
        [resolvedTableId, resolvedBranchId],
      );
      if (tableCheck.rows.length === 0) {
        res.status(400);
        return next(
          new Error("The specified table does not belong to the given branch"),
        );
      }
    }

    const resolvedDuration = durationInt ?? current.duration_minutes;
    const resolvedCustId = custIdInt ?? current.cust_id;

    // Time-slot overlap check (only when time-related fields are changing)
    if (
      dateStr !== null ||
      timeStr !== null ||
      durationInt !== null ||
      tableIdInt !== null
    ) {
      const overlapCheck = await pool.query(
        `SELECT reserv_id FROM "RESERVATION"
         WHERE table_id = $1
           AND reserv_date::date = $2::date
           AND reserv_id <> $3
           AND reserv_time < (CAST($4 AS TIME) + ($5 || ' minutes')::INTERVAL)
           AND (reserv_time + (duration_minutes || ' minutes')::INTERVAL) > CAST($4 AS TIME)`,
        [resolvedTableId, resolvedDate, id, resolvedTime, resolvedDuration],
      );
      if (overlapCheck.rows.length > 0) {
        res.status(409);
        return next(
          new Error(
            "This table already has a reservation that overlaps with the requested time slot",
          ),
        );
      }

      // Customer double-booking check excluding self
      const custOverlap = await pool.query(
        `SELECT reserv_id FROM "RESERVATION"
         WHERE cust_id = $1
           AND reserv_date::date = $2::date
           AND reserv_id <> $3
           AND reserv_time < (CAST($4 AS TIME) + ($5 || ' minutes')::INTERVAL)
           AND (reserv_time + (duration_minutes || ' minutes')::INTERVAL) > CAST($4 AS TIME)`,
        [resolvedCustId, resolvedDate, id, resolvedTime, resolvedDuration],
      );
      if (custOverlap.rows.length > 0) {
        res.status(409);
        return next(
          new Error(
            "This customer already has a reservation that overlaps with the requested time slot",
          ),
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
       RETURNING
         reserv_id, reserv_date, reserv_time, duration_minutes,
         pay_date, cust_id, table_id, branch_id`,
      [
        dateStr,
        timeStr,
        durationInt,
        payDateStr,
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

// ─── DELETE /api/reservations/:id ────────────────────────────────────────────
export async function deleteReservation(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "reserv_id");

    const reservation = await pool.query(
      'SELECT reserv_date, reserv_time FROM "RESERVATION" WHERE reserv_id = $1',
      [id],
    );
    if (reservation.rows.length === 0) {
      res.status(404);
      return next(new Error("Reservation not found"));
    }

    const reservDateStr = new Date(reservation.rows[0].reserv_date)
      .toISOString()
      .split("T")[0];
    const today = getTodayStr();

    // Block cancelling past reservations — they are historical records
    if (reservDateStr < today) {
      res.status(409);
      return next(
        new Error(
          "Cannot delete a past reservation. It is a historical record.",
        ),
      );
    }

    // Block cancelling if reservation starts within the next 30 minutes
    if (reservDateStr === today) {
      const now = new Date();
      const [h, m] = reservation.rows[0].reserv_time.split(":").map(Number);
      const slotStart = new Date();
      slotStart.setHours(h, m, 0, 0);
      const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60000);
      if (slotStart <= thirtyMinutesFromNow) {
        res.status(409);
        return next(
          new Error(
            "Cannot cancel a reservation starting within 30 minutes. Please contact the customer directly.",
          ),
        );
      }
    }

    await pool.query('DELETE FROM "RESERVATION" WHERE reserv_id = $1', [id]);

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

export default {
  getReservations,
  getReservationById,
  getReservationsByBranch,
  getReservationsByCustomer,
  getReservationsByTable,
  createReservation,
  updateReservation,
  deleteReservation,
};

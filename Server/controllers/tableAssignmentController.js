import pool from "../config/database.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_SHIFTS = ["morning", "afternoon", "evening"];

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

// ─── GET /api/table-assignments ──────────────────────────────────────────────
export async function getTableAssignments(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT
         ta.assign_id,
         ta.table_id,
         ta.u_id,
         ta.assigned_date,
         ta.shift,
         ta.notes,
         ta.created_at,
         ta.updated_at,
         t.table_number,
         t.table_capacity,
         t.table_status,
         u.u_fname,
         u.u_lname
       FROM "TABLE_ASSIGNMENT" ta
       LEFT JOIN "TABLES" t ON ta.table_id = t.table_id
       LEFT JOIN "User"   u ON ta.u_id     = u.u_id
       ORDER BY ta.assigned_date DESC, ta.shift, ta.assign_id`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/table-assignments/:id ──────────────────────────────────────────
export async function getTableAssignmentById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "assign_id");

    const result = await pool.query(
      `SELECT
         ta.assign_id,
         ta.table_id,
         ta.u_id,
         ta.assigned_date,
         ta.shift,
         ta.notes,
         ta.created_at,
         ta.updated_at,
         t.table_number,
         t.table_capacity,
         t.table_status,
         u.u_fname,
         u.u_lname
       FROM "TABLE_ASSIGNMENT" ta
       LEFT JOIN "TABLES" t ON ta.table_id = t.table_id
       LEFT JOIN "User"   u ON ta.u_id     = u.u_id
       WHERE ta.assign_id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      return next(new Error("Assignment not found"));
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/table-assignments/table/:tableId ───────────────────────────────
export async function getAssignmentsByTable(req, res, next) {
  try {
    const tableId = parsePositiveInt(req.params.tableId, "table_id");

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
         ta.assign_id,
         ta.table_id,
         ta.u_id,
         ta.assigned_date,
         ta.shift,
         ta.notes,
         ta.created_at,
         ta.updated_at,
         t.table_number,
         t.table_capacity,
         t.table_status,
         u.u_fname,
         u.u_lname
       FROM "TABLE_ASSIGNMENT" ta
       LEFT JOIN "TABLES" t ON ta.table_id = t.table_id
       LEFT JOIN "User"   u ON ta.u_id     = u.u_id
       WHERE ta.table_id = $1
       ORDER BY ta.assigned_date DESC, ta.shift`,
      [tableId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/table-assignments/user/:userId ─────────────────────────────────
export async function getAssignmentsByUser(req, res, next) {
  try {
    const userId = parsePositiveInt(req.params.userId, "u_id");

    const userCheck = await pool.query(
      'SELECT u_id FROM "User" WHERE u_id = $1',
      [userId],
    );
    if (userCheck.rows.length === 0) {
      res.status(404);
      return next(new Error("User not found"));
    }

    const result = await pool.query(
      `SELECT
         ta.assign_id,
         ta.table_id,
         ta.u_id,
         ta.assigned_date,
         ta.shift,
         ta.notes,
         ta.created_at,
         ta.updated_at,
         t.table_number,
         t.table_capacity,
         t.table_status,
         u.u_fname,
         u.u_lname
       FROM "TABLE_ASSIGNMENT" ta
       LEFT JOIN "TABLES" t ON ta.table_id = t.table_id
       LEFT JOIN "User"   u ON ta.u_id     = u.u_id
       WHERE ta.u_id = $1
       ORDER BY ta.assigned_date DESC, ta.shift`,
      [userId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/table-assignments ─────────────────────────────────────────────
export async function createTableAssignment(req, res, next) {
  try {
    const body = sanitizeBody(req.body, [
      "table_id",
      "u_id",
      "assigned_date",
      "shift",
      "notes",
    ]);
    const { table_id, u_id, assigned_date, shift, notes } = body;

    // Required fields
    if (!table_id || !u_id || !assigned_date || !shift) {
      res.status(400);
      return next(
        new Error("table_id, u_id, assigned_date and shift are required"),
      );
    }

    // Shift validation
    if (!VALID_SHIFTS.includes(shift)) {
      res.status(400);
      return next(
        new Error(`shift must be one of: ${VALID_SHIFTS.join(", ")}`),
      );
    }

    const tableIdInt = parsePositiveInt(table_id, "table_id");
    const uIdInt = parsePositiveInt(u_id, "u_id");
    const dateStr = parseDate(assigned_date, "assigned_date");

    // Notes length check
    if (notes && notes.length > 225) {
      res.status(400);
      return next(new Error("notes must be 225 characters or fewer"));
    }

    // No past dates
    const today = getTodayStr();
    if (dateStr < today) {
      res.status(400);
      return next(new Error("assigned_date cannot be in the past"));
    }

    // Max 30 days in advance
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const maxDateStr = maxDate.toISOString().split("T")[0];
    if (dateStr > maxDateStr) {
      res.status(400);
      return next(
        new Error("assigned_date cannot be more than 30 days in advance"),
      );
    }

    // Table existence check
    const tableCheck = await pool.query(
      'SELECT table_id, table_status FROM "TABLES" WHERE table_id = $1',
      [tableIdInt],
    );
    if (tableCheck.rows.length === 0) {
      res.status(404);
      return next(new Error("Table not found"));
    }

    // User existence + Waiter role check (role_id = 8)
    const userCheck = await pool.query(
      'SELECT u_id, role_id FROM "User" WHERE u_id = $1',
      [uIdInt],
    );
    if (userCheck.rows.length === 0) {
      res.status(404);
      return next(new Error("User not found"));
    }
    if (userCheck.rows[0].role_id !== 8) {
      res.status(400);
      return next(new Error("Only Waiters can be assigned to tables"));
    }

    // One waiter per shift per day — DB unique constraint handles
    // (table_id, assigned_date, shift) but we check first for a clean message
    const tableDuplicate = await pool.query(
      `SELECT assign_id FROM "TABLE_ASSIGNMENT"
       WHERE table_id = $1 AND assigned_date = $2 AND shift = $3`,
      [tableIdInt, dateStr, shift],
    );
    if (tableDuplicate.rows.length > 0) {
      res.status(409);
      return next(
        new Error(
          `This table is already assigned to a waiter for the ${shift} shift on this date`,
        ),
      );
    }

    // One waiter can only work one shift per day at one table
    // (a waiter shouldn't be double-booked across tables in the same shift)
    const waiterShiftCheck = await pool.query(
      `SELECT assign_id FROM "TABLE_ASSIGNMENT"
       WHERE u_id = $1 AND assigned_date = $2 AND shift = $3`,
      [uIdInt, dateStr, shift],
    );
    if (waiterShiftCheck.rows.length > 0) {
      res.status(409);
      return next(
        new Error(
          `This waiter is already assigned to a table for the ${shift} shift on this date`,
        ),
      );
    }

    const result = await pool.query(
      `INSERT INTO "TABLE_ASSIGNMENT"
         (table_id, u_id, assigned_date, shift, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING
         assign_id, table_id, u_id, assigned_date,
         shift, notes, created_at, updated_at`,
      [tableIdInt, uIdInt, dateStr, shift, notes || null],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(409);
      return next(
        new Error(
          "This table is already assigned to a waiter for this shift on this date",
        ),
      );
    }
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error("Invalid reference: table_id or u_id does not exist"),
      );
    }
    if (err?.code === "23514") {
      res.status(400);
      return next(
        new Error(`shift must be one of: ${VALID_SHIFTS.join(", ")}`),
      );
    }
    next(err);
  }
}

// ─── PUT /api/table-assignments/:id ──────────────────────────────────────────
export async function updateTableAssignment(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "assign_id");

    const body = sanitizeBody(req.body, [
      "table_id",
      "u_id",
      "assigned_date",
      "shift",
      "notes",
    ]);
    const { table_id, u_id, assigned_date, shift, notes } = body;

    // Reject empty body
    if (
      table_id === undefined &&
      u_id === undefined &&
      assigned_date === undefined &&
      shift === undefined &&
      notes === undefined
    ) {
      res.status(400);
      return next(new Error("No fields provided to update"));
    }

    // Existence check
    const existing = await pool.query(
      `SELECT assign_id, table_id, u_id, assigned_date, shift
       FROM "TABLE_ASSIGNMENT" WHERE assign_id = $1`,
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      return next(new Error("Assignment not found"));
    }

    const current = existing.rows[0];

    // Block editing past assignments
    const currentDateStr = new Date(current.assigned_date)
      .toISOString()
      .split("T")[0];
    const today = getTodayStr();
    if (currentDateStr < today) {
      res.status(409);
      return next(new Error("Cannot edit a past assignment"));
    }

    // Shift validation
    if (shift !== undefined && !VALID_SHIFTS.includes(shift)) {
      res.status(400);
      return next(
        new Error(`shift must be one of: ${VALID_SHIFTS.join(", ")}`),
      );
    }

    // Notes length check
    if (notes !== undefined && notes !== null && notes.length > 225) {
      res.status(400);
      return next(new Error("notes must be 225 characters or fewer"));
    }

    let tableIdInt = null;
    let uIdInt = null;
    let dateStr = null;

    if (table_id !== undefined)
      tableIdInt = parsePositiveInt(table_id, "table_id");
    if (u_id !== undefined) uIdInt = parsePositiveInt(u_id, "u_id");
    if (assigned_date !== undefined)
      dateStr = parseDate(assigned_date, "assigned_date");

    // Date validations
    if (dateStr) {
      if (dateStr < today) {
        res.status(400);
        return next(new Error("assigned_date cannot be in the past"));
      }
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 30);
      if (dateStr > maxDate.toISOString().split("T")[0]) {
        res.status(400);
        return next(
          new Error("assigned_date cannot be more than 30 days in advance"),
        );
      }
    }

    // Table existence check
    if (tableIdInt !== null) {
      const tableCheck = await pool.query(
        'SELECT table_id FROM "TABLES" WHERE table_id = $1',
        [tableIdInt],
      );
      if (tableCheck.rows.length === 0) {
        res.status(404);
        return next(new Error("Table not found"));
      }
    }

    // User existence + Waiter role check
    if (uIdInt !== null) {
      const userCheck = await pool.query(
        'SELECT u_id, role_id FROM "User" WHERE u_id = $1',
        [uIdInt],
      );
      if (userCheck.rows.length === 0) {
        res.status(404);
        return next(new Error("User not found"));
      }
      if (userCheck.rows[0].role_id !== 8) {
        res.status(400);
        return next(new Error("Only Waiters can be assigned to tables"));
      }
    }

    // Resolve final values for duplicate checks
    const resolvedTableId = tableIdInt ?? current.table_id;
    const resolvedUserId = uIdInt ?? current.u_id;
    const resolvedDate = dateStr ?? currentDateStr;
    const resolvedShift = shift ?? current.shift;

    // Duplicate table + shift + date (excluding self)
    const tableDuplicate = await pool.query(
      `SELECT assign_id FROM "TABLE_ASSIGNMENT"
       WHERE table_id = $1 AND assigned_date = $2
         AND shift = $3 AND assign_id <> $4`,
      [resolvedTableId, resolvedDate, resolvedShift, id],
    );
    if (tableDuplicate.rows.length > 0) {
      res.status(409);
      return next(
        new Error(
          `This table is already assigned to a waiter for the ${resolvedShift} shift on this date`,
        ),
      );
    }

    // Waiter already booked for this shift on this date (excluding self)
    const waiterShiftCheck = await pool.query(
      `SELECT assign_id FROM "TABLE_ASSIGNMENT"
       WHERE u_id = $1 AND assigned_date = $2
         AND shift = $3 AND assign_id <> $4`,
      [resolvedUserId, resolvedDate, resolvedShift, id],
    );
    if (waiterShiftCheck.rows.length > 0) {
      res.status(409);
      return next(
        new Error(
          `This waiter is already assigned to a table for the ${resolvedShift} shift on this date`,
        ),
      );
    }

    const result = await pool.query(
      `UPDATE "TABLE_ASSIGNMENT"
       SET
         table_id      = COALESCE($1, table_id),
         u_id          = COALESCE($2, u_id),
         assigned_date = COALESCE($3, assigned_date),
         shift         = COALESCE($4, shift),
         notes         = COALESCE($5, notes),
         updated_at    = CURRENT_TIMESTAMP
       WHERE assign_id = $6
       RETURNING
         assign_id, table_id, u_id, assigned_date,
         shift, notes, created_at, updated_at`,
      [tableIdInt, uIdInt, dateStr, shift ?? null, notes ?? null, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(409);
      return next(
        new Error(
          "This table is already assigned to a waiter for this shift on this date",
        ),
      );
    }
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error("Invalid reference: table_id or u_id does not exist"),
      );
    }
    if (err?.code === "23514") {
      res.status(400);
      return next(
        new Error(`shift must be one of: ${VALID_SHIFTS.join(", ")}`),
      );
    }
    next(err);
  }
}

// ─── DELETE /api/table-assignments/:id ───────────────────────────────────────
export async function deleteTableAssignment(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "assign_id");

    const assignment = await pool.query(
      'SELECT assigned_date, shift FROM "TABLE_ASSIGNMENT" WHERE assign_id = $1',
      [id],
    );
    if (assignment.rows.length === 0) {
      res.status(404);
      return next(new Error("Assignment not found"));
    }

    const assignedDate = new Date(assignment.rows[0].assigned_date)
      .toISOString()
      .split("T")[0];
    const today = getTodayStr();

    // Block delete of today's or future assignments
    if (assignedDate >= today) {
      res.status(409);
      return next(
        new Error(
          "Cannot delete an active or upcoming assignment. Reassign the waiter first.",
        ),
      );
    }

    await pool.query('DELETE FROM "TABLE_ASSIGNMENT" WHERE assign_id = $1', [
      id,
    ]);

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(409);
      return next(
        new Error("Cannot delete assignment because it is currently in use"),
      );
    }
    next(err);
  }
}

export default {
  getTableAssignments,
  getTableAssignmentById,
  getAssignmentsByTable,
  getAssignmentsByUser,
  createTableAssignment,
  updateTableAssignment,
  deleteTableAssignment,
};

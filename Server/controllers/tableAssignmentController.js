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

// ─── GET /api/table-assignments ─────────────────────────────────────────────
export async function getTableAssignments(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT assign_id, "table_id", "u_id", assigned_date FROM "TABLE_ASSIGNMENT" ORDER BY assign_id',
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/table-assignments/:id ─────────────────────────────────────────
export async function getTableAssignmentById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "assign_id");

    const result = await pool.query(
      'SELECT assign_id, "table_id", "u_id", assigned_date FROM "TABLE_ASSIGNMENT" WHERE assign_id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Assignment not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/table-assignments/table/:tableId ──────────────────────────────
export async function getAssignmentsByTable(req, res, next) {
  try {
    const tableId = parsePositiveInt(req.params.tableId, "table_id");

    const result = await pool.query(
      'SELECT assign_id, "table_id", "u_id", assigned_date FROM "TABLE_ASSIGNMENT" WHERE "table_id" = $1 ORDER BY assigned_date DESC',
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

    const result = await pool.query(
      'SELECT assign_id, "table_id", "u_id", assigned_date FROM "TABLE_ASSIGNMENT" WHERE "u_id" = $1 ORDER BY assigned_date DESC',
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
    const body = sanitizeBody(req.body, ["table_id", "u_id", "assigned_date"]);

    const { table_id, u_id, assigned_date } = body;

    // ── Required fields ──
    if (!table_id || !u_id || !assigned_date) {
      res.status(400);
      throw new Error("table_id, u_id and assigned_date are required");
    }

    // ── Type checks ──
    const tableIdInt = parsePositiveInt(table_id, "table_id");
    const uIdInt = parsePositiveInt(u_id, "u_id");

    // ── Date validation ──
    const assignedDateParsed = parseDate(assigned_date, "assigned_date");

    // ── Table existence check ──
    const tableExists = await pool.query(
      'SELECT table_id FROM "TABLES" WHERE table_id = $1',
      [tableIdInt],
    );
    if (tableExists.rows.length === 0) {
      res.status(404);
      throw new Error("Table not found");
    }

    // ── User existence + role check ──
    // Adjust the role column name to match your actual USERS table schema
    const userExists = await pool.query(
      'SELECT u_id FROM "User" WHERE u_id = $1',
      [uIdInt],
    );
    if (userExists.rows.length === 0) {
      res.status(404);
      throw new Error("User not found");
    }

    // ── Duplicate assignment check: same table, same date ──
    const duplicate = await pool.query(
      `SELECT assign_id FROM "TABLE_ASSIGNMENT"
       WHERE "table_id" = $1 AND assigned_date::date = $2::date`,
      [tableIdInt, assignedDateParsed],
    );
    if (duplicate.rows.length > 0) {
      res.status(409);
      throw new Error(
        "This table is already assigned to a user on the given date",
      );
    }

    const result = await pool.query(
      `INSERT INTO "TABLE_ASSIGNMENT" ("table_id", "u_id", assigned_date)
       VALUES ($1, $2, $3)
       RETURNING assign_id, "table_id", "u_id", assigned_date`,
      [tableIdInt, uIdInt, assignedDateParsed],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error("Invalid foreign key: table_id or u_id does not exist"),
      );
    }
    next(err);
  }
}

// ─── PUT /api/table-assignments/:id ──────────────────────────────────────────
export async function updateTableAssignment(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "assign_id");

    const body = sanitizeBody(req.body, ["table_id", "u_id", "assigned_date"]);

    const { table_id, u_id, assigned_date } = body;

    // ── Existence check ──
    const existing = await pool.query(
      'SELECT assign_id, "table_id", assigned_date FROM "TABLE_ASSIGNMENT" WHERE assign_id = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Assignment not found");
    }

    const current = existing.rows[0];

    // ── Type checks ──
    let tableIdInt = null;
    let uIdInt = null;

    if (table_id !== undefined)
      tableIdInt = parsePositiveInt(table_id, "table_id");
    if (u_id !== undefined) uIdInt = parsePositiveInt(u_id, "u_id");

    // ── Date validation ──
    let assignedDateParsed = null;
    if (assigned_date !== undefined) {
      assignedDateParsed = parseDate(assigned_date, "assigned_date");
    }

    // ── Table existence check ──
    if (tableIdInt !== null) {
      const tableExists = await pool.query(
        'SELECT table_id FROM "TABLES" WHERE table_id = $1',
        [tableIdInt],
      );
      if (tableExists.rows.length === 0) {
        res.status(404);
        throw new Error("Table not found");
      }
    }

    // ── User existence check ──
    if (uIdInt !== null) {
      const userExists = await pool.query(
        'SELECT u_id FROM "User" WHERE u_id = $1',
        [uIdInt],
      );
      if (userExists.rows.length === 0) {
        res.status(404);
        throw new Error("User not found");
      }
    }

    // ── Duplicate assignment check (if table or date is changing) ──
    if (tableIdInt !== null || assignedDateParsed !== null) {
      const resolvedTableId = tableIdInt ?? current.table_id;
      const resolvedDate =
        assignedDateParsed ?? new Date(current.assigned_date);

      const duplicate = await pool.query(
        `SELECT assign_id FROM "TABLE_ASSIGNMENT"
         WHERE "table_id" = $1 AND assigned_date::date = $2::date AND assign_id <> $3`,
        [resolvedTableId, resolvedDate, id],
      );
      if (duplicate.rows.length > 0) {
        res.status(409);
        throw new Error(
          "This table is already assigned to a user on the given date",
        );
      }
    }

    const result = await pool.query(
      `UPDATE "TABLE_ASSIGNMENT"
       SET
         "table_id"    = COALESCE($1, "table_id"),
         "u_id"        = COALESCE($2, "u_id"),
         assigned_date = COALESCE($3, assigned_date)
       WHERE assign_id = $4
       RETURNING assign_id, "table_id", "u_id", assigned_date`,
      [tableIdInt, uIdInt, assignedDateParsed, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error("Invalid foreign key: table_id or u_id does not exist"),
      );
    }
    next(err);
  }
}

// ─── DELETE /api/table-assignments/:id ───────────────────────────────────────
export async function deleteTableAssignment(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "assign_id");

    const result = await pool.query(
      'DELETE FROM "TABLE_ASSIGNMENT" WHERE assign_id = $1 RETURNING assign_id',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Assignment not found");
    }

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

import pool from "../config/database.js";

// GET /api/table-assignments
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

// GET /api/table-assignments/:id
export async function getTableAssignmentById(req, res, next) {
  try {
    const { id } = req.params;
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

// GET /api/table-assignments/table/:tableId
export async function getAssignmentsByTable(req, res, next) {
  try {
    const { tableId } = req.params;
    const result = await pool.query(
      'SELECT assign_id, "table_id", "u_id", assigned_date FROM "TABLE_ASSIGNMENT" WHERE "table_id" = $1 ORDER BY assigned_date DESC',
      [tableId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/table-assignments/user/:userId
export async function getAssignmentsByUser(req, res, next) {
  try {
    const { userId } = req.params;
    const result = await pool.query(
      'SELECT assign_id, "table_id", "u_id", assigned_date FROM "TABLE_ASSIGNMENT" WHERE "u_id" = $1 ORDER BY assigned_date DESC',
      [userId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/table-assignments
export async function createTableAssignment(req, res, next) {
  try {
    const { table_id, u_id, assigned_date } = req.body;

    if (!table_id || !u_id || !assigned_date) {
      res.status(400);
      throw new Error("table_id, u_id and assigned_date are required");
    }

    const insertQuery = `
      INSERT INTO "TABLE_ASSIGNMENT" ("table_id", "u_id", assigned_date)
      VALUES ($1, $2, $3)
      RETURNING assign_id, "table_id", "u_id", assigned_date
    `;

    const result = await pool.query(insertQuery, [
      table_id,
      u_id,
      assigned_date,
    ]);

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

// PUT /api/table-assignments/:id
export async function updateTableAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const { table_id, u_id, assigned_date } = req.body;

    const existing = await pool.query(
      'SELECT assign_id FROM "TABLE_ASSIGNMENT" WHERE assign_id = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Assignment not found");
    }

    const updateQuery = `
      UPDATE "TABLE_ASSIGNMENT"
      SET
        "table_id"    = COALESCE($1, "table_id"),
        "u_id"        = COALESCE($2, "u_id"),
        assigned_date = COALESCE($3, assigned_date)
      WHERE assign_id = $4
      RETURNING assign_id, "table_id", "u_id", assigned_date
    `;

    const result = await pool.query(updateQuery, [
      table_id ?? null,
      u_id ?? null,
      assigned_date ?? null,
      id,
    ]);

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

// DELETE /api/table-assignments/:id
export async function deleteTableAssignment(req, res, next) {
  try {
    const { id } = req.params;

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
      res.status(400);
      return next(
        new Error("Cannot delete assignment because it is currently in use"),
      );
    }
    next(err);
  }
}

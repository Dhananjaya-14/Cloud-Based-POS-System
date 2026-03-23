import pool from "../config/database.js";

// GET /api/tables
export async function getTables(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT table_id, table_number, table_capacity, table_status, branch_id FROM "TABLES" ORDER BY table_id'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/tables/:id
export async function getTableById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT table_id, table_number, table_capacity, table_status, branch_id FROM "TABLES" WHERE table_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Table not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// GET /api/tables/branch/:branchId
export async function getTablesByBranch(req, res, next) {
  try {
    const { branchId } = req.params;
    const result = await pool.query(
      'SELECT table_id, table_number, table_capacity, table_status, branch_id FROM "TABLES" WHERE branch_id = $1 ORDER BY table_number',
      [branchId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/tables
export async function createTable(req, res, next) {
  try {
    const { table_number, table_capacity, table_status, branch_id } = req.body;

    if (!table_number || !table_capacity || !branch_id) {
      res.status(400);
      throw new Error("table_number, table_capacity and branch_id are required");
    }

    const VALID_STATUSES = ["available", "occupied", "reserved"];
    if (table_status && !VALID_STATUSES.includes(table_status)) {
      res.status(400);
      throw new Error("table_status must be one of: available, occupied, reserved");
    }

    const insertQuery = `
      INSERT INTO "TABLES" (table_number, table_capacity, table_status, branch_id)
      VALUES ($1, $2, $3, $4)
      RETURNING table_id, table_number, table_capacity, table_status, branch_id
    `;

    const result = await pool.query(insertQuery, [
      table_number,
      table_capacity,
      table_status || "available",
      branch_id,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Invalid foreign key: branch_id does not exist"));
    }
    if (err?.code === "23514") {
      res.status(400);
      return next(new Error("table_status must be one of: available, occupied, reserved"));
    }
    next(err);
  }
}

// PUT /api/tables/:id
export async function updateTable(req, res, next) {
  try {
    const { id } = req.params;
    const { table_number, table_capacity, table_status, branch_id } = req.body;

    const existing = await pool.query(
      'SELECT table_id FROM "TABLES" WHERE table_id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Table not found");
    }

    const VALID_STATUSES = ["available", "occupied", "reserved"];
    if (table_status && !VALID_STATUSES.includes(table_status)) {
      res.status(400);
      throw new Error("table_status must be one of: available, occupied, reserved");
    }

    const updateQuery = `
      UPDATE "TABLES"
      SET
        table_number   = COALESCE($1, table_number),
        table_capacity = COALESCE($2, table_capacity),
        table_status   = COALESCE($3, table_status),
        branch_id      = COALESCE($4, branch_id)
      WHERE table_id = $5
      RETURNING table_id, table_number, table_capacity, table_status, branch_id
    `;

    const result = await pool.query(updateQuery, [
      table_number ?? null,
      table_capacity ?? null,
      table_status ?? null,
      branch_id ?? null,
      id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Invalid foreign key: branch_id does not exist"));
    }
    if (err?.code === "23514") {
      res.status(400);
      return next(new Error("table_status must be one of: available, occupied, reserved"));
    }
    next(err);
  }
}

// PATCH /api/tables/:id/status
export async function updateTableStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { table_status } = req.body;

    const VALID_STATUSES = ["available", "occupied", "reserved"];
    if (!table_status || !VALID_STATUSES.includes(table_status)) {
      res.status(400);
      throw new Error("table_status must be one of: available, occupied, reserved");
    }

    const result = await pool.query(
      'UPDATE "TABLES" SET table_status = $1 WHERE table_id = $2 RETURNING table_id, table_number, table_capacity, table_status, branch_id',
      [table_status, id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Table not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/tables/:id
export async function deleteTable(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM "TABLES" WHERE table_id = $1 RETURNING table_id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Table not found");
    }

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Cannot delete table because it is currently in use"));
    }
    next(err);
  }
}
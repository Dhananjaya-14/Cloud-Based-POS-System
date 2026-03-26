import pool from "../config/database.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

const VALID_STATUSES = ["available", "occupied", "reserved"];

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`${fieldName} must be a positive integer`), {
      status: 400,
    });
  }
  return parsed;
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

// ─── GET /api/tables ────────────────────────────────────────────────────────
export async function getTables(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT table_id, table_number, table_capacity, table_status, branch_id FROM "TABLES" ORDER BY table_id',
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/tables/:id ────────────────────────────────────────────────────
export async function getTableById(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "table_id");

    const result = await pool.query(
      'SELECT table_id, table_number, table_capacity, table_status, branch_id FROM "TABLES" WHERE table_id = $1',
      [id],
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

// ─── GET /api/tables/branch/:branchId ───────────────────────────────────────
export async function getTablesByBranch(req, res, next) {
  try {
    const branchId = parsePositiveInt(req.params.branchId, "branch_id");

    const result = await pool.query(
      'SELECT table_id, table_number, table_capacity, table_status, branch_id FROM "TABLES" WHERE branch_id = $1 ORDER BY table_number',
      [branchId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/tables ───────────────────────────────────────────────────────
export async function createTable(req, res, next) {
  try {
    const body = sanitizeBody(req.body, [
      "table_number",
      "table_capacity",
      "table_status",
      "branch_id",
    ]);

    const { table_number, table_capacity, table_status, branch_id } = body;

    // ── Required fields ──
    if (!table_number || table_capacity === undefined || !branch_id) {
      res.status(400);
      throw new Error(
        "table_number, table_capacity and branch_id are required",
      );
    }

    // ── Type checks ──
    const capacityInt = parsePositiveInt(table_capacity, "table_capacity");
    if (capacityInt > 50) {
      res.status(400);
      throw new Error("table_capacity cannot exceed 50");
    }

    const branchIdInt = parsePositiveInt(branch_id, "branch_id");

    // ── Status check ──
    const status = table_status || "available";
    if (!VALID_STATUSES.includes(status)) {
      res.status(400);
      throw new Error(
        `table_status must be one of: ${VALID_STATUSES.join(", ")}`,
      );
    }

    // ── Duplicate table_number within branch ──
    const duplicate = await pool.query(
      'SELECT table_id FROM "TABLES" WHERE table_number = $1 AND branch_id = $2',
      [table_number, branchIdInt],
    );
    if (duplicate.rows.length > 0) {
      res.status(409);
      throw new Error(
        `Table number ${table_number} already exists in this branch`,
      );
    }

    const result = await pool.query(
      `INSERT INTO "TABLES" (table_number, table_capacity, table_status, branch_id)
       VALUES ($1, $2, $3, $4)
       RETURNING table_id, table_number, table_capacity, table_status, branch_id`,
      [table_number, capacityInt, status, branchIdInt],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Invalid foreign key: branch_id does not exist"));
    }
    if (err?.code === "23514") {
      res.status(400);
      return next(
        new Error(`table_status must be one of: ${VALID_STATUSES.join(", ")}`),
      );
    }
    next(err);
  }
}

// ─── PUT /api/tables/:id ────────────────────────────────────────────────────
export async function updateTable(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "table_id");

    const body = sanitizeBody(req.body, [
      "table_number",
      "table_capacity",
      "table_status",
      "branch_id",
    ]);

    const { table_number, table_capacity, table_status, branch_id } = body;

    // ── Existence check ──
    const existing = await pool.query(
      'SELECT table_id, branch_id FROM "TABLES" WHERE table_id = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Table not found");
    }

    // ── Type checks ──
    let capacityInt = null;
    if (table_capacity !== undefined) {
      capacityInt = parsePositiveInt(table_capacity, "table_capacity");
      if (capacityInt > 50) {
        res.status(400);
        throw new Error("table_capacity cannot exceed 50");
      }
    }

    let branchIdInt = null;
    if (branch_id !== undefined) {
      branchIdInt = parsePositiveInt(branch_id, "branch_id");
    }

    // ── Status check ──
    if (table_status && !VALID_STATUSES.includes(table_status)) {
      res.status(400);
      throw new Error(
        `table_status must be one of: ${VALID_STATUSES.join(", ")}`,
      );
    }

    // ── Duplicate table_number check (within the resolved branch) ──
    if (table_number !== undefined) {
      const targetBranch = branchIdInt ?? existing.rows[0].branch_id;
      const duplicate = await pool.query(
        'SELECT table_id FROM "TABLES" WHERE table_number = $1 AND branch_id = $2 AND table_id <> $3',
        [table_number, targetBranch, id],
      );
      if (duplicate.rows.length > 0) {
        res.status(409);
        throw new Error(
          `Table number ${table_number} already exists in this branch`,
        );
      }
    }

    const result = await pool.query(
      `UPDATE "TABLES"
       SET
         table_number   = COALESCE($1, table_number),
         table_capacity = COALESCE($2, table_capacity),
         table_status   = COALESCE($3, table_status),
         branch_id      = COALESCE($4, branch_id)
       WHERE table_id = $5
       RETURNING table_id, table_number, table_capacity, table_status, branch_id`,
      [
        table_number ?? null,
        capacityInt,
        table_status ?? null,
        branchIdInt,
        id,
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Invalid foreign key: branch_id does not exist"));
    }
    if (err?.code === "23514") {
      res.status(400);
      return next(
        new Error(`table_status must be one of: ${VALID_STATUSES.join(", ")}`),
      );
    }
    next(err);
  }
}

// ─── PATCH /api/tables/:id/status ───────────────────────────────────────────
export async function updateTableStatus(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "table_id");
    const { table_status } = req.body;

    if (!table_status || !VALID_STATUSES.includes(table_status)) {
      res.status(400);
      throw new Error(
        `table_status must be one of: ${VALID_STATUSES.join(", ")}`,
      );
    }

    // ── Guard: don't mark as available if active reservation exists ──
    if (table_status === "available") {
      const activeReservation = await pool.query(
        `SELECT reserv_id FROM "RESERVATION"
         WHERE table_id = $1 AND reserv_date >= CURRENT_DATE
         LIMIT 1`,
        [id],
      );
      if (activeReservation.rows.length > 0) {
        res.status(409);
        throw new Error(
          "Cannot mark table as available: it has upcoming reservations",
        );
      }
    }

    const result = await pool.query(
      `UPDATE "TABLES" SET table_status = $1 WHERE table_id = $2
       RETURNING table_id, table_number, table_capacity, table_status, branch_id`,
      [table_status, id],
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

// ─── DELETE /api/tables/:id ─────────────────────────────────────────────────
export async function deleteTable(req, res, next) {
  try {
    const id = parsePositiveInt(req.params.id, "table_id");

    // ── Proactive check: active reservations ──
    const activeReservation = await pool.query(
      `SELECT reserv_id FROM "RESERVATION"
       WHERE table_id = $1 AND reserv_date >= CURRENT_DATE
       LIMIT 1`,
      [id],
    );
    if (activeReservation.rows.length > 0) {
      res.status(409);
      throw new Error(
        "Cannot delete table: it has upcoming reservations. Cancel them first.",
      );
    }

    const result = await pool.query(
      'DELETE FROM "TABLES" WHERE table_id = $1 RETURNING table_id',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Table not found");
    }

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(409);
      return next(
        new Error("Cannot delete table because it is currently in use"),
      );
    }
    next(err);
  }
}

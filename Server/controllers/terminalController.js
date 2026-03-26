import pool from "../config/database.js";

// GET /api/terminals
// all terminals
export async function getTerminals(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT "Ter_id", "Ter_name", "B_id" FROM "Terminal" ORDER BY "Ter_id"',
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/terminals/:id
// one terminal by id
export async function getTerminalById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT "Ter_id", "Ter_name", "B_id" FROM "Terminal" WHERE "Ter_id" = $1',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Terminal not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// GET /api/terminals/branch/:branchId
// all terminals by branch
export async function getTerminalsByBranch(req, res, next) {
  try {
    const { branchId } = req.params;
    const result = await pool.query(
      'SELECT "Ter_id", "Ter_name", "B_id" FROM "Terminal" WHERE "B_id" = $1 ORDER BY "Ter_id"',
      [branchId],
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/terminals
// create terminal
export async function createTerminal(req, res, next) {
  try {
    const { Ter_name, B_id } = req.body;

    if (!Ter_name || !B_id) {
      res.status(400);
      throw new Error("Ter_name and B_id are required");
    }

    const insertQuery = `
      INSERT INTO "Terminal" ("Ter_name", "B_id")
      VALUES ($1, $2)
      RETURNING "Ter_id", "Ter_name", "B_id"
    `;

    const result = await pool.query(insertQuery, [Ter_name, B_id]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(400);
      return next(new Error("Duplicate value: terminal name must be unique"));
    }
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Invalid foreign key: B_id does not exist"));
    }
    next(err);
  }
}

// PUT /api/terminals/:id
// update terminal
export async function updateTerminal(req, res, next) {
  try {
    const { id } = req.params;
    const { Ter_name, B_id } = req.body;

    const existing = await pool.query(
      'SELECT "Ter_id" FROM "Terminal" WHERE "Ter_id" = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Terminal not found");
    }

    const updateQuery = `
      UPDATE "Terminal"
      SET
        "Ter_name" = COALESCE($1, "Ter_name"),
        "B_id"     = COALESCE($2, "B_id")
      WHERE "Ter_id" = $3
      RETURNING "Ter_id", "Ter_name", "B_id"
    `;

    const result = await pool.query(updateQuery, [
      Ter_name ?? null,
      B_id ?? null,
      id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(400);
      return next(new Error("Duplicate value: terminal name must be unique"));
    }
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Invalid foreign key: B_id does not exist"));
    }
    next(err);
  }
}

// DELETE /api/terminals/:id
// delete terminal
export async function deleteTerminal(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM "Terminal" WHERE "Ter_id" = $1 RETURNING "Ter_id"',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Terminal not found");
    }

    res.status(204).send();
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(
        new Error("Cannot delete terminal because it is currently in use"),
      );
    }
    next(err);
  }
}

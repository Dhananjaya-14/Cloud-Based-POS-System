import pool from "../config/database.js";

// Shared validator
function validateTerminalFields({ Ter_name, B_id }, isCreate = false) {
  const errors = [];

  if (isCreate) {
    if (!Ter_name) errors.push("Ter_name is required");
    if (!B_id) errors.push("B_id is required");
  }

  if (Ter_name !== undefined) {
    if (typeof Ter_name !== "string" || Ter_name.trim().length === 0)
      errors.push("Ter_name must be a non-empty string");
    else if (Ter_name.trim().length > 100)
      errors.push("Ter_name must be 100 characters or fewer");
    else if (!/^[a-zA-Z0-9\s\-_#.]+$/.test(Ter_name.trim()))
      errors.push("Ter_name contains invalid characters");
  }

  if (B_id !== undefined) {
    const parsed = Number(B_id);
    if (!Number.isInteger(parsed) || parsed <= 0)
      errors.push("B_id must be a positive integer");
  }

  return errors;
}

// GET /api/terminals
export async function getTerminals(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT t."Ter_id", t."Ter_name", t."B_id", b."B_name"
       FROM "Terminal" t
       LEFT JOIN "Branch" b ON t."B_id" = b."B_id"
       ORDER BY t."Ter_id"`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/terminals/:id
export async function getTerminalById(req, res, next) {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400);
      return next(new Error("Invalid terminal ID"));
    }

    const result = await pool.query(
      `SELECT t."Ter_id", t."Ter_name", t."B_id", b."B_name"
       FROM "Terminal" t
       LEFT JOIN "Branch" b ON t."B_id" = b."B_id"
       WHERE t."Ter_id" = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      return next(new Error("Terminal not found"));
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// GET /api/terminals/branch/:branchId
export async function getTerminalsByBranch(req, res, next) {
  try {
    const { branchId } = req.params;

    if (isNaN(Number(branchId))) {
      res.status(400);
      return next(new Error("Invalid branch ID"));
    }

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
      `SELECT t."Ter_id", t."Ter_name", t."B_id", b."B_name"
       FROM "Terminal" t
       LEFT JOIN "Branch" b ON t."B_id" = b."B_id"
       WHERE t."B_id" = $1
       ORDER BY t."Ter_id"`,
      [branchId],
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/terminals
export async function createTerminal(req, res, next) {
  try {
    const { Ter_name, B_id } = req.body;

    const errors = validateTerminalFields({ Ter_name, B_id }, true);
    if (errors.length > 0) {
      res.status(400);
      return next(new Error(errors.join("; ")));
    }

    const trimmedName = Ter_name.trim();

    // Confirm branch exists
    const branchCheck = await pool.query(
      'SELECT "B_id" FROM "Branch" WHERE "B_id" = $1',
      [B_id],
    );
    if (branchCheck.rows.length === 0) {
      res.status(400);
      return next(new Error("The specified branch does not exist"));
    }

    // Duplicate name check within the same branch
    const duplicate = await pool.query(
      'SELECT "Ter_id" FROM "Terminal" WHERE LOWER("Ter_name") = LOWER($1) AND "B_id" = $2',
      [trimmedName, B_id],
    );
    if (duplicate.rows.length > 0) {
      res.status(409);
      return next(
        new Error("A terminal with this name already exists in this branch"),
      );
    }

    const result = await pool.query(
      `INSERT INTO "Terminal" ("Ter_name", "B_id")
       VALUES ($1, $2)
       RETURNING "Ter_id", "Ter_name", "B_id"`,
      [trimmedName, B_id],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      res.status(409);
      return next(
        new Error("A terminal with this name already exists in this branch"),
      );
    }
    if (err.code === "23503") {
      res.status(400);
      return next(new Error("The specified branch does not exist"));
    }
    next(err);
  }
}

// PUT /api/terminals/:id
export async function updateTerminal(req, res, next) {
  try {
    const { id } = req.params;
    const { Ter_name, B_id } = req.body;

    if (isNaN(Number(id))) {
      res.status(400);
      return next(new Error("Invalid terminal ID"));
    }

    // Reject empty body
    if (Ter_name === undefined && B_id === undefined) {
      res.status(400);
      return next(new Error("No fields provided to update"));
    }

    const errors = validateTerminalFields({ Ter_name, B_id }, false);
    if (errors.length > 0) {
      res.status(400);
      return next(new Error(errors.join("; ")));
    }

    // Confirm terminal exists
    const existing = await pool.query(
      'SELECT "Ter_id", "B_id" FROM "Terminal" WHERE "Ter_id" = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      return next(new Error("Terminal not found"));
    }

    // Confirm new branch exists if B_id is being changed
    if (B_id !== undefined) {
      const branchCheck = await pool.query(
        'SELECT "B_id" FROM "Branch" WHERE "B_id" = $1',
        [B_id],
      );
      if (branchCheck.rows.length === 0) {
        res.status(400);
        return next(new Error("The specified branch does not exist"));
      }
    }

    // Duplicate name check within the same branch, excluding self
    if (Ter_name !== undefined) {
      const effectiveBranchId = B_id ?? existing.rows[0].B_id;
      const duplicate = await pool.query(
        `SELECT "Ter_id" FROM "Terminal"
         WHERE LOWER("Ter_name") = LOWER($1)
           AND "B_id" = $2
           AND "Ter_id" != $3`,
        [Ter_name.trim(), effectiveBranchId, id],
      );
      if (duplicate.rows.length > 0) {
        res.status(409);
        return next(
          new Error("A terminal with this name already exists in this branch"),
        );
      }
    }

    const result = await pool.query(
      `UPDATE "Terminal"
       SET
         "Ter_name" = COALESCE($1, "Ter_name"),
         "B_id"     = COALESCE($2, "B_id")
       WHERE "Ter_id" = $3
       RETURNING "Ter_id", "Ter_name", "B_id"`,
      [Ter_name?.trim() ?? null, B_id ?? null, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      res.status(409);
      return next(
        new Error("A terminal with this name already exists in this branch"),
      );
    }
    if (err.code === "23503") {
      res.status(400);
      return next(new Error("The specified branch does not exist"));
    }
    next(err);
  }
}

// DELETE /api/terminals/:id
export async function deleteTerminal(req, res, next) {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400);
      return next(new Error("Invalid terminal ID"));
    }

    const result = await pool.query(
      'DELETE FROM "Terminal" WHERE "Ter_id" = $1 RETURNING "Ter_id"',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      return next(new Error("Terminal not found"));
    }

    res.status(204).send();
  } catch (err) {
    if (err.code === "23503") {
      res.status(409);
      return next(
        new Error("Cannot delete this terminal because it is currently in use"),
      );
    }
    next(err);
  }
}

export default {
  getTerminals,
  getTerminalById,
  getTerminalsByBranch,
  createTerminal,
  updateTerminal,
  deleteTerminal,
};

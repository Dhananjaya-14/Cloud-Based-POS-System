import pool from "../config/database.js";

// GET /api/branches
//all branches
export async function getBranches(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT "B_id", "B_name", "B_email", "B_conNo", "B_address", "com_id", "U_id" FROM "Branch" ORDER BY "B_id"'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/branches/:id
//one branch from id
export async function getBranchById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT "B_id", "B_name", "B_email", "B_conNo", "B_address", "com_id", "U_id" FROM "Branch" WHERE "B_id" = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Branch not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/branches
//create branch
export async function createBranch(req, res, next) {
  try {
    const { B_name, B_email, B_conNo, B_address, com_id, U_id } = req.body;

    if (!B_name || !B_email || !B_conNo || !B_address || !com_id || !U_id) {
      res.status(400);
      throw new Error(
        "B_name, B_email, B_conNo, B_address, com_id and U_id are required"
      );
    }

    const insertQuery = `
      INSERT INTO "Branch" ("B_name", "B_email", "B_conNo", "B_address", "com_id", "U_id")
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING "B_id", "B_name", "B_email", "B_conNo", "B_address", "com_id", "U_id"
    `;

    const result = await pool.query(insertQuery, [
      B_name,
      B_email,
      B_conNo,
      B_address,
      com_id,
      U_id,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(400);
      return next(new Error("Duplicate value: email/contact/address must be unique"));
    }
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Invalid foreign key: com_id or U_id does not exist"));
    }
    next(err);
  }
}

// PUT /api/branches/:id
//update branch
export async function updateBranch(req, res, next) {
  try {
    const { id } = req.params;
    const { B_name, B_email, B_conNo, B_address, com_id, U_id } = req.body;

    const existing = await pool.query(
      'SELECT "B_id" FROM "Branch" WHERE "B_id" = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Branch not found");
    }

    const updateQuery = `
      UPDATE "Branch"
      SET
        "B_name" = COALESCE($1, "B_name"),
        "B_email" = COALESCE($2, "B_email"),
        "B_conNo" = COALESCE($3, "B_conNo"),
        "B_address" = COALESCE($4, "B_address"),
        "com_id" = COALESCE($5, "com_id"),
        "U_id" = COALESCE($6, "U_id")
      WHERE "B_id" = $7
      RETURNING "B_id", "B_name", "B_email", "B_conNo", "B_address", "com_id", "U_id"
    `;

    const result = await pool.query(updateQuery, [
      B_name ?? null,
      B_email ?? null,
      B_conNo ?? null,
      B_address ?? null,
      com_id ?? null,
      U_id ?? null,
      id,
    ]);

    res.json(result.rows[0]);
  } catch (err) {
    if (err?.code === "23505") {
      res.status(400);
      return next(new Error("Duplicate value: email/contact/address must be unique"));
    }
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Invalid foreign key: com_id or U_id does not exist"));
    }
    next(err);
  }
}

// DELETE /api/branches/:id
// delete the branch
export async function deleteBranch(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM "Branch" WHERE "B_id" = $1 RETURNING "B_id"',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Branch not found");
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}


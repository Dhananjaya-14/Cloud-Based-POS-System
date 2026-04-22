import pool from "../config/database.js";

// GET /api/roles
export async function getRoles(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT role_id, role_name FROM "Role" ORDER BY role_id',
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/roles/:id
export async function getRoleById(req, res, next) {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400);
      return next(new Error("Invalid role ID"));
    }

    const result = await pool.query(
      'SELECT role_id, role_name FROM "Role" WHERE role_id = $1',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      return next(new Error("Role not found"));
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/roles
export async function createRole(req, res, next) {
  try {
    const { role_name } = req.body;

    if (!role_name || typeof role_name !== "string") {
      res.status(400);
      return next(new Error("role_name is required and must be a string"));
    }

    const trimmed = role_name.trim();

    if (trimmed.length === 0) {
      res.status(400);
      return next(new Error("role_name cannot be empty or whitespace"));
    }
    if (trimmed.length > 50) {
      res.status(400);
      return next(new Error("role_name must be 50 characters or fewer"));
    }
    if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
      res.status(400);
      return next(new Error("role_name contains invalid characters"));
    }

    // DB has UNIQUE constraint on role_name — but we check first for a clean error message
    const existing = await pool.query(
      'SELECT role_id FROM "Role" WHERE LOWER(role_name) = LOWER($1)',
      [trimmed],
    );
    if (existing.rows.length > 0) {
      res.status(409);
      return next(new Error("A role with this name already exists"));
    }

    const result = await pool.query(
      'INSERT INTO "Role" (role_name) VALUES ($1) RETURNING role_id, role_name',
      [trimmed],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    // Fallback: DB unique constraint violation (race condition)
    if (err.code === "23505") {
      res.status(409);
      return next(new Error("A role with this name already exists"));
    }
    next(err);
  }
}

// PUT /api/roles/:id
export async function updateRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role_name } = req.body;

    if (isNaN(Number(id))) {
      res.status(400);
      return next(new Error("Invalid role ID"));
    }

    if (!role_name || typeof role_name !== "string") {
      res.status(400);
      return next(new Error("role_name is required and must be a string"));
    }

    const trimmed = role_name.trim();

    if (trimmed.length === 0) {
      res.status(400);
      return next(new Error("role_name cannot be empty or whitespace"));
    }
    if (trimmed.length > 50) {
      res.status(400);
      return next(new Error("role_name must be 50 characters or fewer"));
    }
    if (!/^[a-zA-Z0-9 _-]+$/.test(trimmed)) {
      res.status(400);
      return next(new Error("role_name contains invalid characters"));
    }

    const existing = await pool.query(
      'SELECT role_id FROM "Role" WHERE role_id = $1',
      [id],
    );
    if (existing.rows.length === 0) {
      res.status(404);
      return next(new Error("Role not found"));
    }

    // Case-insensitive duplicate check, excluding the current role
    const duplicate = await pool.query(
      'SELECT role_id FROM "Role" WHERE LOWER(role_name) = LOWER($1) AND role_id != $2',
      [trimmed, id],
    );
    if (duplicate.rows.length > 0) {
      res.status(409);
      return next(new Error("A role with this name already exists"));
    }

    const result = await pool.query(
      'UPDATE "Role" SET role_name = $1 WHERE role_id = $2 RETURNING role_id, role_name',
      [trimmed, id],
    );

    res.json(result.rows[0]);
  } catch (err) {
    // Fallback: DB unique constraint violation (race condition)
    if (err.code === "23505") {
      res.status(409);
      return next(new Error("A role with this name already exists"));
    }
    next(err);
  }
}

// DELETE /api/roles/:id
export async function deleteRole(req, res, next) {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400);
      return next(new Error("Invalid role ID"));
    }

    const result = await pool.query(
      'DELETE FROM "Role" WHERE role_id = $1 RETURNING role_id',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      return next(new Error("Role not found"));
    }

    res.status(204).send();
  } catch (err) {
    // FK violation — role is still assigned to users
    if (err.code === "23503") {
      res.status(409);
      return next(
        new Error(
          "Cannot delete this role because it is assigned to one or more users",
        ),
      );
    }
    next(err);
  }
}

export default { getRoles, getRoleById, createRole, updateRole, deleteRole };

import pool from "../config/database.js";

// GET /api/roles
export async function getRoles(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT role_id, role_name FROM "Role" ORDER BY role_id'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

//single role by id
// GET /api/roles/:id
export async function getRoleById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT role_id, role_name FROM "Role" WHERE role_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Role not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
//create role
// POST /api/roles
export async function createRole(req, res, next) {
  try {
    const { role_name } = req.body;

    if (!role_name) {
      res.status(400);
      throw new Error("role_name is required");
    }

    const existing = await pool.query(
      'SELECT role_id FROM "Role" WHERE role_name = $1',
      [role_name]
    );
    if (existing.rows.length > 0) {
      res.status(400);
      throw new Error("Role name already exists");
    }

    const result = await pool.query(
      'INSERT INTO "Role" (role_name) VALUES ($1) RETURNING role_id, role_name',
      [role_name]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// PUT /api/roles/:id
export async function updateRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role_name } = req.body;

    const existing = await pool.query(
      'SELECT role_id FROM "Role" WHERE role_id = $1',
      [id]
    );
    if (existing.rows.length === 0) {
      res.status(404);
      throw new Error("Role not found");
    }

    if (!role_name) {
      res.status(400);
      throw new Error("role_name is required");
    }

    const result = await pool.query(
      'UPDATE "Role" SET role_name = $1 WHERE role_id = $2 RETURNING role_id, role_name',
      [role_name, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/roles/:id
export async function deleteRole(req, res, next) {
  try {
    const { id } = req.params;

    try {
      const result = await pool.query(
        'DELETE FROM "Role" WHERE role_id = $1 RETURNING role_id',
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404);
        throw new Error("Role not found");
      }
    } catch (err) {
      // Handle foreign key constraint (e.g., if users still reference this role)
      if (err.code === "23503") {
        res.status(400);
        return next(new Error("Cannot delete role because it is in use"));
      }
      throw err;
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}


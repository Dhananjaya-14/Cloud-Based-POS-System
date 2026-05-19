import bcrypt from "bcryptjs";
import pool from "../config/database.js";

// Helper to hash password when provided
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}
//all users
// GET /api/users
export async function getUsers(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT u.u_id, u.u_fname, u.u_lname, u.u_email, u.u_connumber, u.role_id, r.role_name, u.u_status 
       FROM "User" u
       LEFT JOIN "Role" r ON u.role_id = r.role_id
       ORDER BY u.u_id`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}
//single user by id
// GET /api/users/:id
export async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.u_id, u.u_fname, u.u_lname, u.u_email, u.u_connumber, u.role_id, r.role_name, u.u_status 
       FROM "User" u
       LEFT JOIN "Role" r ON u.role_id = r.role_id
       WHERE u.u_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("User not found");
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

//create user
// POST /api/users
export async function createUser(req, res, next) {
  try {
    const { u_fname, u_lname, u_email, u_pw, u_connumber, role_id, u_status } = req.body;

    if (!u_fname || !u_lname || !u_email || !u_pw) {
      res.status(400);
      throw new Error("u_fname, u_lname, u_email and u_pw are required");
    }

    // Check for existing email
    const existing = await pool.query(
      'SELECT u_id FROM "User" WHERE u_email = $1',
      [u_email]
    );
    if (existing.rows.length > 0) {
      res.status(400);
      throw new Error("Email already in use");
    }

    const hashedPassword = await hashPassword(u_pw);

    const insertQuery = `
      INSERT INTO "User" (u_fname, u_lname, u_email, u_pw, u_connumber, role_id, u_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING u_id, u_fname, u_lname, u_email, u_connumber, role_id, u_status
    `;

    const params = [
      u_fname,
      u_lname,
      u_email,
      hashedPassword,
      u_connumber || null,
      role_id || null,
      u_status ?? true,
    ];

    const result = await pool.query(insertQuery, params);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

//update user
// PUT /api/users/:id
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { u_fname, u_lname, u_email, u_pw, u_connumber, role_id, u_status } = req.body;

    // Ensure user exists
    const existingUser = await pool.query(
      'SELECT u_id FROM "User" WHERE u_id = $1',
      [id]
    );
    if (existingUser.rows.length === 0) {
      res.status(404);
      throw new Error("User not found");
    }

    let hashedPassword = null;
    if (u_pw) {
      hashedPassword = await hashPassword(u_pw);
    }

    const updateQuery = `
      UPDATE "User"
      SET
        u_fname = COALESCE($1, u_fname),
        u_lname = COALESCE($2, u_lname),
        u_email = COALESCE($3, u_email),
        u_pw = COALESCE($4, u_pw),
        u_connumber = COALESCE($5, u_connumber),
        role_id = COALESCE($6, role_id),
        u_status = COALESCE($7, u_status)
      WHERE u_id = $8
      RETURNING u_id, u_fname, u_lname, u_email, u_connumber, role_id, u_status
    `;

    const params = [
      u_fname ?? null,
      u_lname ?? null,
      u_email ?? null,
      hashedPassword,
      u_connumber ?? null,
      role_id ?? null,
      u_status ?? null,
      id,
    ];

    const result = await pool.query(updateQuery, params);

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

//delete user
// DELETE /api/users/:id
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM "User" WHERE u_id = $1 RETURNING u_id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("User not found");
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}


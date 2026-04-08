import bcrypt from "bcryptjs";
import pool from "../config/database.js";

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Shared field validator
function validateUserFields(
  { u_fname, u_lname, u_email, u_pw, u_connumber, role_id },
  isCreate = false,
) {
  const errors = [];

  if (isCreate) {
    if (!u_fname) errors.push("u_fname is required");
    if (!u_lname) errors.push("u_lname is required");
    if (!u_email) errors.push("u_email is required");
    if (!u_pw) errors.push("u_pw is required");
  }

  if (u_fname !== undefined) {
    if (typeof u_fname !== "string" || u_fname.trim().length === 0)
      errors.push("u_fname must be a non-empty string");
    else if (u_fname.trim().length > 50)
      errors.push("u_fname must be 50 characters or fewer");
    else if (!/^[a-zA-Z\s'-]+$/.test(u_fname.trim()))
      errors.push("u_fname contains invalid characters");
  }

  if (u_lname !== undefined) {
    if (typeof u_lname !== "string" || u_lname.trim().length === 0)
      errors.push("u_lname must be a non-empty string");
    else if (u_lname.trim().length > 50)
      errors.push("u_lname must be 50 characters or fewer");
    else if (!/^[a-zA-Z\s'-]+$/.test(u_lname.trim()))
      errors.push("u_lname contains invalid characters");
  }

  if (u_email !== undefined) {
    if (typeof u_email !== "string" || u_email.trim().length === 0)
      errors.push("u_email must be a non-empty string");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u_email.trim()))
      errors.push("u_email must be a valid email address");
    else if (u_email.trim().length > 100)
      errors.push("u_email must be 100 characters or fewer");
  }

  if (u_pw !== undefined) {
    if (typeof u_pw !== "string" || u_pw.length < 8)
      errors.push("u_pw must be at least 8 characters");
    else if (u_pw.length > 72)
      errors.push("u_pw must be 72 characters or fewer"); // bcrypt max
    else if (!/[A-Z]/.test(u_pw))
      errors.push("u_pw must contain at least one uppercase letter");
    else if (!/[0-9]/.test(u_pw))
      errors.push("u_pw must contain at least one number");
  }

  if (u_connumber !== undefined && u_connumber !== null && u_connumber !== "") {
    if (typeof u_connumber !== "string")
      errors.push("u_connumber must be a string");
    else if (!/^\+?[\d\s\-()]{7,20}$/.test(u_connumber.trim()))
      errors.push("u_connumber must be a valid phone number");
  }

  if (role_id !== undefined && role_id !== null) {
    const parsed = Number(role_id);
    if (!Number.isInteger(parsed) || parsed <= 0)
      errors.push("role_id must be a positive integer");
    else if (![1, 2].includes(parsed))
      errors.push("role_id must be 1 (Branch Admin) or 2 (Admin)");
  }

  return errors;
}

// GET /api/users
export async function getUsers(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT u.u_id, u.u_fname, u.u_lname, u.u_email, u.u_connumber, u.role_id, r.role_name
       FROM "User" u
       LEFT JOIN "Role" r ON u.role_id = r.role_id
       ORDER BY u.u_id`,
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id
export async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400);
      return next(new Error("Invalid user ID"));
    }

    const result = await pool.query(
      `SELECT u.u_id, u.u_fname, u.u_lname, u.u_email, u.u_connumber, u.role_id, r.role_name
       FROM "User" u
       LEFT JOIN "Role" r ON u.role_id = r.role_id
       WHERE u.u_id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      return next(new Error("User not found"));
    }

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// POST /api/users
export async function createUser(req, res, next) {
  try {
    const { u_fname, u_lname, u_email, u_pw, u_connumber, role_id } = req.body;

    const errors = validateUserFields(
      { u_fname, u_lname, u_email, u_pw, u_connumber, role_id },
      true, // isCreate — enforces required fields
    );
    if (errors.length > 0) {
      res.status(400);
      return next(new Error(errors.join("; ")));
    }

    const trimmedEmail = u_email.trim().toLowerCase();

    // Check duplicate email
    const existing = await pool.query(
      'SELECT u_id FROM "User" WHERE LOWER(u_email) = $1',
      [trimmedEmail],
    );
    if (existing.rows.length > 0) {
      res.status(409);
      return next(new Error("An account with this email already exists"));
    }

    // Validate role exists in DB
    if (role_id) {
      const roleCheck = await pool.query(
        'SELECT role_id FROM "Role" WHERE role_id = $1',
        [role_id],
      );
      if (roleCheck.rows.length === 0) {
        res.status(400);
        return next(new Error("The specified role does not exist"));
      }
    }

    const hashedPassword = await hashPassword(u_pw);

    const result = await pool.query(
      `INSERT INTO "User" (u_fname, u_lname, u_email, u_pw, u_connumber, role_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING u_id, u_fname, u_lname, u_email, u_connumber, role_id`,
      [
        u_fname.trim(),
        u_lname.trim(),
        trimmedEmail,
        hashedPassword,
        u_connumber?.trim() || null,
        role_id || null,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      res.status(409);
      return next(new Error("An account with this email already exists"));
    }
    if (err.code === "23503") {
      res.status(400);
      return next(new Error("The specified role does not exist"));
    }
    next(err);
  }
}

// PUT /api/users/:id
export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { u_fname, u_lname, u_email, u_pw, u_connumber, role_id } = req.body;

    if (isNaN(Number(id))) {
      res.status(400);
      return next(new Error("Invalid user ID"));
    }

    // Reject empty body
    if (
      !u_fname &&
      !u_lname &&
      !u_email &&
      !u_pw &&
      !u_connumber &&
      role_id === undefined
    ) {
      res.status(400);
      return next(new Error("No fields provided to update"));
    }

    const errors = validateUserFields(
      { u_fname, u_lname, u_email, u_pw, u_connumber, role_id },
      false, // isCreate = false — all fields optional on update
    );
    if (errors.length > 0) {
      res.status(400);
      return next(new Error(errors.join("; ")));
    }

    // Ensure user exists
    const existingUser = await pool.query(
      'SELECT u_id FROM "User" WHERE u_id = $1',
      [id],
    );
    if (existingUser.rows.length === 0) {
      res.status(404);
      return next(new Error("User not found"));
    }

    // Check email not taken by another user
    if (u_email) {
      const trimmedEmail = u_email.trim().toLowerCase();
      const emailCheck = await pool.query(
        'SELECT u_id FROM "User" WHERE LOWER(u_email) = $1 AND u_id != $2',
        [trimmedEmail, id],
      );
      if (emailCheck.rows.length > 0) {
        res.status(409);
        return next(new Error("An account with this email already exists"));
      }
    }

    // Validate role exists in DB
    if (role_id !== undefined && role_id !== null) {
      const roleCheck = await pool.query(
        'SELECT role_id FROM "Role" WHERE role_id = $1',
        [role_id],
      );
      if (roleCheck.rows.length === 0) {
        res.status(400);
        return next(new Error("The specified role does not exist"));
      }
    }

    const hashedPassword = u_pw ? await hashPassword(u_pw) : null;

    const result = await pool.query(
      `UPDATE "User"
       SET
         u_fname     = COALESCE($1, u_fname),
         u_lname     = COALESCE($2, u_lname),
         u_email     = COALESCE($3, u_email),
         u_pw        = COALESCE($4, u_pw),
         u_connumber = COALESCE($5, u_connumber),
         role_id     = COALESCE($6, role_id)
       WHERE u_id = $7
       RETURNING u_id, u_fname, u_lname, u_email, u_connumber, role_id`,
      [
        u_fname?.trim() ?? null,
        u_lname?.trim() ?? null,
        u_email?.trim().toLowerCase() ?? null,
        hashedPassword,
        u_connumber?.trim() ?? null,
        role_id ?? null,
        id,
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") {
      res.status(409);
      return next(new Error("An account with this email already exists"));
    }
    if (err.code === "23503") {
      res.status(400);
      return next(new Error("The specified role does not exist"));
    }
    next(err);
  }
}

// DELETE /api/users/:id
export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      res.status(400);
      return next(new Error("Invalid user ID"));
    }

    // Prevent self-deletion
    if (Number(id) === req.user?.u_id) {
      res.status(403);
      return next(new Error("You cannot delete your own account"));
    }

    const result = await pool.query(
      'DELETE FROM "User" WHERE u_id = $1 RETURNING u_id',
      [id],
    );

    if (result.rows.length === 0) {
      res.status(404);
      return next(new Error("User not found"));
    }

    res.status(204).send();
  } catch (err) {
    if (err.code === "23503") {
      res.status(409);
      return next(
        new Error(
          "Cannot delete this user because they have associated records",
        ),
      );
    }
    next(err);
  }
}

export default { getUsers, getUserById, createUser, updateUser, deleteUser };

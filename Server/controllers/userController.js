import bcrypt from "bcryptjs";
import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

function normalizeBranchId(body) {
  return body?.B_id ?? body?.b_id ?? body?.branch_id;
}

function getScopedBranchId(req) {
  return req.user?.role_id === ROLES.BRANCH_ADMIN ? req.user?.b_id : null;
}

function ensureBranchAdminHasBranch(req, res) {
  if (req.user?.role_id === ROLES.BRANCH_ADMIN && !req.user?.b_id) {
    res.status(403);
    throw new Error("No branch is assigned to this branch admin account.");
  }
}

function normalizeOptionalPositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }

  return parsed;
}

export async function getUsers(req, res, next) {
  try {
    ensureBranchAdminHasBranch(req, res);

    const { role_id, com_id, b_id } = req.user;
    const params = [];
    let query = `SELECT u.u_id, u.u_fname, u.u_lname, u.u_email, u.u_connumber,
                        u.role_id, r.role_name, u.u_status, u."B_id" AS b_id,
                        b."B_name" AS branch_name, b."B_id" AS branch_id
                 FROM "User" u
                 LEFT JOIN "Role" r ON u.role_id = r.role_id
                 LEFT JOIN "Branch" b ON b."B_id" = u."B_id"`;

    if (role_id === ROLES.ADMIN && com_id != null) {
      params.push(com_id);
      query += ` WHERE b."com_id" = $1`;
    } else if (role_id === ROLES.BRANCH_ADMIN && b_id != null) {
      params.push(b_id);
      query += ` WHERE b."B_id" = $1`;
    }

    query += ` ORDER BY u.u_id`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req, res, next) {
  try {
    ensureBranchAdminHasBranch(req, res);

    const { id } = req.params;
    const scopedBranchId = getScopedBranchId(req);
    const params = [id];
    let branchFilter = "";

    if (scopedBranchId) {
      params.push(Number(scopedBranchId));
      branchFilter = `AND u."B_id" = $2`;
    }

    const result = await pool.query(
      `SELECT u.u_id, u.u_fname, u.u_lname, u.u_email, u.u_connumber,
              u.role_id, r.role_name, u.u_status, u."B_id" AS b_id,
              b."B_name" AS branch_name, b."B_id" AS branch_id
       FROM "User" u
       LEFT JOIN "Role" r ON u.role_id = r.role_id
       LEFT JOIN "Branch" b ON b."B_id" = u."B_id"
       WHERE u.u_id = $1 ${branchFilter}`,
      params,
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

export async function createUser(req, res, next) {
  try {
    ensureBranchAdminHasBranch(req, res);

    const { u_fname, u_lname, u_email, u_pw, u_connumber, role_id, u_status } = req.body;
    const requestedBranchId = normalizeBranchId(req.body);
    const scopedBranchId = getScopedBranchId(req);
    const B_id = scopedBranchId
      ? Number(scopedBranchId)
      : normalizeOptionalPositiveInt(requestedBranchId, "B_id");

    if (!u_fname || !u_lname || !u_email || !u_pw) {
      res.status(400);
      throw new Error("u_fname, u_lname, u_email and u_pw are required");
    }

    const existing = await pool.query(
      'SELECT u_id FROM "User" WHERE u_email = $1',
      [u_email],
    );
    if (existing.rows.length > 0) {
      res.status(400);
      throw new Error("Email already in use");
    }

    const hashedPassword = await hashPassword(u_pw);

    const result = await pool.query(
      `INSERT INTO "User" (u_fname, u_lname, u_email, u_pw, u_connumber, role_id, u_status, "B_id")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING u_id, u_fname, u_lname, u_email, u_connumber, role_id, u_status, "B_id" AS b_id`,
      [
        u_fname,
        u_lname,
        u_email,
        hashedPassword,
        u_connumber || null,
        role_id || null,
        u_status ?? true,
        B_id,
      ],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    ensureBranchAdminHasBranch(req, res);

    const { id } = req.params;
    const { u_fname, u_lname, u_email, u_pw, u_connumber, role_id, u_status } = req.body;
    const requestedBranchId = normalizeBranchId(req.body);
    const scopedBranchId = getScopedBranchId(req);
    const B_id = scopedBranchId
      ? Number(scopedBranchId)
      : normalizeOptionalPositiveInt(requestedBranchId, "B_id");

    const existingParams = [id];
    let branchFilter = "";
    if (scopedBranchId) {
      existingParams.push(Number(scopedBranchId));
      branchFilter = `AND u."B_id" = $2`;
    }

    const existingUser = await pool.query(
      `SELECT u_id FROM "User" u WHERE u_id = $1 ${branchFilter}`,
      existingParams,
    );
    if (existingUser.rows.length === 0) {
      res.status(404);
      throw new Error("User not found");
    }

    const hashedPassword = u_pw ? await hashPassword(u_pw) : null;

    const result = await pool.query(
      `UPDATE "User"
       SET
         u_fname = COALESCE($1, u_fname),
         u_lname = COALESCE($2, u_lname),
         u_email = COALESCE($3, u_email),
         u_pw = COALESCE($4, u_pw),
         u_connumber = COALESCE($5, u_connumber),
         role_id = COALESCE($6, role_id),
         u_status = COALESCE($7, u_status),
         "B_id" = COALESCE($8, "B_id")
       WHERE u_id = $9
       RETURNING u_id, u_fname, u_lname, u_email, u_connumber, role_id, u_status, "B_id" AS b_id`,
      [
        u_fname ?? null,
        u_lname ?? null,
        u_email ?? null,
        hashedPassword,
        u_connumber ?? null,
        role_id ?? null,
        u_status ?? null,
        B_id,
        id,
      ],
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    ensureBranchAdminHasBranch(req, res);

    const { id } = req.params;
    const scopedBranchId = getScopedBranchId(req);
    const params = [id];
    let branchFilter = "";

    if (scopedBranchId) {
      params.push(Number(scopedBranchId));
      branchFilter = `AND "B_id" = $2`;
    }

    const result = await pool.query(
      `DELETE FROM "User" WHERE u_id = $1 ${branchFilter} RETURNING u_id`,
      params,
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


import bcrypt from "bcryptjs";
import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";

// Helper to hash password when provided
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

//all users
// GET /api/users
export async function getUsers(req, res, next) {
  try {
    ensureBranchAdminHasBranch(req, res);
    const { role_id, com_id, b_id } = req.user;

    let query = `SELECT u.u_id, u.u_fname, u.u_lname, u.u_email, u.u_connumber, u.role_id, r.role_name, u.u_status, u."B_id" as b_id,
                        b."B_name" as branch_name,
                        COALESCE(c2.com_name, c1.com_name) as company_name,
                        COALESCE(u.com_id, b.com_id) as com_id
                 FROM "User" u
                 LEFT JOIN "Role" r ON u.role_id = r.role_id
                 LEFT JOIN "Branch" b ON b."B_id" = u."B_id"
                 LEFT JOIN "Company" c1 ON b.com_id = c1.com_id
                 LEFT JOIN "Company" c2 ON u.com_id = c2.com_id`;
    
    let params = [];

    if (role_id === ROLES.ADMIN && com_id != null) {
      query += ` WHERE COALESCE(u.com_id, b.com_id) = $1`;
      params.push(com_id);
    } else if (role_id === ROLES.BRANCH_ADMIN && b_id != null) {
      query += ` WHERE b."B_id" = $1`;
      params.push(b_id);
    }

    query += ` ORDER BY u.u_id`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}
//single user by id
// GET /api/users/:id
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
              u.role_id, r.role_name, u.u_status, u."B_id" as b_id,
              b."B_name" AS branch_name,
              COALESCE(c2.com_name, c1.com_name) AS company_name,
              COALESCE(u.com_id, b.com_id) AS com_id
       FROM "User" u
       LEFT JOIN "Role" r ON u.role_id = r.role_id
       LEFT JOIN "Branch" b ON u."B_id" = b."B_id"
       LEFT JOIN "Company" c1 ON b.com_id = c1.com_id
       LEFT JOIN "Company" c2 ON u.com_id = c2.com_id
       WHERE u.u_id = $1 ${branchFilter}`,
      params
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
    ensureBranchAdminHasBranch(req, res);
    const { u_fname, u_lname, u_email, u_pw, u_connumber, role_id, u_status } = req.body;

    if (!u_fname || !u_lname || !u_email || !u_pw) {
      res.status(400);
      throw new Error("u_fname, u_lname, u_email and u_pw are required");
    }

    let B_id = null;
    let com_id = null;

    if (Number(role_id) === ROLES.SUPER_ADMIN) {
      // Super Admin needs no company or branch
      B_id = null;
      com_id = null;
    } else if (Number(role_id) === ROLES.ADMIN) {
      const requestedComId = req.body?.com_id ?? req.body?.company_id;
      com_id = normalizeOptionalPositiveInt(requestedComId, "com_id");
      if (!com_id) {
        res.status(400);
        throw new Error("com_id is required for Admin role");
      }
    } else {
      const requestedBranchId = normalizeBranchId(req.body);
      const scopedBranchId = getScopedBranchId(req);
      B_id = scopedBranchId
        ? Number(scopedBranchId)
        : normalizeOptionalPositiveInt(requestedBranchId, "B_id");
      if (!B_id) {
        res.status(400);
        throw new Error("B_id is required for branch-level roles");
      }

      // Automatically look up the branch's company ID (com_id)
      const branchRes = await pool.query('SELECT com_id FROM "Branch" WHERE "B_id" = $1', [B_id]);
      com_id = branchRes.rows[0]?.com_id ?? null;
      if (!com_id) {
        res.status(400);
        throw new Error("The assigned branch does not belong to a valid company");
      }
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
      INSERT INTO "User" (u_fname, u_lname, u_email, u_pw, u_connumber, role_id, u_status, "B_id", "com_id")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING u_id, u_fname, u_lname, u_email, u_connumber, role_id, u_status, "B_id" as b_id, "com_id" as com_id
    `;

    const params = [
      u_fname,
      u_lname,
      u_email,
      hashedPassword,
      u_connumber || null,
      role_id || null,
      u_status ?? true,
      B_id,
      com_id,
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
    ensureBranchAdminHasBranch(req, res);
    const { id } = req.params;
    const { u_fname, u_lname, u_email, u_pw, u_connumber, role_id, u_status } = req.body;
    let scopedBranchId = getScopedBranchId(req);

    // Ensure user exists
    const existingParams = [id];
    let branchFilter = "";
    if (scopedBranchId) {
      existingParams.push(Number(scopedBranchId));
      branchFilter = `AND "B_id" = $2`;
    }

    const existingUser = await pool.query(
      `SELECT u_id, role_id, "B_id", "com_id" FROM "User" WHERE u_id = $1 ${branchFilter}`,
      existingParams
    );
    if (existingUser.rows.length === 0) {
      res.status(404);
      throw new Error("User not found");
    }

    // Determine target role (use provided role_id, fallback to existing role_id)
    const targetRoleId = role_id !== undefined ? Number(role_id) : Number(existingUser.rows[0].role_id);

    let B_id = null;
    let com_id = null;

    if (targetRoleId === ROLES.SUPER_ADMIN) {
      // Super Admin needs no company or branch
      B_id = null;
      com_id = null;
    } else if (targetRoleId === ROLES.ADMIN) {
      const requestedComId = req.body?.com_id ?? req.body?.company_id;
      if (requestedComId !== undefined) {
        com_id = normalizeOptionalPositiveInt(requestedComId, "com_id");
      } else {
        com_id = existingUser.rows[0].com_id;
      }
      B_id = null; // force null for Admin
      if (!com_id) {
        res.status(400);
        throw new Error("com_id is required for Admin role");
      }
    } else {
      const requestedBranchId = normalizeBranchId(req.body);
      if (requestedBranchId !== undefined) {
        B_id = scopedBranchId
          ? Number(scopedBranchId)
          : normalizeOptionalPositiveInt(requestedBranchId, "B_id");
      } else {
        B_id = scopedBranchId ? Number(scopedBranchId) : existingUser.rows[0].B_id;
      }
      if (!B_id) {
        res.status(400);
        throw new Error("B_id is required for branch-level roles");
      }

      // Automatically look up the branch's company ID (com_id)
      const branchRes = await pool.query('SELECT com_id FROM "Branch" WHERE "B_id" = $1', [B_id]);
      com_id = branchRes.rows[0]?.com_id ?? null;
      if (!com_id) {
        res.status(400);
        throw new Error("The assigned branch does not belong to a valid company");
      }
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
        u_status = COALESCE($7, u_status),
        "B_id" = $8,
        "com_id" = $9
      WHERE u_id = $10
      RETURNING u_id, u_fname, u_lname, u_email, u_connumber, role_id, u_status, "B_id" as b_id, "com_id" as com_id
    `;

    const params = [
      u_fname ?? null,
      u_lname ?? null,
      u_email ?? null,
      hashedPassword,
      u_connumber ?? null,
      role_id ?? null,
      u_status ?? null,
      B_id,
      com_id,
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
      params
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


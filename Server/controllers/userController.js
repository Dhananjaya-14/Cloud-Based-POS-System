import bcrypt from "bcryptjs";
import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";
import { emitUserEventToBranch, emitSocketEvent, SOCKET_EVENTS, getBranchUserRoom, getCompanyRoom } from "../utils/socket.js";

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

function getActorMeta(req) {
  return {
    actor_id: req.user?.u_id ?? null,
    actor_name: [req.user?.u_fname, req.user?.u_lname].filter(Boolean).join(" ") || req.user?.u_email || "Admin",
  };
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

      // B_id is required for cashier, waiter, kitchen staff, but optional for branch admin
      if (!B_id && Number(role_id) !== ROLES.BRANCH_ADMIN) {
        res.status(400);
        throw new Error("B_id is required for branch-level roles");
      }

      if (B_id) {
        // Automatically look up the branch's company ID (com_id)
        const branchRes = await pool.query('SELECT com_id FROM "Branch" WHERE "B_id" = $1', [B_id]);
        com_id = branchRes.rows[0]?.com_id ?? null;
        if (!com_id) {
          res.status(400);
          throw new Error("The assigned branch does not belong to a valid company");
        }
      } else {
        const requestedComId = req.body?.com_id ?? req.body?.company_id;
        com_id = normalizeOptionalPositiveInt(requestedComId, "com_id");
        if (!com_id) {
          res.status(400);
          throw new Error("com_id is required for branch-level users when B_id is not assigned");
        }
      }
    }

    // Check for existing email
    const existing = await pool.query(
      'SELECT u_id FROM "User" WHERE u_email = $1',
      [u_email],
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
    const newUser = result.rows[0];

    // Get role name for the new user
    const roleRes = await pool.query('SELECT role_name FROM "Role" WHERE role_id = $1', [role_id || newUser.role_id]);
    const roleName = roleRes.rows[0]?.role_name || "Unknown";

    // Get company name and branch name
    let companyName = null;
    let branchName = null;
    
    if (com_id) {
      const companyRes = await pool.query('SELECT com_name FROM "Company" WHERE com_id = $1', [com_id]);
      companyName = companyRes.rows[0]?.com_name || null;
    }
    
    if (B_id) {
      const branchRes = await pool.query('SELECT "B_name" FROM "Branch" WHERE "B_id" = $1', [B_id]);
      branchName = branchRes.rows[0]?.B_name || null;
    }

    // Prepare user with details for socket emission
    const userWithDetails = {
      ...newUser,
      role_name: roleName,
      company_name: companyName,
      branch_name: branchName,
      ...getActorMeta(req),
    };

    // Emit socket event to ALL super admins and relevant rooms
    // Emit to global room for super admins
    emitSocketEvent(SOCKET_EVENTS.USER_CREATED, userWithDetails, { room: "branch-updates" });
    
    // Emit to company room for company admins
    if (com_id) {
      const companyRoom = getCompanyRoom(com_id);
      emitSocketEvent(SOCKET_EVENTS.USER_CREATED, userWithDetails, { room: companyRoom });
    }
    
    // Emit to branch room for branch admins
    if (B_id) {
      const branchUserRoom = getBranchUserRoom(B_id);
      emitSocketEvent(SOCKET_EVENTS.USER_CREATED, userWithDetails, { room: branchUserRoom });
    }

    res.status(201).json(newUser);
  } catch (err) {
    next(err);
  }
}

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

    const oldBranchId = existingUser.rows[0].B_id;
    const oldComId = existingUser.rows[0].com_id;

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

      // B_id is required for cashier, waiter, kitchen staff, but optional for branch admin
      if (!B_id && targetRoleId !== ROLES.BRANCH_ADMIN) {
        res.status(400);
        throw new Error("B_id is required for branch-level roles");
      }

      if (B_id) {
        // Automatically look up the branch's company ID (com_id)
        const branchRes = await pool.query('SELECT com_id FROM "Branch" WHERE "B_id" = $1', [B_id]);
        com_id = branchRes.rows[0]?.com_id ?? null;
        if (!com_id) {
          res.status(400);
          throw new Error("The assigned branch does not belong to a valid company");
        }
      } else {
        const requestedComId = req.body?.com_id ?? req.body?.company_id;
        if (requestedComId !== undefined) {
          com_id = normalizeOptionalPositiveInt(requestedComId, "com_id");
        } else {
          com_id = existingUser.rows[0].com_id;
        }
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
    const updatedUser = result.rows[0];

    // Get role name for the updated user
    const roleRes = await pool.query('SELECT role_name FROM "Role" WHERE role_id = $1', [targetRoleId]);
    const roleName = roleRes.rows[0]?.role_name || "Unknown";

    // Get company name and branch name
    let companyName = null;
    let branchName = null;
    
    if (com_id) {
      const companyRes = await pool.query('SELECT com_name FROM "Company" WHERE com_id = $1', [com_id]);
      companyName = companyRes.rows[0]?.com_name || null;
    }
    
    if (B_id) {
      const branchRes = await pool.query('SELECT "B_name" FROM "Branch" WHERE "B_id" = $1', [B_id]);
      branchName = branchRes.rows[0]?.B_name || null;
    }

    const userWithDetails = {
      ...updatedUser,
      role_name: roleName,
      company_name: companyName,
      branch_name: branchName,
      ...getActorMeta(req),
    };

    // Emit socket events for user updates
    // Emit to global room for super admins
    emitSocketEvent(SOCKET_EVENTS.USER_UPDATED, userWithDetails, { room: "branch-updates" });

    // Emit to company rooms
    const companyIds = [oldComId, com_id].filter(Boolean);
    companyIds.forEach((companyId) => {
      const companyRoom = getCompanyRoom(companyId);
      emitSocketEvent(SOCKET_EVENTS.USER_UPDATED, userWithDetails, { room: companyRoom });
    });

    // Emit to branch rooms
    const branchIds = [oldBranchId, B_id].filter(Boolean);
    branchIds.forEach((branchId) => {
      const branchUserRoom = getBranchUserRoom(branchId);
      emitSocketEvent(SOCKET_EVENTS.USER_UPDATED, userWithDetails, { room: branchUserRoom });
    });

    res.json(updatedUser);
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    ensureBranchAdminHasBranch(req, res);
    const { id } = req.params;
    const scopedBranchId = getScopedBranchId(req);

    // Get user branch before deletion
    const getUserParams = [id];
    let branchFilter = "";
    if (scopedBranchId) {
      getUserParams.push(Number(scopedBranchId));
      branchFilter = `AND "B_id" = $2`;
    }

    const userToDelete = await pool.query(
      `SELECT u_id, "B_id", "com_id", u_fname, u_lname, role_id FROM "User" WHERE u_id = $1 ${branchFilter}`,
      getUserParams
    );

    if (userToDelete.rows.length === 0) {
      res.status(404);
      throw new Error("User not found");
    }

    const userBranchId = userToDelete.rows[0].B_id;
    const userComId = userToDelete.rows[0].com_id;
    const userRoleId = userToDelete.rows[0].role_id;
    const userName = `${userToDelete.rows[0].u_fname || ''} ${userToDelete.rows[0].u_lname || ''}`.trim() || 'User';

    const params = [id];
    if (scopedBranchId) {
      params.push(Number(scopedBranchId));
    }

    const result = await pool.query(
      `DELETE FROM "User" WHERE u_id = $1 ${branchFilter} RETURNING u_id`,
      params
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("User not found");
    }

    // Prepare deletion payload
    const deletionPayload = { 
      u_id: parseInt(id), 
      userName,
      actor_id: req.user?.u_id ?? null,
      actor_name: [req.user?.u_fname, req.user?.u_lname].filter(Boolean).join(" ") || req.user?.u_email || "Admin",
    };

    // Emit socket event to notify about user deletion
    // Emit to global room for super admins
    emitSocketEvent(SOCKET_EVENTS.USER_DELETED, deletionPayload, { room: "branch-updates" });

    // Emit to company room
    if (userComId) {
      const companyRoom = getCompanyRoom(userComId);
      emitSocketEvent(SOCKET_EVENTS.USER_DELETED, deletionPayload, { room: companyRoom });
    }

    // Emit to branch room
    if (userBranchId) {
      const branchUserRoom = getBranchUserRoom(userBranchId);
      emitSocketEvent(SOCKET_EVENTS.USER_DELETED, deletionPayload, { room: branchUserRoom });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
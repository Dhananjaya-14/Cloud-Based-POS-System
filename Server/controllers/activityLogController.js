import pool from "../config/database.js";
import { BRANCH_SOCKET_ROOM, SOCKET_EVENTS, emitSocketEvent } from "../utils/socket.js";
import { ROLES } from "../middleware/authMiddleware.js";

const toNumber = (value) => {
  if (value == null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

// ─────────────────────────────────────────────
// GET /api/activity-logs
// Query params: page, limit, u_id, com_id, b_id, module_name, action_type, from, to, search
// ─────────────────────────────────────────────
export async function getActivityLogs(req, res, next) {
  try {
    const roleId = toNumber(req.user?.role_id);
    const tokenComId = toNumber(req.user?.com_id);
    const tokenBId = toNumber(req.user?.b_id);

    // ── pagination ──────────────────────────────────────
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    // ── filter params ───────────────────────────────────
    const {
      u_id,
      com_id: qComId,
      b_id:   qBId,
      module_name,
      action_type,
      from,
      to,
      search,
    } = req.query;

    const conditions = [];
    const values     = [];

    // Role-based scoping
    if (roleId === ROLES.ADMIN && tokenComId != null) {
      // Company admin → see only their company's logs
      conditions.push(`al.com_id = $${values.length + 1}`);
      values.push(tokenComId);
    } else if (roleId === ROLES.BRANCH_ADMIN && tokenBId != null) {
      // Branch admin → see only their branch's logs
      conditions.push(`al.b_id = $${values.length + 1}`);
      values.push(tokenBId);
    }
    // SUPER_ADMIN sees everything — no extra filter added

    // Optional user filter (admins may narrow to a specific user)
    if (u_id) {
      conditions.push(`al.u_id = $${values.length + 1}`);
      values.push(parseInt(u_id));
    }

    // Company filter (Super Admin only; others are already scoped)
    if (qComId && roleId === ROLES.SUPER_ADMIN) {
      conditions.push(`al.com_id = $${values.length + 1}`);
      values.push(parseInt(qComId));
    }

    // Branch filter
    if (qBId && (roleId === ROLES.SUPER_ADMIN || roleId === ROLES.ADMIN)) {
      conditions.push(`al.b_id = $${values.length + 1}`);
      values.push(parseInt(qBId));
    }

    // Module filter
    if (module_name) {
      conditions.push(`al.module_name = $${values.length + 1}`);
      values.push(String(module_name).toUpperCase());
    }

    // Action filter
    if (action_type) {
      conditions.push(`al.action_type = $${values.length + 1}`);
      values.push(String(action_type).toUpperCase());
    }

    // Date range
    if (from) {
      conditions.push(`al.created_at >= $${values.length + 1}`);
      values.push(new Date(from));
    }
    if (to) {
      conditions.push(`al.created_at <= $${values.length + 1}`);
      values.push(new Date(to));
    }

    // Full-text search on description or ip_address
    if (search) {
      conditions.push(
        `(al.description ILIKE $${values.length + 1} OR al.ip_address ILIKE $${values.length + 1})`
      );
      values.push(`%${search}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // ── count query ──────────────────────────────────────
    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM public.activity_log al
       ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].total);

    // ── data query ───────────────────────────────────────
    const dataResult = await pool.query(
      `SELECT
         al.log_id,
         al.u_id,
         u.u_fname,
         u.u_lname,
         u.u_email,
         al.com_id,
         c.com_name,
         al.b_id,
         b."B_name"  AS branch_name,
         al.action_type,
         al.module_name,
         al.record_id,
         al.description,
         al.ip_address,
         al.created_at
       FROM public.activity_log al
       LEFT JOIN "User"    u ON al.u_id   = u.u_id
       LEFT JOIN "Company" c ON al.com_id = c.com_id
       LEFT JOIN "Branch"  b ON al.b_id   = b."B_id"
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    res.json({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      logs: dataResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// GET /api/activity-logs/:id
// ─────────────────────────────────────────────
export async function getActivityLogById(req, res, next) {
  try {
    const { id } = req.params;
    const roleId = toNumber(req.user?.role_id);
    const tokenComId = toNumber(req.user?.com_id);
    const tokenBId = toNumber(req.user?.b_id);

    const result = await pool.query(
      `SELECT
         al.log_id,
         al.u_id,
         u.u_fname,
         u.u_lname,
         u.u_email,
         al.com_id,
         c.com_name,
         al.b_id,
         b."B_name"  AS branch_name,
         al.action_type,
         al.module_name,
         al.record_id,
         al.description,
         al.ip_address,
         al.created_at
       FROM public.activity_log al
       LEFT JOIN "User"    u ON al.u_id   = u.u_id
       LEFT JOIN "Company" c ON al.com_id = c.com_id
       LEFT JOIN "Branch"  b ON al.b_id   = b."B_id"
       WHERE al.log_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Activity log not found");
    }

    const log = result.rows[0];

    // Scope enforcement
    if (roleId === ROLES.ADMIN && Number(log.com_id) !== tokenComId) {
      res.status(403);
      throw new Error("You do not have permission to view this log entry");
    }
    if (roleId === ROLES.BRANCH_ADMIN && Number(log.b_id) !== tokenBId) {
      res.status(403);
      throw new Error("You do not have permission to view this log entry");
    }

    res.json(log);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// GET /api/activity-logs/summary
// Returns action/module counts for dashboards
// ─────────────────────────────────────────────
export async function getActivityLogSummary(req, res, next) {
  try {
    const roleId = toNumber(req.user?.role_id);
    const tokenComId = toNumber(req.user?.com_id);
    const tokenBId = toNumber(req.user?.b_id);

    const conditions = [];
    const values     = [];

    if (roleId === ROLES.ADMIN && tokenComId != null) {
      conditions.push(`com_id = $${values.length + 1}`);
      values.push(tokenComId);
    } else if (roleId === ROLES.BRANCH_ADMIN && tokenBId != null) {
      conditions.push(`b_id = $${values.length + 1}`);
      values.push(tokenBId);
    }

    // Optional date range from query
    const { from, to } = req.query;
    if (from) {
      conditions.push(`created_at >= $${values.length + 1}`);
      values.push(new Date(from));
    }
    if (to) {
      conditions.push(`created_at <= $${values.length + 1}`);
      values.push(new Date(to));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [byAction, byModule, recent] = await Promise.all([
      pool.query(
        `SELECT action_type, COUNT(*) AS count
         FROM public.activity_log
         ${whereClause}
         GROUP BY action_type
         ORDER BY count DESC`,
        values
      ),
      pool.query(
        `SELECT module_name, COUNT(*) AS count
         FROM public.activity_log
         ${whereClause}
         GROUP BY module_name
         ORDER BY count DESC`,
        values
      ),
      pool.query(
        `SELECT al.log_id, al.action_type, al.module_name, al.description, al.created_at,
                u.u_fname, u.u_lname, u.u_email
         FROM public.activity_log al
         LEFT JOIN "User" u ON al.u_id = u.u_id
         ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT 10`,
        values
      ),
    ]);

    res.json({
      byAction:  byAction.rows,
      byModule:  byModule.rows,
      recent:    recent.rows,
    });
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// DELETE /api/activity-logs/:id  (Super Admin only)
// ─────────────────────────────────────────────
export async function deleteActivityLog(req, res, next) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM public.activity_log WHERE log_id = $1 RETURNING log_id`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404);
      throw new Error("Activity log not found");
    }

    emitSocketEvent(
      SOCKET_EVENTS.ACTIVITY_LOG_CHANGED,
      {
        type: "deleted",
        log_ids: result.rows.map((row) => row.log_id),
        deleted_count: result.rowCount,
      },
      { room: BRANCH_SOCKET_ROOM },
    );

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────
// DELETE /api/activity-logs  (Super Admin only, bulk purge with filters)
// Body: { before, com_id, b_id }
// ─────────────────────────────────────────────
export async function purgeActivityLogs(req, res, next) {
  try {
    const { before, com_id, b_id } = req.body;

    if (!before) {
      res.status(400);
      throw new Error("'before' date is required for bulk purge");
    }

    const conditions = [`created_at < $1`];
    const values     = [new Date(before)];

    if (com_id) {
      conditions.push(`com_id = $${values.length + 1}`);
      values.push(parseInt(com_id));
    }
    if (b_id) {
      conditions.push(`b_id = $${values.length + 1}`);
      values.push(parseInt(b_id));
    }

    const result = await pool.query(
      `DELETE FROM public.activity_log WHERE ${conditions.join(" AND ")} RETURNING log_id`,
      values
    );

    emitSocketEvent(
      SOCKET_EVENTS.ACTIVITY_LOG_CHANGED,
      {
        type: "purged",
        log_ids: result.rows.map((row) => row.log_id),
        deleted_count: result.rowCount,
        before,
        com_id: com_id ? parseInt(com_id) : null,
        b_id: b_id ? parseInt(b_id) : null,
      },
      { room: BRANCH_SOCKET_ROOM },
    );

    res.json({ deleted: result.rowCount });
  } catch (err) {
    next(err);
  }
}

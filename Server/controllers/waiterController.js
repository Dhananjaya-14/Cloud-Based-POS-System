import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";

const VALID_STATUSES = ["pending", "preparing", "completed", "cancelled"];

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw Object.assign(new Error(`${fieldName} must be a positive integer`), {
      status: 400,
    });
  }
  return parsed;
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function validateCosts(or_tax, or_totalcost, or_totalCostWtax) {
  const tax = parseFloat(or_tax ?? 0);
  const cost = parseFloat(or_totalcost);
  const costWtax = parseFloat(or_totalCostWtax);

  if (isNaN(cost) || cost < 0) {
    return "or_totalcost must be a non-negative number";
  }
  if (isNaN(costWtax) || costWtax < 0) {
    return "or_totalCostWtax must be a non-negative number";
  }
  if (isNaN(tax) || tax < 0 || tax > 100) {
    return "or_tax must be a number between 0 and 100";
  }
  if (costWtax < cost) {
    return "or_totalCostWtax cannot be less than or_totalcost";
  }

  const expected = parseFloat((cost * (1 + tax / 100)).toFixed(2));
  if (Math.abs(expected - costWtax) > 0.05) {
    return `or_totalCostWtax (${costWtax}) does not match total with tax (${expected})`;
  }

  return null;
}

async function ensureWaiterAssignedToTable(waiterId, tableId) {
  const today = getTodayStr();
  
  // Check if waiter has any assignments today
  const anyAssigns = await pool.query(
    `SELECT assign_id FROM "TABLE_ASSIGNMENT" WHERE u_id = $1 AND assigned_date = $2 LIMIT 1`,
    [waiterId, today]
  );

  // If no assignments are configured for today, authorize table if it belongs to their branch
  if (anyAssigns.rows.length === 0) {
    const tableRes = await pool.query(
      `SELECT branch_id FROM "TABLES" WHERE table_id = $1`,
      [tableId]
    );
    if (tableRes.rows.length === 0) return false;
    const tableBranchId = tableRes.rows[0].branch_id;

    const branchRes = await pool.query(
      `SELECT t.branch_id
       FROM "TABLE_ASSIGNMENT" ta
       JOIN "TABLES" t ON ta.table_id = t.table_id
       WHERE ta.u_id = $1
       LIMIT 1`,
      [waiterId]
    );
    let waiterBranchId = branchRes.rows[0]?.branch_id;
    if (!waiterBranchId) {
      const defaultBranch = await pool.query('SELECT "B_id" AS branch_id FROM "Branch" LIMIT 1');
      waiterBranchId = defaultBranch.rows[0]?.branch_id;
    }
    return tableBranchId === waiterBranchId;
  }

  const { rows } = await pool.query(
    `SELECT assign_id
     FROM "TABLE_ASSIGNMENT"
     WHERE u_id = $1 AND table_id = $2 AND assigned_date = $3
     LIMIT 1`,
    [waiterId, tableId, today],
  );

  return rows.length > 0;
}

export async function getWaiterProfile(req, res, next) {
  try {
    const userRes = await pool.query(
      `SELECT u.u_id, u.u_fname, u.u_lname, u.u_email, u.u_connumber,
              u.role_id, r.role_name
       FROM "User" u
       LEFT JOIN "Role" r ON r.role_id = u.role_id
       WHERE u.u_id = $1`,
      [req.user.u_id],
    );

    if (!userRes.rows.length) {
      res.status(404);
      return next(new Error("User not found"));
    }

    const userData = userRes.rows[0];

    // Fetch the branch associated with their table assignment if they have one
    const branchRes = await pool.query(
      `SELECT t.branch_id, b."B_name" AS b_name
       FROM "TABLE_ASSIGNMENT" ta
       JOIN "TABLES" t ON ta.table_id = t.table_id
       JOIN "Branch" b ON b."B_id" = t.branch_id
       WHERE ta.u_id = $1
       LIMIT 1`,
      [req.user.u_id],
    );

    if (branchRes.rows.length > 0) {
      userData.branch_id = branchRes.rows[0].branch_id;
      userData.b_name = branchRes.rows[0].b_name;
    } else {
      // Fallback: If no assignment, get the first branch or set to null
      const defaultBranch = await pool.query(
        'SELECT "B_id" AS branch_id, "B_name" AS b_name FROM "Branch" LIMIT 1'
      );
      if (defaultBranch.rows.length > 0) {
        userData.branch_id = defaultBranch.rows[0].branch_id;
        userData.b_name = defaultBranch.rows[0].b_name;
      } else {
        userData.branch_id = null;
        userData.b_name = "No Branch Assigned";
      }
    }

    res.json({ success: true, data: userData });
  } catch (err) {
    next(err);
  }
}

export async function getMyTables(req, res, next) {
  try {
    const userId = req.user.u_id;
    const roleId = req.user.role_id;
    const { date = getTodayStr(), shift } = req.query;

    if (roleId !== ROLES.WAITER) {
      // For non-waiters (Cashier, Branch Admin, Admin), fetch all tables in their branch
      let branchId = null;
      if (roleId === ROLES.BRANCH_ADMIN) {
        branchId = req.user.b_id ?? null;
      }
      
      if (!branchId) {
        const defaultBranch = await pool.query(
          'SELECT "B_id" AS branch_id FROM "Branch" LIMIT 1'
        );
        branchId = defaultBranch.rows[0]?.branch_id ?? null;
      }

      if (!branchId) {
        return res.json({ success: true, count: 0, data: [] });
      }

      const { rows } = await pool.query(
        `SELECT
           t.table_id,
           t.table_number,
           t.table_capacity,
           t.table_status,
           t.branch_id,
           b."B_name" AS branch_name
         FROM "TABLES" t
         LEFT JOIN "Branch" b ON b."B_id" = t.branch_id
         WHERE t.branch_id = $1
         ORDER BY t.table_number`,
        [branchId],
      );
      return res.json({ success: true, count: rows.length, data: rows });
    }

    // For waiters, original table assignment logic
    const conditions = ["ta.u_id = $1", "ta.assigned_date = $2"];
    const values = [userId, date];
    let idx = 3;

    if (shift) {
      conditions.push(`ta.shift = $${idx++}`);
      values.push(shift);
    }

    const { rows } = await pool.query(
      `SELECT
         ta.assign_id,
         ta.assigned_date,
         ta.shift,
         ta.notes,
         t.table_id,
         t.table_number,
         t.table_capacity,
         t.table_status,
         t.branch_id,
         b."B_name" AS branch_name
       FROM "TABLE_ASSIGNMENT" ta
       JOIN "TABLES" t ON t.table_id = ta.table_id
       LEFT JOIN "Branch" b ON b."B_id" = t.branch_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY ta.shift, t.table_number`,
      values,
    );

    if (rows.length > 0) {
      return res.json({ success: true, count: rows.length, data: rows });
    }

    // Fallback: If no assignments today, get all tables in their branch
    const branchRes = await pool.query(
      `SELECT t.branch_id, b."B_name" AS branch_name
       FROM "TABLE_ASSIGNMENT" ta
       JOIN "TABLES" t ON ta.table_id = t.table_id
       JOIN "Branch" b ON b."B_id" = t.branch_id
       WHERE ta.u_id = $1
       LIMIT 1`,
      [userId],
    );
    let branchId = branchRes.rows[0]?.branch_id;
    if (!branchId) {
      const defaultBranch = await pool.query(
        'SELECT "B_id" AS branch_id, "B_name" AS b_name FROM "Branch" LIMIT 1'
      );
      branchId = defaultBranch.rows[0]?.branch_id;
    }

    if (!branchId) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const allBranchTables = await pool.query(
      `SELECT
         t.table_id,
         t.table_number,
         t.table_capacity,
         t.table_status,
         t.branch_id,
         b."B_name" AS branch_name
       FROM "TABLES" t
       LEFT JOIN "Branch" b ON b."B_id" = t.branch_id
       WHERE t.branch_id = $1
       ORDER BY t.table_number`,
      [branchId]
    );

    res.json({ success: true, count: allBranchTables.rows.length, data: allBranchTables.rows });
  } catch (err) {
    next(err);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const { status, date } = req.query;

    if (status && !VALID_STATUSES.includes(status)) {
      res.status(400);
      return next(
        new Error(`status must be one of: ${VALID_STATUSES.join(", ")}`),
      );
    }

    const conditions = ["o.u_id = $1"];
    const values = [req.user.u_id];
    let idx = 2;

    if (status) {
      conditions.push(`o.or_status = $${idx++}`);
      values.push(status);
    }
    if (date) {
      conditions.push(`o.or_date = $${idx++}`);
      values.push(date);
    }

    const { rows } = await pool.query(
      `SELECT
         o.*,
         t.table_number,
         t.table_status,
         b."B_name" AS branch_name
       FROM "ORDER" o
       LEFT JOIN "TABLES" t ON t.table_id = o.table_id
       LEFT JOIN "Branch" b ON b."B_id" = o.b_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY o.or_date DESC, o.or_time DESC`,
      values,
    );

    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
}

export async function createWaiterOrder(req, res, next) {
  try {
    const waiterId = req.user.u_id;
    const {
      table_id,
      cust_id,
      or_tax = 0,
      or_totalcost,
      or_totalCostWtax,
    } = req.body;

    if (!table_id || or_totalcost === undefined || or_totalCostWtax === undefined) {
      res.status(400);
      return next(
        new Error("table_id, or_totalcost and or_totalCostWtax are required"),
      );
    }

    const tableIdInt = parsePositiveInt(table_id, "table_id");
    const costError = validateCosts(or_tax, or_totalcost, or_totalCostWtax);
    if (costError) {
      res.status(400);
      return next(new Error(costError));
    }

    const table = await pool.query(
      `SELECT table_id, branch_id, table_status
       FROM "TABLES"
       WHERE table_id = $1`,
      [tableIdInt],
    );
    if (!table.rows.length) {
      res.status(404);
      return next(new Error("Table not found"));
    }

    if (req.user.role_id === ROLES.WAITER) {
      const isAssigned = await ensureWaiterAssignedToTable(waiterId, tableIdInt);
      if (!isAssigned) {
        res.status(403);
        return next(
          new Error("You can only create orders for tables assigned to you today"),
        );
      }
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const orderResult = await client.query(
        `INSERT INTO "ORDER"
           (or_tax, or_totalcost, "or_totalCostWtax", or_status, or_type,
            cust_id, u_id, b_id, table_id)
         VALUES ($1, $2, $3, 'pending', 'dine-in', $4, $5, $6, $7)
         RETURNING *`,
        [
          parseFloat(or_tax),
          parseFloat(or_totalcost),
          parseFloat(or_totalCostWtax),
          cust_id ?? null,
          waiterId,
          table.rows[0].branch_id,
          tableIdInt,
        ],
      );

      await client.query(
        `UPDATE "TABLES"
         SET table_status = 'occupied'
         WHERE table_id = $1 AND table_status <> 'occupied'`,
        [tableIdInt],
      );

      await client.query("COMMIT");
      res.status(201).json({ success: true, data: orderResult.rows[0] });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    if (err?.code === "23503") {
      res.status(400);
      return next(new Error("Invalid reference: table_id, cust_id or waiter"));
    }
    next(err);
  }
}

export async function deleteWaiterOrder(req, res, next) {
  try {
    const waiterId = req.user.u_id;
    const orderId = parsePositiveInt(req.params.id, "or_id");

    const existing = await pool.query(
      `SELECT or_id, or_status, u_id, table_id
       FROM "ORDER"
       WHERE or_id = $1`,
      [orderId],
    );

    if (!existing.rows.length) {
      res.status(404);
      return next(new Error("Order not found"));
    }

    const order = existing.rows[0];
    if (req.user.role_id === ROLES.WAITER && order.u_id !== waiterId) {
      res.status(403);
      return next(new Error("You can only delete orders created by you"));
    }
    if (order.or_status === "preparing" || order.or_status === "completed") {
      res.status(409);
      return next(
        new Error(
          `Cannot delete an order with status "${order.or_status}". Cancel it first.`,
        ),
      );
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        `DELETE FROM public."ORDER_ITEM" WHERE order_id = $1`,
        [orderId],
      );

      const deleted = await client.query(
        `DELETE FROM "ORDER" WHERE or_id = $1 RETURNING *`,
        [orderId],
      );

      if (order.table_id) {
        const activeOrders = await client.query(
          `SELECT or_id
           FROM "ORDER"
           WHERE table_id = $1 AND or_status IN ('pending', 'preparing')
           LIMIT 1`,
          [order.table_id],
        );

        if (!activeOrders.rows.length) {
          await client.query(
            `UPDATE "TABLES" SET table_status = 'available' WHERE table_id = $1`,
            [order.table_id],
          );
        }
      }

      await client.query("COMMIT");
      res.json({
        success: true,
        message: "Order deleted successfully",
        data: deleted.rows[0],
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
}

export default {
  getWaiterProfile,
  getMyTables,
  getMyOrders,
  createWaiterOrder,
  deleteWaiterOrder,
};

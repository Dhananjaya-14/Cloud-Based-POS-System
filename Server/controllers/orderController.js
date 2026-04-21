import pool from "../config/database.js";

// ─────────────────────────────────────────────
// GET /orders — list all orders (with filters)
// ─────────────────────────────────────────────
export const getAllOrders = async (req, res) => {
  try {
    const { status, type, b_id, cust_id, u_id, date } = req.query;
    const conditions = [];
    const values = [];
    let i = 1;

    if (status)  { conditions.push(`or_status = $${i++}`);  values.push(status); }
    if (type)    { conditions.push(`or_type = $${i++}`);    values.push(type); }
    if (b_id)    { conditions.push(`b_id = $${i++}`);       values.push(b_id); }
    if (cust_id) { conditions.push(`cust_id = $${i++}`);    values.push(cust_id); }
    if (u_id)    { conditions.push(`u_id = $${i++}`);       values.push(u_id); }
    if (date)    { conditions.push(`or_date = $${i++}`);    values.push(date); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows } = await pool.query(
      `SELECT * FROM "ORDER" ${where} ORDER BY or_date DESC, or_time DESC`,
      values
    );

    res.status(200).json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// GET /orders/:id — get one order
// ─────────────────────────────────────────────
export const getOrderById = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM "ORDER" WHERE or_id = $1`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// POST /orders — create new order
// ─────────────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    const {
      or_tax,
      or_totalcost,
      or_totalCostWtax,
      or_status,
      or_type,
      cust_id,
      u_id,
      b_id,
      table_id,
    } = req.body;

    // Required field validation
    if (!or_totalcost || !or_totalCostWtax || !or_type || !u_id || !b_id) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: or_totalcost, or_totalCostWtax, or_type, u_id, b_id",
      });
    }

    const { rows } = await pool.query(
      `INSERT INTO "ORDER"
         (or_tax, or_totalcost, "or_totalCostWtax", or_status, or_type, cust_id, u_id, b_id, table_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        or_tax ?? 0.00,
        or_totalcost,
        or_totalCostWtax,
        or_status ?? "pending",
        or_type,
        cust_id ?? null,
        u_id,
        b_id,
        table_id ?? null,
      ]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "23514") {
      return res.status(400).json({
        success: false,
        error: "Invalid status or type. Status: pending | preparing | completed | cancelled. Type: dine-in | takeaway | delivery",
      });
    }
    if (err.code === "23503") {
      return res.status(400).json({
        success: false,
        error: "Foreign key violation — check b_id, u_id, cust_id, table_id",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// PUT /orders/:id — full update
// ─────────────────────────────────────────────
export const updateOrder = async (req, res) => {
  try {
    const {
      or_tax,
      or_totalcost,
      or_totalCostWtax,
      or_status,
      or_type,
      cust_id,
      u_id,
      b_id,
      table_id,
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE "ORDER" SET
         or_tax             = $1,
         or_totalcost       = $2,
         "or_totalCostWtax" = $3,
         or_status          = $4,
         or_type            = $5,
         cust_id            = $6,
         u_id               = $7,
         b_id               = $8,
         table_id           = $9
       WHERE or_id = $10
       RETURNING *`,
      [
        or_tax,
        or_totalcost,
        or_totalCostWtax,
        or_status,
        or_type,
        cust_id ?? null,
        u_id,
        b_id,
        table_id ?? null,
        req.params.id,
      ]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "23514") {
      return res.status(400).json({
        success: false,
        error: "Invalid status or type value",
      });
    }
    if (err.code === "23503") {
      return res.status(400).json({
        success: false,
        error: "Foreign key violation — check b_id, u_id, cust_id, table_id",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// PATCH /orders/:id — partial update
// ─────────────────────────────────────────────
export const patchOrder = async (req, res) => {
  try {
    const allowed = [
      "or_tax",
      "or_totalcost",
      "or_totalCostWtax",
      "or_status",
      "or_type",
      "cust_id",
      "u_id",
      "b_id",
      "table_id",
    ];

    const updates = [];
    const values = [];
    let i = 1;

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        const col = key === "or_totalCostWtax" ? `"or_totalCostWtax"` : key;
        updates.push(`${col} = $${i++}`);
        values.push(req.body[key]);
      }
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, error: "No valid fields to update" });
    }

    values.push(req.params.id);

    const { rows } = await pool.query(
      `UPDATE "ORDER" SET ${updates.join(", ")} WHERE or_id = $${i} RETURNING *`,
      values
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "23514") {
      return res.status(400).json({
        success: false,
        error: "Invalid status or type value",
      });
    }
    if (err.code === "23503") {
      return res.status(400).json({
        success: false,
        error: "Foreign key violation — check b_id, u_id, cust_id, table_id",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// PATCH /orders/:id/status — update status only
// ─────────────────────────────────────────────
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: "status field required" });
    }

    const { rows } = await pool.query(
      `UPDATE "ORDER" SET or_status = $1 WHERE or_id = $2 RETURNING *`,
      [status, req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "23514") {
      return res.status(400).json({
        success: false,
        error: "Invalid status. Use: pending | preparing | completed | cancelled",
      });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE /orders/:id — delete order
// ─────────────────────────────────────────────
export const deleteOrder = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM "ORDER" WHERE or_id = $1 RETURNING *`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    res.status(200).json({ success: true, message: "Order deleted successfully", data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
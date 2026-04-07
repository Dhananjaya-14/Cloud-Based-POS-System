import pool from "../config/database.js";

// ─────────────────────────────────────────────
// GET all order items
// ─────────────────────────────────────────────
export const getAllOrderItems = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM public."ORDER_ITEM" ORDER BY "orderItem_id" ASC`
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET order items by order_id
// ─────────────────────────────────────────────
export const getOrderItemsByOrderId = async (req, res) => {
  try {
    const { order_id } = req.params;
    const result = await pool.query(
      `SELECT * FROM public."ORDER_ITEM" WHERE order_id = $1`,
      [order_id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "No items found for this order" });
    }
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// GET single order item by orderItem_id
// ─────────────────────────────────────────────
export const getOrderItemById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM public."ORDER_ITEM" WHERE "orderItem_id" = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order item not found" });
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// POST - Create new order item
// ─────────────────────────────────────────────
export const createOrderItem = async (req, res) => {
  try {
    const { Bpro_id, pro_quantity, unit_price, order_id } = req.body;

    // Validation — සියලු NOT NULL fields check කරනවා
    if (!Bpro_id || !pro_quantity || !unit_price || !order_id) {
      return res.status(400).json({
        success: false,
        message: "Bpro_id, pro_quantity, unit_price, and order_id are required",
      });
    }

    // total_price auto calculate
    const total_price = parseFloat(unit_price) * parseInt(pro_quantity);

    const result = await pool.query(
      `INSERT INTO public."ORDER_ITEM" ("Bpro_id", pro_quantity, unit_price, total_price, order_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [Bpro_id, pro_quantity, unit_price, total_price, order_id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// PUT - Update order item by orderItem_id
// ─────────────────────────────────────────────
export const updateOrderItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { Bpro_id, pro_quantity, unit_price, order_id } = req.body;

    const existing = await pool.query(
      `SELECT * FROM public."ORDER_ITEM" WHERE "orderItem_id" = $1`,
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order item not found" });
    }

    const current      = existing.rows[0];
    const newBProId    = Bpro_id      ?? current.Bpro_id;
    const newQty       = pro_quantity ?? current.pro_quantity;
    const newUnitPrice = unit_price   ?? current.unit_price;
    const newOrderId   = order_id     ?? current.order_id;
    const newTotalPrice = parseFloat(newUnitPrice) * parseInt(newQty);

    const result = await pool.query(
      `UPDATE public."ORDER_ITEM"
       SET "Bpro_id" = $1, pro_quantity = $2, unit_price = $3, total_price = $4, order_id = $5
       WHERE "orderItem_id" = $6
       RETURNING *`,
      [newBProId, newQty, newUnitPrice, newTotalPrice, newOrderId, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────
// DELETE - Delete order item by orderItem_id
// ─────────────────────────────────────────────
export const deleteOrderItem = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM public."ORDER_ITEM" WHERE "orderItem_id" = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order item not found" });
    }
    res.json({ success: true, message: "Order item deleted", data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
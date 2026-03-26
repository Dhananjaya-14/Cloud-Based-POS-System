import pool from "../config/database.js";

// CREATE CUSTOMER
export const createCustomer = async (req, res) => {
  try {
    const { cust_name, cust_email, cust_phone, cust_address } = req.body;

    const result = await pool.query(
      `INSERT INTO "CUSTOMER" ("cust_name", "cust_email", "cust_phone", "cust_address")
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [cust_name, cust_email, cust_phone, cust_address]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("CREATE ERROR:", err);
    res.status(500).json({ error: "Error creating customer" });
  }
};

// GET ALL CUSTOMERS
export const getCustomers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "CUSTOMER"');
    res.json(result.rows);
  } catch (err) {
    console.error("GET ALL ERROR:", err);
    res.status(500).json({ error: "Error fetching customers" });
  }
};

// GET CUSTOMER WITH ORDERS + RESERVATIONS
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        c.*,
        COALESCE(json_agg(DISTINCT o.*) FILTER (WHERE o.order_id IS NOT NULL), '[]') AS orders,
        COALESCE(json_agg(DISTINCT r.*) FILTER (WHERE r.reservation_id IS NOT NULL), '[]') AS reservations
      FROM "CUSTOMER" c
      LEFT JOIN "ORDER" o ON c."cust_id" = o."cust_id"
      LEFT JOIN "RESERVATION" r ON c."cust_id" = r."cust_id"
      WHERE c."cust_id" = $1
      GROUP BY c."cust_id"`,
      [id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("GET BY ID ERROR:", err);
    res.status(500).json({ error: "Error fetching customer" });
  }
};

// UPDATE CUSTOMER
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { cust_name, cust_email, cust_phone, cust_address, loyalty_points } = req.body;

    const result = await pool.query(
      `UPDATE "CUSTOMER"
       SET "cust_name"=$1, "cust_email"=$2, "cust_phone"=$3, "cust_address"=$4, "loyalty_points"=$5
       WHERE "cust_id"=$6
       RETURNING *`,
      [cust_name, cust_email, cust_phone, cust_address, loyalty_points, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE ERROR:", err);
    res.status(500).json({ error: "Error updating customer" });
  }
};

// DELETE CUSTOMER
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM "CUSTOMER" WHERE "cust_id"=$1', [id]);

    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error("DELETE ERROR:", err);
    res.status(500).json({ error: "Error deleting customer" });
  }
};
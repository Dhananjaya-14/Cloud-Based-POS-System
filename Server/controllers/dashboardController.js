import pool from "../config/database.js";


export async function getCashierDashboardStats(req, res) {
  try {
    const { b_id } = req.query;

    if (!b_id) {
      return res.status(400).json({
        message: "Branch ID is required",
      });
    }

    const query = `
      SELECT
          (
              SELECT COALESCE(SUM(p."pay_amount"), 0)
              FROM "Payment" p
              JOIN "ORDER" o ON p."or_id" = o."or_id"
              WHERE p."pay_status" = 'paid'
                AND p."pay_date" = CURRENT_DATE
                AND o."b_id" = $1
          ) AS revenue,

          (
              SELECT COUNT(DISTINCT o."or_id")
              FROM "ORDER" o
              LEFT JOIN "Payment" p ON p."or_id" = o."or_id"
              WHERE (o."or_status" = 'completed' OR p."pay_status" = 'paid')
                AND (o."or_date" = CURRENT_DATE OR p."pay_date" = CURRENT_DATE)
                AND o."b_id" = $1
          ) AS transactions,

          (
              SELECT COUNT(DISTINCT o."cust_id")
              FROM "ORDER" o
              LEFT JOIN "Payment" p ON p."or_id" = o."or_id"
              WHERE (o."or_status" = 'completed' OR p."pay_status" = 'paid')
                AND (o."or_date" = CURRENT_DATE OR p."pay_date" = CURRENT_DATE)
                AND o."b_id" = $1
          ) AS total_customers,

          (
              SELECT COALESCE(SUM(oi.pro_quantity), 0)
              FROM "ORDER_ITEM" oi
              JOIN "ORDER" o ON oi."order_id" = o."or_id"
              LEFT JOIN "Payment" p ON p."or_id" = o."or_id"
              WHERE (o."or_status" = 'completed' OR p."pay_status" = 'paid')
                AND (o."or_date" = CURRENT_DATE OR p."pay_date" = CURRENT_DATE)
                AND o."b_id" = $1
          ) AS products_sold
    `;

    const result = await pool.query(query, [b_id]);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Dashboard Stats Error:", error);

    res.status(500).json({
      message: error.message,
      detail:error
    });
  }
};


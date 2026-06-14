import pool from "../config/database.js";

export const getSalesSummaryReport = async (req, res) => {
  try {
    const {
      b_id,
      filterType="daily",
      fromDate,
      toDate,
      status,
      columns,
    } = req.body;

    if (!b_id) {
      return res.status(400).json({
        message: "Branch ID is required",
      });
    }
    const columnMap = {
      pay_date: "p.pay_date",
      pay_method: "p.pay_method",
      cust_name: "c.cust_name",
      total_cost: "o.or_totalcost",
      tax: "o.or_tax",
      totalCostWtax: 'o."or_totalCostWtax"',
    };
     const selectedColumns =
      columns && columns.length > 0
        ? columns
            .filter((col) => columnMap[col])
            .map(
              (col) =>
                `${columnMap[col]} AS "${col}"`
            )
            .join(", ")
        : `
          p."pay_date" AS pay_date,
          p."pay_method" AS pay_method,
          c."cust_name" AS cust_name,
          o."or_totalcost" AS total_cost,
          o."or_tax" AS tax,
          o."or_totalCostWtax" AS "totalCostWtax"
        `;

    let query = `
      SELECT
      ${selectedColumns}

      FROM "ORDER" o

      LEFT JOIN "Payment" p
      ON p."or_id" = o."or_id"

      LEFT JOIN "CUSTOMER" c
      ON c."cust_id" = o."cust_id"

      WHERE o."b_id" = $1
      AND o."or_status" = 'completed'
    `;

    const params = [b_id];

    if (
      ["weekly", "monthly", "custom"].includes(filterType) &&
      fromDate &&
      toDate
    ) {
      query += `
        AND p."pay_date"
        BETWEEN $${params.length + 1}
        AND $${params.length + 2}
      `;

      params.push(fromDate);
      params.push(toDate);
    }

    if (filterType === "daily") {
      query += `
        AND p."pay_date" = CURRENT_DATE
      `;
    }

    query += `
      ORDER BY p."pay_date" DESC
    `;

    const result =
      await pool.query(query, params);

    const grandTotal =
      result.rows.reduce(
        (sum, row) =>
          sum +
          Number(
            row.totalCostWtax || 0
          ),
        0
      );

    res.status(200).json({
      data: result.rows,
      grandTotal,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Failed to generate report",
      error: error.message,
    });

  }
    
};


import pool from "../config/database.js";

//Branch Admin
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
      pay_time: 'o."or_time"',
      pay_method: "p.pay_method",
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
          o."or_time" AS pay_time,
          p."pay_method" AS pay_method,
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
      ["weekly", "monthly", "custom"].includes(filterType) &&fromDate &&toDate
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
        AND p."pay_date" = $${params.length + 1}
      `;
      params.push(fromDate);
    }

    query += `
      ORDER BY p."pay_date" DESC
    `;

    const result =
      await pool.query(query, params);

    const grandTotal =
      result.rows.reduce(
        (sum, row) =>sum +Number(row.totalCostWtax || 0),0
      );

    res.status(200).json({
      data: result.rows,
      grandTotal,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:"Failed to generate report",
      error: error.message,
    });

  }
    
};

export const getProductSalesReport = async (req, res) => {
  try {
    const {
      b_id,
      filterType = "daily",
      fromDate,
      toDate,
      columns,
    } = req.body;

    if (!b_id) {
      return res.status(400).json({
        message: "Branch ID is required",
      });
    }
    const columnMap = {
        pay_date: 'p."pay_date"',
        pay_time: 'o."or_time"',
        prod_name: 'bp."pro_name"',
        quantity: 'SUM(oi."pro_quantity")',
        unit_price: 'MAX(oi."unit_price")',
        total_sale: 'SUM(oi."total_price")',
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
        o."or_time" AS pay_time,
        bp."pro_name" AS prod_name,
        SUM(oi."pro_quantity") AS quantity,
        MAX(oi."unit_price") AS unit_price,
        SUM(oi."total_price") AS total_sale
      `;

    let query = `
      SELECT
       ${selectedColumns}

      FROM "ORDER" o

      INNER JOIN "Payment" p
        ON p."or_id" = o."or_id"

      INNER JOIN "ORDER_ITEM" oi
        ON oi."order_id" = o."or_id"

      INNER JOIN "Branch_Product" bp
        ON bp."Bpro_id" = oi."Bpro_id"

      WHERE o."b_id" = $1
      AND o."or_status" = 'completed'
      AND p."pay_status" = 'paid'
    `;

    const params = [b_id];

    if (filterType === "daily") {
      query += `
        AND p."pay_date" = $${params.length + 1}
      `;
      params.push(fromDate);
    }

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

    query += `
      GROUP 
      BY
        p."pay_date",
        o."or_time",
        bp."pro_name"

      ORDER BY
        p."pay_date" DESC,
        bp."pro_name"
    `;

    const result = await pool.query(
      query,
      params
    );

    const grandTotal = result.rows.reduce(
      (sum, row) =>sum + Number(row.total_sale || 0),0);

    res.status(200).json({
      data: result.rows,
      grandTotal,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        "Failed to generate product sales report",
      error: error.message,
    });
  }
};

export const getRawMaterialStockReport = async (req, res) => {
  try {
    const {
      b_id,
      stockFilter = "all",
      columns,
    } = req.body;

    if (!b_id) {
      return res.status(400).json({
        message: "Branch ID is required",
      });
    }

    const columnMap = {
      rm_name: 'rm."rm_name"',
      unit: 'rm."unit"',
      stock_qty: 'rm."stock_qty"',
      status: `
        CASE
          WHEN rm."stock_qty" = 0
            THEN 'Out of Stock'
          WHEN rm."stock_qty" <= rm."record_level"
            THEN 'Low Stock'
          ELSE 'In Stock'
        END
      `,
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
          rm."rm_name" AS rm_name,
          rm."unit" AS unit,
          rm."stock_qty" AS stock_qty,

          CASE
            WHEN rm."stock_qty" = 0
              THEN 'Out of Stock'
            WHEN rm."stock_qty" <= rm."record_level"
              THEN 'Low Stock'
            ELSE 'In Stock'
          END AS status
        `;

    let query = `
      SELECT
        ${selectedColumns}

      FROM "Raw_Material" rm

      WHERE rm."b_id" = $1
    `;

    const params = [b_id];

    if (stockFilter === "low") {
      query += `
        AND rm."stock_qty" > 0
        AND rm."stock_qty"
            <= rm."record_level"
      `;
    }

    if (stockFilter === "out") {
      query += `
        AND rm."stock_qty" = 0
      `;
    }

    query += `
      ORDER BY rm."rm_name"
    `;

    const result =
      await pool.query(query, params);

    res.status(200).json({
      data: result.rows,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Failed to generate Raw Material Stock Report",
      error: error.message,
    });

  }
};


export const getRawMaterialConsumptionReport = async (req,res) => {
  try {
    const {
      b_id,
      filterType = "daily",
      fromDate,
      toDate,
      columns,
    } = req.body;

    if (!b_id) {
      return res.status(400).json({
        message: "Branch ID is required",
      });
    }

    const columnMap = {
      report_date: 'o."or_date"',

      rm_name: 'rm."rm_name"',

      unit: 'rm."unit"',

      quantity: `
        SUM(
          CASE
            WHEN LOWER(r."unit") IN ('g','ml')
            THEN (
              oi."pro_quantity" *
              r."quantity_req"
            ) / 1000.0

            ELSE (
              oi."pro_quantity" *
              r."quantity_req"
            )
          END
        )
      `,

      unit_cost: `
        COALESCE(
          MAX(pi."unit_price"),
          0
        )
      `,

      total_cost: `
        SUM(
          CASE
            WHEN LOWER(r."unit") IN ('g','ml')
            THEN (
              oi."pro_quantity" *
              r."quantity_req"
            ) / 1000.0

            ELSE (
              oi."pro_quantity" *
              r."quantity_req"
            )
          END
        )
        *
        COALESCE(
          MAX(pi."unit_price"),
          0
        )
      `,
    };

    const selectedColumns =
      columns && columns.length > 0
        ? columns
            .filter(
              (col) => columnMap[col]
            )
            .map(
              (col) =>
                `${columnMap[col]} AS "${col}"`
            )
            .join(", ")
        : `
          o."or_date" AS report_date,

          rm."rm_name" AS rm_name,

          rm."unit" AS unit,

          SUM(
            CASE
              WHEN LOWER(r."unit") IN ('g','ml')
              THEN (
                oi."pro_quantity" *
                r."quantity_req"
              ) / 1000.0

              ELSE (
                oi."pro_quantity" *
                r."quantity_req"
              )
              END
            ) AS quantity,

          COALESCE(
            MAX(pi."unit_price"),
            0
          ) AS unit_cost,

          SUM(
            CASE
              WHEN LOWER(r."unit") IN ('g','ml')
              THEN (
                oi."pro_quantity" *
                r."quantity_req"
              ) / 1000.0

              ELSE (
                oi."pro_quantity" *
                r."quantity_req"
              )
            END
          )
          *
          COALESCE(
            COALESCE(pi."unit_price", 0)
          ) AS total_cost `;

    let query = `
      SELECT
        ${selectedColumns}

      FROM "ORDER" o

      INNER JOIN "ORDER_ITEM" oi
        ON oi."order_id" = o."or_id"

      INNER JOIN "Branch_Product" bp
        ON bp."Bpro_id" = oi."Bpro_id"

      INNER JOIN "RECIPE" r
        ON r."pro_id" = bp."pro_id"

      INNER JOIN "Raw_Material" rm
        ON rm."rm_id" = r."rawmaterial_ID"

     LEFT JOIN (
        SELECT
          "rm_id",
          MAX("unit_price") AS unit_price
        FROM "purchase_item"
        GROUP BY "rm_id"
      ) pi
      ON pi."rm_id" = rm."rm_id"
      WHERE o."b_id" = $1

      AND o."or_status" IN (
        'preparing',
        'completed'
      )
    `;

    const params = [b_id];

    if (filterType === "daily") {
      query += `
        AND o."or_date" = $${params.length + 1}
      `;
      params.push(fromDate);
    }
    if (
      ["weekly", "monthly", "custom"].includes(
        filterType
      ) &&
      fromDate &&
      toDate
    ) {
      query += `
        AND o."or_date"
        BETWEEN $${params.length + 1}
        AND $${params.length + 2}
      `;

      params.push(fromDate);
      params.push(toDate);
    }

    query += `
      GROUP BY
        pi."unit_price",
        o."or_date",
        rm."rm_name",
        rm."unit"

      ORDER BY
        o."or_date" DESC,
        rm."rm_name"
    `;

    const result = await pool.query(
      query,
      params
    );

    const grandTotal =
      result.rows.reduce(
        (sum, row) => sum + Number(row.total_cost || 0),0);

    res.status(200).json({
      data: result.rows,
      grandTotal,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        "Failed to generate raw material consumption report",
      error: error.message,
    });
  }
};

//Cashier
export const getSalesDetailsReport =
  async (req, res) => {
    try {
      const {
        b_id,
        filterType = "daily",
        fromDate,
        toDate,
        columns,
      } = req.body;

      if (!b_id) {
        return res.status(400).json({
          message:
            "Branch ID is required",
        });
      }

      const columnMap = {
        invoice_no: 'o."or_id"',

        order_date: 'o."or_date"',

        order_time: 'o."or_time"',


        order_type:'o."or_type"',

        payment_method:'p."pay_method"',

        subtotal:'o."or_totalcost"',
      };

      const selectedColumns =
        columns &&
        columns.length > 0
          ? columns
              .filter(
                (col) =>
                  columnMap[col]
              )
              .map(
                (col) =>
                  `${columnMap[col]} AS "${col}"`
              )
              .join(", ")
          : `
            o."or_id" AS invoice_no,
            o."or_date" AS order_date,
            o."or_time" AS order_time,
            o."or_type" AS order_type,
            p."pay_method" AS payment_method,
            o."or_totalcost" AS subtotal
          `;

      let query = `
        SELECT
          ${selectedColumns}

        FROM "ORDER" o

        INNER JOIN "Payment" p
          ON p."or_id" = o."or_id"


        WHERE o."b_id" = $1
        AND p."pay_status" = 'paid'
      `;

      const params = [b_id];

      if (
        ["weekly", "monthly", "custom"].includes(
          filterType
        ) &&
        fromDate &&
        toDate
      ) {
        query += `
          AND o."or_date"
          BETWEEN $${
            params.length + 1
          }
          AND $${
            params.length + 2
          }
        `;

        params.push(fromDate);
        params.push(toDate);
      }

      if (
        filterType === "daily"
      ) {
        query += `
          AND o."or_date" =
          CURRENT_DATE
        `;
      }

      query += `
        ORDER BY
          o."or_date" DESC,
          o."or_time" DESC
      `;

      const result =
        await pool.query(
          query,
          params
        );

      const grandTotal =
        result.rows.reduce(
          (sum, row) =>sum + Number( row.subtotal || 0 ), 0 );
      res.status(200).json({
        data: result.rows,
        grandTotal,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "Failed to generate Sales Details Report",
        error:
          error.message,
      });
    }
  };

//Company Admin
export const getBranchWiseSalesReport =
  async (req, res) => {
    try {
      const {
        com_id,
        filterType = "daily",
        fromDate,
        toDate,
        columns,
      } = req.body;

      if (!com_id) {
        return res.status(400).json({
          message:
            "Company ID is required",
        });
      }

      const columnMap = {
        report_date:
          'o."or_date"',

        branch_name:
          'b."B_name"',

        branch_address: 'b."B_address"',

        total_orders: `
          COUNT(
            DISTINCT o."or_id"
          )
        `,

        total_products: `
          SUM(
            oi."pro_quantity"
          )
        `,

        total_sales: `
          SUM(
            o."or_totalcost"
          )
        `,
      };

      const selectedColumns =
        columns &&
        columns.length > 0
          ? columns
              .filter(
                (col) =>
                  columnMap[col]
              )
              .map(
                (col) =>
                  `${columnMap[col]} AS "${col}"`
              )
              .join(", ")
          : `
            o."or_date" AS report_date,

            b."B_name" AS branch_name,

            b."B_address" AS branch_address,

            COUNT(
              DISTINCT o."cust_id"
            ) AS total_customers,

            SUM(
              oi."pro_quantity"
            ) AS total_products,

            SUM(
              o."or_totalcost"
            ) AS total_sales
          `;

      let query = `
        SELECT
          ${selectedColumns}

        FROM "ORDER" o

        INNER JOIN "Branch" b
          ON b."B_id" = o."b_id"

        INNER JOIN "Company" c
          ON c."com_id" =
             b."com_id"

        INNER JOIN "Payment" p
          ON p."or_id" =
             o."or_id"

        INNER JOIN "ORDER_ITEM" oi
          ON oi."order_id" =
             o."or_id"

        WHERE c."com_id" = $1

        AND p."pay_status" =
            'paid'
      `;

      const params = [com_id];

      if (
        filterType === "daily"
      ) {
        query += `
          AND o."or_date" =
              CURRENT_DATE
        `;
      }

      if (
        ["weekly", "monthly", "custom"]
          .includes(filterType) &&
        fromDate &&
        toDate
      ) {
        query += `
          AND o."or_date"
          BETWEEN $${params.length + 1}
          AND $${params.length + 2}
        `;

        params.push(fromDate);
        params.push(toDate);
      }

      query += `
        GROUP BY
          o."or_date",
          b."B_name",
           b."B_address"

        ORDER BY
          o."or_date" DESC,
          b."B_name"
      `;

      const result =
        await pool.query(
          query,
          params
        );

      const grandTotal =
        result.rows.reduce(
          (sum, row) =>
            sum +
            Number(
              row.total_sales || 0
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
          "Failed to generate Branch Wise Sales Report",
        error:
          error.message,
      });
    }
  };
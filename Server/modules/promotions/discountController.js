import pool from "../../config/database.js";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const VALID_DISCOUNT_TYPES = ["order", "product", "loyalty", "combo"];
const VALID_VALUE_TYPES = ["percentage", "fixed"];

// ─────────────────────────────────────────────
// VALIDATION HELPER
// ─────────────────────────────────────────────

function validateDiscountBody(body, isUpdate = false) {
  const errors = [];
  const {
    discount_name,
    discount_type,
    value_type,
    discount_value,
    coupon_code,
    start_date,
    end_date,
    start_time,
    end_time,
    max_uses,
    min_order_amount,
    Bpro_id,
    b_id,
    discount_amount,
  } = body;

  if (!isUpdate) {
    // Required fields on CREATE
    if (!discount_name?.trim()) errors.push("discount_name is required.");

    if (!discount_type || !VALID_DISCOUNT_TYPES.includes(discount_type))
      errors.push(
        `discount_type must be one of: ${VALID_DISCOUNT_TYPES.join(", ")}.`,
      );

    if (!value_type || !VALID_VALUE_TYPES.includes(value_type))
      errors.push(
        `value_type must be one of: ${VALID_VALUE_TYPES.join(", ")}.`,
      );

    if (
      discount_value === undefined ||
      isNaN(discount_value) ||
      parseFloat(discount_value) <= 0
    )
      errors.push("discount_value must be a positive number.");

    if (
      discount_amount === undefined ||
      isNaN(discount_amount) ||
      parseFloat(discount_amount) < 0
    )
      errors.push("discount_amount must be a non-negative number.");

    if (Bpro_id === undefined || Bpro_id === null || isNaN(Bpro_id))
      errors.push("Bpro_id (Branch Product ID) is required.");

    if (b_id === undefined || b_id === null || isNaN(b_id))
      errors.push("b_id (Branch ID) is required.");
  }

  // Optional fields — validated only when present
  if (discount_name !== undefined && !discount_name?.trim())
    errors.push("discount_name cannot be empty.");

  if (
    discount_type !== undefined &&
    !VALID_DISCOUNT_TYPES.includes(discount_type)
  )
    errors.push(
      `discount_type must be one of: ${VALID_DISCOUNT_TYPES.join(", ")}.`,
    );

  if (value_type !== undefined && !VALID_VALUE_TYPES.includes(value_type))
    errors.push(`value_type must be one of: ${VALID_VALUE_TYPES.join(", ")}.`);

  if (
    discount_value !== undefined &&
    (isNaN(discount_value) || parseFloat(discount_value) <= 0)
  )
    errors.push("discount_value must be a positive number.");

  if (value_type === "percentage" && parseFloat(discount_value) > 100)
    errors.push("Percentage discount_value cannot exceed 100.");

  if (
    discount_amount !== undefined &&
    (isNaN(discount_amount) || parseFloat(discount_amount) < 0)
  )
    errors.push("discount_amount must be a non-negative number.");

  if (
    coupon_code !== undefined &&
    coupon_code !== null &&
    coupon_code.trim().length > 50
  )
    errors.push("coupon_code cannot exceed 50 characters.");

  if (start_date && isNaN(Date.parse(start_date)))
    errors.push("start_date must be a valid date (YYYY-MM-DD).");

  if (end_date && isNaN(Date.parse(end_date)))
    errors.push("end_date must be a valid date (YYYY-MM-DD).");

  if (start_date && end_date && new Date(start_date) > new Date(end_date))
    errors.push("start_date cannot be after end_date.");

  if (start_time && !/^\d{2}:\d{2}(:\d{2})?$/.test(start_time))
    errors.push("start_time must be HH:MM or HH:MM:SS.");

  if (end_time && !/^\d{2}:\d{2}(:\d{2})?$/.test(end_time))
    errors.push("end_time must be HH:MM or HH:MM:SS.");

  if (
    max_uses !== undefined &&
    max_uses !== null &&
    (isNaN(max_uses) || parseInt(max_uses) < 1)
  )
    errors.push("max_uses must be a positive integer.");

  if (
    min_order_amount !== undefined &&
    (isNaN(min_order_amount) || parseFloat(min_order_amount) < 0)
  )
    errors.push("min_order_amount must be >= 0.");

  return errors;
}

// ─────────────────────────────────────────────
// BUSINESS LOGIC HELPERS
// ─────────────────────────────────────────────

function isDiscountValid(discount, orderAmount = 0, now = new Date()) {
  if (!discount.is_active)
    return { valid: false, reason: "Discount is inactive." };

  const today = now.toISOString().split("T")[0];
  const currentTime = now.toTimeString().split(" ")[0];

  if (discount.start_date && today < discount.start_date)
    return { valid: false, reason: "Discount period has not started yet." };

  if (discount.end_date && today > discount.end_date)
    return { valid: false, reason: "Discount has expired." };

  if (discount.start_time && currentTime < discount.start_time)
    return { valid: false, reason: "Discount is not active at this time." };

  if (discount.end_time && currentTime > discount.end_time)
    return { valid: false, reason: "Discount has ended for today." };

  const dayMap = [
    "apply_sunday",
    "apply_monday",
    "apply_tuesday",
    "apply_wednesday",
    "apply_thursday",
    "apply_friday",
    "apply_saturday",
  ];
  if (!discount[dayMap[now.getDay()]])
    return { valid: false, reason: "Discount does not apply today." };

  if (discount.max_uses !== null && discount.uses_count >= discount.max_uses)
    return { valid: false, reason: "Discount usage limit reached." };

  const minOrder = parseFloat(discount.min_order_amount) || 0;
  if (orderAmount < minOrder)
    return {
      valid: false,
      reason: `Minimum order amount of ${minOrder} required.`,
    };

  return { valid: true };
}

function calculateDiscountAmount(discount, orderAmount) {
  if (discount.value_type === "percentage") {
    return parseFloat(
      ((orderAmount * discount.discount_value) / 100).toFixed(2),
    );
  }
  return Math.min(parseFloat(discount.discount_value), orderAmount);
}

// ─────────────────────────────────────────────
// CONTROLLERS
// ─────────────────────────────────────────────

// GET /api/discounts
export const getDiscounts = async (req, res) => {
  try {
    const { type, active, branch_id, company_id } = req.query;

    let query = "SELECT * FROM discount WHERE 1=1";
    const params = [];

    if (type) {
      params.push(type);
      query += ` AND discount_type = $${params.length}`;
    }
    if (active !== undefined) {
      params.push(active === "true");
      query += ` AND is_active = $${params.length}`;
    }
    if (branch_id) {
      params.push(branch_id);
      query += ` AND b_id = $${params.length}`;
    }
    if (company_id) {
      params.push(company_id);
      query += ` AND "Com_id" = $${params.length}`;
    }

    query += " ORDER BY discount_id DESC";

    const { rows } = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/discounts/:id
export const getDiscountById = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid discount ID." });

    const { rows } = await pool.query(
      "SELECT * FROM discount WHERE discount_id = $1",
      [id],
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Discount not found." });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/discounts
export const createDiscount = async (req, res) => {
  try {
    const errors = validateDiscountBody(req.body, false);
    if (errors.length) return res.status(422).json({ success: false, errors });

    const {
      discount_name,
      discount_type,
      value_type,
      discount_value,
      discount_amount,
      coupon_code = null,
      start_date = null,
      end_date = null,
      start_time = null,
      end_time = null,
      apply_monday = true,
      apply_tuesday = true,
      apply_wednesday = true,
      apply_thursday = true,
      apply_friday = true,
      apply_saturday = true,
      apply_sunday = true,
      is_active = true,
      max_uses = null,
      min_order_amount = 0,
      points_required = null,
      Bpro_id, // NOT NULL in DB — required, no default
      b_id, // NOT NULL in DB — required, no default
      Com_id = null,
      or_id = null,
      cust_id = null,
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO discount (
         discount_name, discount_type, value_type, discount_value, discount_amount,
         coupon_code, start_date, end_date, start_time, end_time,
         apply_monday, apply_tuesday, apply_wednesday, apply_thursday,
         apply_friday, apply_saturday, apply_sunday,
         is_active, max_uses, min_order_amount, points_required,
         "Bpro_id", b_id, "Com_id", or_id, cust_id
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
         $11,$12,$13,$14,$15,$16,$17,
         $18,$19,$20,$21,$22,$23,$24,$25,$26
       ) RETURNING *`,
      [
        discount_name,
        discount_type,
        value_type,
        discount_value,
        discount_amount,
        coupon_code,
        start_date,
        end_date,
        start_time,
        end_time,
        apply_monday,
        apply_tuesday,
        apply_wednesday,
        apply_thursday,
        apply_friday,
        apply_saturday,
        apply_sunday,
        is_active,
        max_uses,
        min_order_amount,
        points_required,
        Bpro_id,
        b_id,
        Com_id,
        or_id,
        cust_id,
      ],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "23505")
      return res
        .status(409)
        .json({ success: false, message: "Coupon code already exists." });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/discounts/:id  — full replacement (all fields required)
export const updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid discount ID." });

    // Re-use create validation (isUpdate=false) so all required fields are enforced
    const errors = validateDiscountBody(req.body, false);
    if (errors.length) return res.status(422).json({ success: false, errors });

    const {
      discount_name,
      discount_type,
      value_type,
      discount_value,
      discount_amount,
      coupon_code = null,
      start_date = null,
      end_date = null,
      start_time = null,
      end_time = null,
      apply_monday = true,
      apply_tuesday = true,
      apply_wednesday = true,
      apply_thursday = true,
      apply_friday = true,
      apply_saturday = true,
      apply_sunday = true,
      is_active = true,
      max_uses = null,
      min_order_amount = 0,
      points_required = null,
      Bpro_id,
      b_id,
      Com_id = null,
      or_id = null,
      cust_id = null,
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE discount SET
         discount_name    = $1,
         discount_type    = $2,
         value_type       = $3,
         discount_value   = $4,
         discount_amount  = $5,
         coupon_code      = $6,
         start_date       = $7,
         end_date         = $8,
         start_time       = $9,
         end_time         = $10,
         apply_monday     = $11,
         apply_tuesday    = $12,
         apply_wednesday  = $13,
         apply_thursday   = $14,
         apply_friday     = $15,
         apply_saturday   = $16,
         apply_sunday     = $17,
         is_active        = $18,
         max_uses         = $19,
         min_order_amount = $20,
         points_required  = $21,
         "Bpro_id"        = $22,
         b_id             = $23,
         "Com_id"         = $24,
         or_id            = $25,
         cust_id          = $26
       WHERE discount_id = $27
       RETURNING *`,
      [
        discount_name,
        discount_type,
        value_type,
        discount_value,
        discount_amount,
        coupon_code,
        start_date,
        end_date,
        start_time,
        end_time,
        apply_monday,
        apply_tuesday,
        apply_wednesday,
        apply_thursday,
        apply_friday,
        apply_saturday,
        apply_sunday,
        is_active,
        max_uses,
        min_order_amount,
        points_required,
        Bpro_id,
        b_id,
        Com_id,
        or_id,
        cust_id,
        id,
      ],
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Discount not found." });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "23505")
      return res
        .status(409)
        .json({ success: false, message: "Coupon code already exists." });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/discounts/:id  — partial update (only provided fields change)
export const patchDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid discount ID." });

    const errors = validateDiscountBody(req.body, true);
    if (errors.length) return res.status(422).json({ success: false, errors });

    // Map JS field names → quoted DB column names where needed
    const COLUMN_MAP = {
      discount_name: "discount_name",
      discount_type: "discount_type",
      value_type: "value_type",
      discount_value: "discount_value",
      discount_amount: "discount_amount",
      coupon_code: "coupon_code",
      start_date: "start_date",
      end_date: "end_date",
      start_time: "start_time",
      end_time: "end_time",
      apply_monday: "apply_monday",
      apply_tuesday: "apply_tuesday",
      apply_wednesday: "apply_wednesday",
      apply_thursday: "apply_thursday",
      apply_friday: "apply_friday",
      apply_saturday: "apply_saturday",
      apply_sunday: "apply_sunday",
      is_active: "is_active",
      max_uses: "max_uses",
      min_order_amount: "min_order_amount",
      points_required: "points_required",
      Bpro_id: '"Bpro_id"',
      b_id: "b_id",
      Com_id: '"Com_id"',
      or_id: "or_id",
      cust_id: "cust_id",
    };

    const setClauses = [];
    const params = [];

    for (const [field, col] of Object.entries(COLUMN_MAP)) {
      if (field in req.body) {
        params.push(req.body[field] ?? null);
        setClauses.push(`${col} = $${params.length}`);
      }
    }

    if (!setClauses.length)
      return res.status(400).json({
        success: false,
        message: "No valid fields provided to update.",
      });

    params.push(id);
    const query = `
      UPDATE discount
      SET ${setClauses.join(", ")}
      WHERE discount_id = $${params.length}
      RETURNING *
    `;

    const { rows } = await pool.query(query, params);

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Discount not found." });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === "23505")
      return res
        .status(409)
        .json({ success: false, message: "Coupon code already exists." });
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/discounts/:id
export const deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid discount ID." });

    const { rowCount } = await pool.query(
      "DELETE FROM discount WHERE discount_id = $1",
      [id],
    );

    if (!rowCount)
      return res
        .status(404)
        .json({ success: false, message: "Discount not found." });

    res.json({ success: true, message: "Discount deleted successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/discounts/:id/toggle
export const toggleDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id))
      return res
        .status(400)
        .json({ success: false, message: "Invalid discount ID." });

    const { rows } = await pool.query(
      `UPDATE discount
         SET is_active = NOT is_active
       WHERE discount_id = $1
       RETURNING discount_id, discount_name, is_active`,
      [id],
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Discount not found." });

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/discounts/apply
export const applyDiscount = async (req, res) => {
  try {
    const {
      coupon_code,
      discount_id,
      order_amount,
      branch_id,
      customer_id,
      loyalty_points = 0,
    } = req.body;

    const errors = [];
    if (!coupon_code && !discount_id)
      errors.push("Provide either coupon_code or discount_id.");
    if (
      order_amount === undefined ||
      isNaN(order_amount) ||
      parseFloat(order_amount) < 0
    )
      errors.push("order_amount must be a non-negative number.");
    if (errors.length) return res.status(422).json({ success: false, errors });

    const col = coupon_code ? "coupon_code" : "discount_id";
    const val = coupon_code ?? discount_id;
    const { rows } = await pool.query(
      `SELECT * FROM discount WHERE ${col} = $1`,
      [val],
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, message: "Discount not found." });

    const discount = rows[0];

    if (discount.b_id && branch_id && discount.b_id !== parseInt(branch_id))
      return res.status(403).json({
        success: false,
        message: "Discount not valid for this branch.",
      });

    if (
      discount.cust_id &&
      customer_id &&
      discount.cust_id !== parseInt(customer_id)
    )
      return res.status(403).json({
        success: false,
        message: "Discount is assigned to a different customer.",
      });

    if (discount.discount_type === "loyalty") {
      if (!customer_id)
        return res.status(400).json({
          success: false,
          message: "customer_id required for loyalty discount.",
        });
      if (loyalty_points < (discount.points_required || 0))
        return res.status(400).json({
          success: false,
          message: `Insufficient loyalty points. Required: ${discount.points_required}`,
        });
    }

    const validity = isDiscountValid(discount, parseFloat(order_amount));
    if (!validity.valid)
      return res.status(400).json({ success: false, message: validity.reason });

    const discountAmount = calculateDiscountAmount(
      discount,
      parseFloat(order_amount),
    );
    const finalAmount = parseFloat(
      Math.max(0, parseFloat(order_amount) - discountAmount).toFixed(2),
    );

    res.json({
      success: true,
      data: {
        discount_id: discount.discount_id,
        discount_name: discount.discount_name,
        discount_type: discount.discount_type,
        value_type: discount.value_type,
        discount_value: discount.discount_value,
        order_amount: parseFloat(order_amount),
        discount_amount: discountAmount,
        final_amount: finalAmount,
        coupon_code: discount.coupon_code,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/discounts/:id/redeem
export const redeemDiscount = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { or_id, discount_amount } = req.body;

    const errors = [];
    if (isNaN(id)) errors.push("Invalid discount ID.");
    if (!or_id) errors.push("or_id (order ID) is required.");
    if (
      discount_amount === undefined ||
      isNaN(discount_amount) ||
      parseFloat(discount_amount) < 0
    )
      errors.push("discount_amount must be a non-negative number.");
    if (errors.length) return res.status(422).json({ success: false, errors });

    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE discount
         SET uses_count     = uses_count + 1,
             discount_amount = $1,
             or_id           = $2
       WHERE discount_id = $3
         AND (max_uses IS NULL OR uses_count < max_uses)
         AND is_active = true
       RETURNING *`,
      [discount_amount, or_id, id],
    );

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message:
          "Discount could not be redeemed (inactive, expired, or usage limit reached).",
      });
    }

    await client.query("COMMIT");
    res.json({
      success: true,
      message: "Discount redeemed successfully.",
      data: rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// GET /api/discounts/validate/:coupon_code
export const validateCoupon = async (req, res) => {
  try {
    const { coupon_code } = req.params;
    const { order_amount = 0, branch_id } = req.query;

    if (!coupon_code?.trim())
      return res
        .status(400)
        .json({ success: false, message: "coupon_code is required." });

    const { rows } = await pool.query(
      "SELECT * FROM discount WHERE coupon_code = $1",
      [coupon_code],
    );

    if (!rows.length)
      return res
        .status(404)
        .json({ success: false, valid: false, message: "Coupon not found." });

    const discount = rows[0];

    if (discount.b_id && branch_id && discount.b_id !== parseInt(branch_id))
      return res.status(403).json({
        success: false,
        valid: false,
        message: "Coupon not valid for this branch.",
      });

    const validity = isDiscountValid(discount, parseFloat(order_amount));
    if (!validity.valid)
      return res
        .status(400)
        .json({ success: false, valid: false, message: validity.reason });

    const discountAmount = calculateDiscountAmount(
      discount,
      parseFloat(order_amount),
    );

    res.json({
      success: true,
      valid: true,
      data: {
        discount_id: discount.discount_id,
        discount_name: discount.discount_name,
        discount_type: discount.discount_type,
        value_type: discount.value_type,
        discount_value: discount.discount_value,
        estimated_discount: discountAmount,
        final_amount: parseFloat(
          (parseFloat(order_amount) - discountAmount).toFixed(2),
        ),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/discounts/active/today
export const getActiveDiscountsToday = async (req, res) => {
  try {
    const { branch_id, company_id } = req.query;
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTime = now.toTimeString().split(" ")[0];
    const dayMap = [
      "apply_sunday",
      "apply_monday",
      "apply_tuesday",
      "apply_wednesday",
      "apply_thursday",
      "apply_friday",
      "apply_saturday",
    ];
    const todayCol = dayMap[now.getDay()];

    let query = `
      SELECT * FROM discount
      WHERE is_active = true
        AND (start_date IS NULL OR start_date <= $1)
        AND (end_date   IS NULL OR end_date   >= $1)
        AND (start_time IS NULL OR start_time <= $2)
        AND (end_time   IS NULL OR end_time   >= $2)
        AND ${todayCol} = true
        AND (max_uses IS NULL OR uses_count < max_uses)
    `;
    const params = [today, currentTime];

    if (branch_id) {
      params.push(branch_id);
      query += ` AND (b_id = $${params.length} OR b_id IS NULL)`;
    }
    if (company_id) {
      params.push(company_id);
      query += ` AND ("Com_id" = $${params.length} OR "Com_id" IS NULL)`;
    }

    query += " ORDER BY discount_id DESC";

    const { rows } = await pool.query(query, params);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/discounts/combo/check
export const checkComboDiscount = async (req, res) => {
  try {
    const { branch_product_ids = [], branch_id, order_amount = 0 } = req.body;

    if (!Array.isArray(branch_product_ids) || branch_product_ids.length === 0)
      return res.status(422).json({
        success: false,
        errors: ["branch_product_ids must be a non-empty array."],
      });

    const { rows } = await pool.query(
      `SELECT * FROM discount
       WHERE discount_type = 'combo'
         AND is_active = true
         AND "Bpro_id" = ANY($1::int[])
         AND (b_id = $2 OR b_id IS NULL)`,
      [branch_product_ids, branch_id ?? null],
    );

    const now = new Date();
    const eligible = rows.filter(
      (d) => isDiscountValid(d, parseFloat(order_amount), now).valid,
    );

    res.json({ success: true, count: eligible.length, data: eligible });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/discounts/stats/summary
export const getDiscountStats = async (req, res) => {
  try {
    const { branch_id, company_id } = req.query;
    let where = "WHERE 1=1";
    const params = [];

    if (branch_id) {
      params.push(branch_id);
      where += ` AND b_id = $${params.length}`;
    }
    if (company_id) {
      params.push(company_id);
      where += ` AND "Com_id" = $${params.length}`;
    }

    const { rows } = await pool.query(
      `SELECT
         COUNT(*)                                              AS total_discounts,
         SUM(CASE WHEN is_active THEN 1 ELSE 0 END)           AS active_discounts,
         SUM(uses_count)                                       AS total_uses,
         COALESCE(SUM(discount_amount),  0)                   AS total_discount_given,
         COALESCE(ROUND(AVG(discount_amount)::numeric, 2), 0) AS avg_discount_amount
       FROM discount ${where}`,
      params,
    );

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

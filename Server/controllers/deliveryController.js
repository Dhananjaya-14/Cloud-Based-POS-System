// controllers/deliveryController.js
import { body, param, query, validationResult } from "express-validator";
import pool from "../config/database.js";

// ─── DB-Aligned Constants ─────────────────────────────────────────────────────
const DELIVERY_STATUSES = [
  "pending",
  "assigned",
  "picked_up",
  "on_the_way",
  "delivered",
  "failed",
  "cancelled",
];

const DELIVERY_PARTNERS = [
  "in_house",
  "uber_eats",
  "foodpanda",
  "pickme_food",
  "other",
];

// State machine — only valid forward transitions
const STATUS_TRANSITIONS = {
  pending: ["assigned", "cancelled"],
  assigned: ["picked_up", "cancelled"],
  picked_up: ["on_the_way", "cancelled"],
  on_the_way: ["delivered", "failed"],
  delivered: [], // terminal
  failed: ["pending"], // allow retry/reassign
  cancelled: [], // terminal
};

// ─── Validation Error Handler ─────────────────────────────────────────────────
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
        value: e.value,
      })),
    });
  }
  next();
};

// ─── Reusable: delivery_id param ──────────────────────────────────────────────
const v_deliveryId = param("id")
  .notEmpty()
  .withMessage("Delivery ID is required")
  .isInt({ min: 1 })
  .withMessage("Delivery ID must be a positive integer")
  .toInt();

// ─── DB error handler ─────────────────────────────────────────────────────────
const handleDbError = (err, res, next) => {
  if (err.code === "23503") {
    return res.status(422).json({
      success: false,
      message: "The referenced order (or_id) does not exist.",
      detail: err.detail,
    });
  }
  if (err.code === "23514") {
    return res.status(422).json({
      success: false,
      message: "A database constraint was violated. Check delivery_status.",
      detail: err.detail,
    });
  }
  next(err);
};

// ─── Helper: load delivery from DB ───────────────────────────────────────────
// Used by PUT and DELETE so validators can inspect current delivery_status
const loadDelivery = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM "DELIVERY" WHERE delivery_id = $1',
      [req.params.id],
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery not found" });
    }
    req.delivery = rows[0];
    next();
  } catch (err) {
    next(err);
  }
};

// ═════════════════════════════════════════════════════════════════════════════
//  GET /deliveries
//  Access: Cashier | Branch Admin | Admin  (requireCashierOrAbove)
// ═════════════════════════════════════════════════════════════════════════════
export const getDeliveriesValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage("limit must be 1–200")
    .toInt(),

  query("delivery_status")
    .optional()
    .isIn(DELIVERY_STATUSES)
    .withMessage(
      `delivery_status must be one of: ${DELIVERY_STATUSES.join(", ")}`,
    ),

  query("delivery_partner")
    .optional()
    .isIn(DELIVERY_PARTNERS)
    .withMessage(
      `delivery_partner must be one of: ${DELIVERY_PARTNERS.join(", ")}`,
    ),

  query("or_id")
    .optional()
    .isInt({ min: 1 })
    .withMessage("or_id must be a positive integer")
    .toInt(),

  validate,
];

export async function getDeliveries(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      delivery_status,
      delivery_partner,
      or_id,
    } = req.query;

    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (delivery_status) {
      conditions.push(`delivery_status  = $${idx++}`);
      values.push(delivery_status);
    }
    if (delivery_partner) {
      conditions.push(`delivery_partner = $${idx++}`);
      values.push(delivery_partner);
    }
    if (or_id) {
      conditions.push(`or_id            = $${idx++}`);
      values.push(or_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [
      {
        rows: [{ count }],
      },
      { rows: data },
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM "DELIVERY" ${where}`, values),
      pool.query(
        `SELECT
           delivery_id, delivery_partner, delivery_address,
           contact_number, delivery_status, estimated_time,
           delivery_fee, or_id
         FROM "DELIVERY" ${where}
         ORDER BY delivery_id DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...values, +limit, offset],
      ),
    ]);

    res.json({
      success: true,
      data,
      meta: {
        total: +count,
        page: +page,
        limit: +limit,
        pages: Math.ceil(+count / +limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  GET /deliveries/:id
//  Access: Cashier | Branch Admin | Admin  (requireCashierOrAbove)
// ═════════════════════════════════════════════════════════════════════════════
export const getDeliveryByIdValidation = [v_deliveryId, validate];

export async function getDeliveryById(req, res, next) {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM "DELIVERY" WHERE delivery_id = $1',
      [req.params.id],
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  POST /deliveries
//  Access: Cashier | Branch Admin | Admin  (requireCashierOrAbove)
// ═════════════════════════════════════════════════════════════════════════════
export const createDeliveryValidation = [
  // delivery_partner — who handles the delivery
  body("delivery_partner")
    .notEmpty()
    .withMessage("delivery_partner is required")
    .isIn(DELIVERY_PARTNERS)
    .withMessage(
      `delivery_partner must be one of: ${DELIVERY_PARTNERS.join(", ")}`,
    ),

  // delivery_address — free text, reasonable length limits
  body("delivery_address")
    .notEmpty()
    .withMessage("delivery_address is required")
    .isString()
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage("delivery_address must be between 5 and 300 characters"),

  // contact_number — international phone number
  body("contact_number")
    .notEmpty()
    .withMessage("contact_number is required")
    .isMobilePhone("any", { strictMode: false })
    .withMessage("contact_number must be a valid phone number")
    .isLength({ max: 20 })
    .withMessage("contact_number must be at most 20 characters"),

  // delivery_status — defaults to 'pending' on create only
  body("delivery_status")
    .optional()
    .isIn(DELIVERY_STATUSES)
    .withMessage(
      `delivery_status must be one of: ${DELIVERY_STATUSES.join(", ")}`,
    )
    .custom((val) => {
      if (val && val !== "pending") {
        throw new Error(
          "delivery_status on a new delivery can only be 'pending'",
        );
      }
      return true;
    }),

  // estimated_time — ISO 8601 datetime, must be in the future
  body("estimated_time")
    .notEmpty()
    .withMessage("estimated_time is required")
    .isISO8601()
    .withMessage("estimated_time must be a valid datetime (ISO 8601)")
    .custom((val) => {
      if (new Date(val) <= new Date()) {
        throw new Error("estimated_time must be a future datetime");
      }
      return true;
    }),

  // delivery_fee — non-negative, max 2 decimal places
  body("delivery_fee")
    .notEmpty()
    .withMessage("delivery_fee is required")
    .isFloat({ min: 0, max: 99999.99 })
    .withMessage("delivery_fee must be between 0.00 and 99,999.99")
    .toFloat()
    .custom((val) => {
      if (Math.round(val * 100) / 100 !== val) {
        throw new Error("delivery_fee must have at most 2 decimal places");
      }
      return true;
    }),

  // or_id — FK → public.ORDER(or_id), must exist and be a delivery-type order
  body("or_id")
    .notEmpty()
    .withMessage("or_id is required")
    .isInt({ min: 1 })
    .withMessage("or_id must be a positive integer")
    .toInt()
    .custom(async (or_id) => {
      const { rows } = await pool.query(
        'SELECT or_type, or_status FROM "ORDER" WHERE or_id = $1',
        [or_id],
      );
      if (!rows.length) {
        throw new Error(`Order ${or_id} does not exist`);
      }
      if (rows[0].or_type !== "delivery") {
        throw new Error(
          `Order ${or_id} is of type '${rows[0].or_type}'. Only delivery orders can have a delivery record.`,
        );
      }
      if (["completed", "cancelled"].includes(rows[0].or_status)) {
        throw new Error(
          `Cannot create a delivery for an order with status '${rows[0].or_status}'.`,
        );
      }
      // Prevent duplicate delivery record for the same order
      const dup = await pool.query(
        'SELECT delivery_id FROM "DELIVERY" WHERE or_id = $1',
        [or_id],
      );
      if (dup.rows.length) {
        throw new Error(`A delivery record already exists for order ${or_id}`);
      }
      return true;
    }),

  validate,
];

export async function createDelivery(req, res, next) {
  try {
    const {
      delivery_partner,
      delivery_address,
      contact_number,
      delivery_status = "pending",
      estimated_time,
      delivery_fee,
      or_id,
    } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO "DELIVERY"
         (delivery_partner, delivery_address, contact_number,
          delivery_status, estimated_time, delivery_fee, or_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        delivery_partner,
        delivery_address,
        contact_number,
        delivery_status,
        estimated_time,
        delivery_fee,
        or_id,
      ],
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    handleDbError(err, res, next);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  PUT /deliveries/:id  — full update
//  Access: Branch Admin | Admin  (requireBranchAdminOrAdmin)
// ═════════════════════════════════════════════════════════════════════════════
export const updateDeliveryValidation = [
  v_deliveryId,

  body("delivery_partner")
    .notEmpty()
    .withMessage("delivery_partner is required")
    .isIn(DELIVERY_PARTNERS)
    .withMessage(
      `delivery_partner must be one of: ${DELIVERY_PARTNERS.join(", ")}`,
    ),

  body("delivery_address")
    .notEmpty()
    .withMessage("delivery_address is required")
    .isString()
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage("delivery_address must be between 5 and 300 characters"),

  body("contact_number")
    .notEmpty()
    .withMessage("contact_number is required")
    .isMobilePhone("any", { strictMode: false })
    .withMessage("contact_number must be a valid phone number")
    .isLength({ max: 20 })
    .withMessage("contact_number must be at most 20 characters"),

  // delivery_status — enforce state machine against current DB value
  body("delivery_status")
    .notEmpty()
    .withMessage("delivery_status is required")
    .isIn(DELIVERY_STATUSES)
    .withMessage(
      `delivery_status must be one of: ${DELIVERY_STATUSES.join(", ")}`,
    )
    .custom((newStatus, { req }) => {
      const curr = req.delivery?.delivery_status; // set by loadDelivery
      if (!curr || curr === newStatus) return true; // no-op is fine

      const allowed = STATUS_TRANSITIONS[curr] ?? [];
      if (!allowed.includes(newStatus)) {
        throw new Error(
          `Cannot transition delivery_status from '${curr}' to '${newStatus}'. ` +
            `Allowed: [${allowed.join(", ") || "none — this status is terminal"}]`,
        );
      }
      return true;
    }),

  body("estimated_time")
    .notEmpty()
    .withMessage("estimated_time is required")
    .isISO8601()
    .withMessage("estimated_time must be a valid datetime (ISO 8601)"),

  body("delivery_fee")
    .notEmpty()
    .withMessage("delivery_fee is required")
    .isFloat({ min: 0, max: 99999.99 })
    .withMessage("delivery_fee must be between 0.00 and 99,999.99")
    .toFloat()
    .custom((val) => {
      if (Math.round(val * 100) / 100 !== val)
        throw new Error("delivery_fee must have at most 2 decimal places");
      return true;
    }),

  body("or_id")
    .notEmpty()
    .withMessage("or_id is required")
    .isInt({ min: 1 })
    .withMessage("or_id must be a positive integer")
    .toInt()
    .custom(async (or_id) => {
      const { rows } = await pool.query(
        'SELECT or_id FROM "ORDER" WHERE or_id = $1',
        [or_id],
      );
      if (!rows.length) throw new Error(`Order ${or_id} does not exist`);
      return true;
    }),

  // Cancellation requires a reason
  body("cancel_reason")
    .if(body("delivery_status").equals("cancelled"))
    .notEmpty()
    .withMessage("cancel_reason is required when cancelling a delivery")
    .isString()
    .trim()
    .isLength({ min: 5, max: 300 })
    .withMessage("cancel_reason must be 5–300 characters"),

  validate,
];

export async function updateDelivery(req, res, next) {
  try {
    const {
      delivery_partner,
      delivery_address,
      contact_number,
      delivery_status,
      estimated_time,
      delivery_fee,
      or_id,
    } = req.body;

    const { rows } = await pool.query(
      `UPDATE "DELIVERY"
       SET
         delivery_partner = $1,
         delivery_address = $2,
         contact_number   = $3,
         delivery_status  = $4,
         estimated_time   = $5,
         delivery_fee     = $6,
         or_id            = $7
       WHERE delivery_id = $8
       RETURNING *`,
      [
        delivery_partner,
        delivery_address,
        contact_number,
        delivery_status,
        estimated_time,
        delivery_fee,
        or_id,
        req.params.id,
      ],
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    handleDbError(err, res, next);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
//  DELETE /deliveries/:id
//  Access: Admin only  (requireAdmin)
//  Only cancelled or failed deliveries may be hard-deleted
// ═════════════════════════════════════════════════════════════════════════════
export const deleteDeliveryValidation = [
  v_deliveryId,

  param("id").custom((id, { req }) => {
    const curr = req.delivery?.delivery_status; // set by loadDelivery
    const deletable = ["cancelled", "failed"];
    if (curr && !deletable.includes(curr)) {
      throw new Error(
        `Cannot delete a delivery with status '${curr}'. ` +
          `Only cancelled or failed deliveries may be deleted.`,
      );
    }
    return true;
  }),

  validate,
];

export async function deleteDelivery(req, res, next) {
  try {
    const { rows } = await pool.query(
      'DELETE FROM "DELIVERY" WHERE delivery_id = $1 RETURNING delivery_id',
      [req.params.id],
    );

    if (!rows.length) {
      return res
        .status(404)
        .json({ success: false, message: "Delivery not found" });
    }

    res.json({
      success: true,
      message: `Delivery ${rows[0].delivery_id} deleted successfully`,
    });
  } catch (err) {
    next(err);
  }
}

// ─── Export loadDelivery for use in router ────────────────────────────────────
export { loadDelivery };

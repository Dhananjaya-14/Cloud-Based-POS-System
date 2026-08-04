import pool from "../../config/database.js";
import { emitSocketEvent, KITCHEN_SOCKET_ROOM } from "../../utils/socket.js";

const VALID_STATUSES = ["pending", "preparing", "ready", "completed", "cancelled"];

function convertRecipeQty(qty, recipeUnit, stockUnit) {
  if (!recipeUnit || !stockUnit) return qty;
  const rU = recipeUnit.toLowerCase();
  const sU = stockUnit.toLowerCase();
  if (rU === sU) return qty;

  const conversions = {
    kg: { g: 1000, mg: 1000000 },
    g: { kg: 0.001, mg: 1000 },
    mg: { kg: 0.000001, g: 0.001 },
    l: { ml: 1000 },
    ml: { l: 0.001 },
  };

  if (conversions[rU] && conversions[rU][sU]) {
    return qty * conversions[rU][sU];
  }
  return qty;
}

export const updateKitchenOrderStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ success: false, error: "Invalid kitchen status" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      `SELECT or_status FROM "ORDER" WHERE or_id = $1 FOR UPDATE`,
      [id]
    );
    if (orderRes.rows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ success: false, error: "Order not found" });
    }
    const currentStatus = orderRes.rows[0].or_status;

    const { rows } = await client.query(
      `UPDATE "ORDER" SET or_status = $1 WHERE or_id = $2 RETURNING *`,
      [status, id]
    );
    const updatedOrder = rows[0];

    // ── When Kitchen ACCEPTS order → deduct raw material ingredients (made_to_order only) ──
    if (status === "preparing" && currentStatus !== "preparing") {
      const orderItems = await client.query(
        `SELECT oi."Bpro_id", oi.pro_quantity, bp."pro_id", bp."B_id"
         FROM public."ORDER_ITEM" oi
         JOIN public."Branch_Product" bp ON bp."Bpro_id" = oi."Bpro_id"
         JOIN public."Product" p ON p.pro_id = bp.pro_id
         WHERE oi.order_id = $1
           AND p.product_type = 'made_to_order'`,
        [id]
      );
      for (const item of orderItems.rows) {
        const { pro_id, pro_quantity } = item;
        const recipes = await client.query(
          `SELECT r."rawmaterial_ID", r."quantity_req",
                  COALESCE(r."unit", rm."unit") AS recipe_unit,
                  rm."unit" AS stock_unit
           FROM public."RECIPE" r
           JOIN public."Raw_Material" rm ON rm."rm_id" = r."rawmaterial_ID"
           WHERE r."pro_id" = $1`,
          [pro_id]
        );
        for (const recipe of recipes.rows) {
          const rawQty = recipe.quantity_req * pro_quantity;
          const convertedQty = convertRecipeQty(rawQty, recipe.recipe_unit, recipe.stock_unit);
          await client.query(
            `UPDATE public."Raw_Material"
             SET stock_qty = GREATEST(0, stock_qty - $1)
             WHERE rm_id = $2`,
            [convertedQty, recipe.rawmaterial_ID]
          );
        }
      }
    }

    // ── When order is CANCELLED after kitchen accepted → restore raw material ingredients ──
    if (status === "cancelled" && currentStatus === "preparing") {
      const orderItems = await client.query(
        `SELECT oi."Bpro_id", oi.pro_quantity, bp."pro_id", bp."B_id"
         FROM public."ORDER_ITEM" oi
         JOIN public."Branch_Product" bp ON bp."Bpro_id" = oi."Bpro_id"
         JOIN public."Product" p ON p.pro_id = bp.pro_id
         WHERE oi.order_id = $1
           AND p.product_type = 'made_to_order'`,
        [id]
      );
      for (const item of orderItems.rows) {
        const { pro_id, pro_quantity } = item;
        const recipes = await client.query(
          `SELECT r."rawmaterial_ID", r."quantity_req",
                  COALESCE(r."unit", rm."unit") AS recipe_unit,
                  rm."unit" AS stock_unit
           FROM public."RECIPE" r
           JOIN public."Raw_Material" rm ON rm."rm_id" = r."rawmaterial_ID"
           WHERE r."pro_id" = $1`,
          [pro_id]
        );
        for (const recipe of recipes.rows) {
          const rawQty = recipe.quantity_req * pro_quantity;
          const convertedQty = convertRecipeQty(rawQty, recipe.recipe_unit, recipe.stock_unit);
          await client.query(
            `UPDATE public."Raw_Material"
             SET stock_qty = stock_qty + $1
             WHERE rm_id = $2`,
            [convertedQty, recipe.rawmaterial_ID]
          );
        }
      }
    }

    await client.query("COMMIT");
    client.release();

    emitSocketEvent(KITCHEN_SOCKET_ROOM, "order:updated", updatedOrder);
    emitSocketEvent(`branch-updates:${updatedOrder.b_id}`, "order:updated", updatedOrder);

    return res.json({ success: true, data: updatedOrder });
  } catch (err) {
    if (client) {
      await client.query("ROLLBACK");
      client.release();
    }
    return res.status(500).json({ success: false, error: err.message });
  }
};

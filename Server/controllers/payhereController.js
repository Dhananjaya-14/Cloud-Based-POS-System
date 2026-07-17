import crypto from "crypto";
import pool from "../config/database.js";
import { getIO, getCashierSocketRoom } from "../utils/socket.js";

const md5Upper = (str) =>
  crypto.createHash("md5").update(str).digest("hex").toUpperCase();

const PAYHERE_CHECKOUT_URL =
  process.env.PAYHERE_MODE?.trim() === "live"
    ? "https://www.payhere.lk/pay/checkout"
    : "https://sandbox.payhere.lk/pay/checkout";

// ─── In-memory token store (token → payment params, expires in 10 min) ────────
// For production you can move this to Redis or a DB table.
const pendingPayments = new Map();

const storeToken = (token, data) => {
  pendingPayments.set(token, { ...data, expiresAt: Date.now() + 10 * 60 * 1000 });
  // Auto-cleanup after 10 minutes
  setTimeout(() => pendingPayments.delete(token), 10 * 60 * 1000);
};

const getToken = (token) => {
  const entry = pendingPayments.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    pendingPayments.delete(token);
    return null;
  }
  return entry;
};

// ─── POST /api/payhere/initiate ───────────────────────────────────────────────
// Called by the frontend cashier when PayHere is selected.
// Builds all PayHere form params, stores them with a short-lived token,
// and returns a QR-friendly URL that auto-submits the form when visited.
export async function initiatePayHerePayment(req, res, next) {
  try {
    const { order_id, amount, order_description, cashier_uid } = req.body;

    if (!order_id || !amount || !cashier_uid) {
      return res.status(422).json({
        success: false,
        message: "order_id, amount and cashier_uid are required",
      });
    }

    const merchantId     = process.env.PAYHERE_MERCHANT_ID?.trim();
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET?.trim();
    const notifyBase     = process.env.PAYHERE_NOTIFY_BASE_URL?.trim();
    const clientUrl      = process.env.CLIENT_URL?.trim() || "http://localhost:5173";

    if (!merchantId || !merchantSecret || !notifyBase) {
      return res.status(500).json({
        success: false,
        message:
          "PayHere is not configured. Set PAYHERE_MERCHANT_ID, " +
          "PAYHERE_MERCHANT_SECRET and PAYHERE_NOTIFY_BASE_URL in .env",
      });
    }

    const formattedAmount = parseFloat(amount).toFixed(2);
    const currency        = "LKR";
    const hashedSecret = md5Upper(merchantSecret);
    const hash = md5Upper(
      `${merchantId}${order_id}${formattedAmount}${currency}${hashedSecret}`
    );

    // Build all PayHere form fields
    const payhereParams = {
      merchant_id: merchantId,
      return_url:  `${notifyBase}/api/payhere/success`,
      cancel_url:  `${notifyBase}/api/payhere/cancel`,
      notify_url:  `${notifyBase}/api/payhere/notify`,
      order_id:    String(order_id),
      items:       order_description || `Order #${order_id}`,
      currency,
      amount:      formattedAmount,
      hash,
      first_name:  "POS",
      last_name:   "Customer",
      email:       "pos@restaurant.com",
      phone:       "0000000000",
      address:     "POS Checkout",
      city:        "Colombo",
      country:     "Sri Lanka",
      custom_1:    String(cashier_uid),
      custom_2:    String(order_id),
    };

    // Create a short-lived token so the QR page can retrieve these params
    const token = crypto.randomUUID();
    storeToken(token, payhereParams);

    // The QR will encode this URL — when scanned, it auto-submits the form to PayHere
    const payment_url = `${notifyBase}/api/payhere/pay/${token}`;

    return res.json({ success: true, payment_url, order_id });
  } catch (err) {
    next(err);
  }
}

// ------------- GET /api/payhere/pay/:token-----------------------
export async function getPayherePage(req, res) {
  const { token } = req.params;
  const data = getToken(token);

  if (!data) {
    return res.status(410).send(`
      <!DOCTYPE html>
      <html>
        <head><meta charset="utf-8"><title>Payment Link Expired</title>
          <style>
            body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc}
            .box{text-align:center;padding:2rem;border-radius:1rem;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.08)}
            h2{color:#ef4444;margin-bottom:.5rem}p{color:#64748b}
          </style>
        </head>
        <body>
          <div class="box">
            <h2>⏰ Payment Link Expired</h2>
            <p>This QR code has expired or already been used.<br>Please ask the cashier to generate a new one.</p>
          </div>
        </body>
      </html>
    `);
  }

  // Build hidden form fields from stored params
  const fields = Object.entries(data)
    .filter(([k]) => k !== "expiresAt")
    .map(
      ([key, value]) =>
        `<input type="hidden" name="${key}" value="${String(value).replace(/"/g, "&quot;")}">`
    )
    .join("\n        ");

  return res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Redirecting to PayHere...</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; background: #f0f4ff;
          }
          .card {
            text-align: center; padding: 2.5rem 2rem;
            background: #fff; border-radius: 1.5rem;
            box-shadow: 0 8px 32px rgba(14,109,207,0.12);
            max-width: 340px; width: 90%;
          }
          .logo { font-size: 2rem; font-weight: 900; color: #0e2c5e; margin-bottom: 1rem; }
          .logo span { color: #f59e0b; }
          .spinner {
            width: 48px; height: 48px; border: 4px solid #e0edff;
            border-top-color: #0E6DCF; border-radius: 50%;
            animation: spin .9s linear infinite; margin: 1.5rem auto;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          p { color: #64748b; font-size: .95rem; line-height: 1.5; }
          .amount { font-size: 1.5rem; font-weight: 700; color: #0E6DCF; margin: .75rem 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">pay<span>here</span></div>
          <div class="amount">LKR ${data.amount}</div>
          <div class="spinner"></div>
          <p>Redirecting you to the secure<br>PayHere checkout page…</p>

          <form id="ph" action="${PAYHERE_CHECKOUT_URL}" method="POST" style="display:none">
            ${fields}
          </form>
        </div>
        <script>
          setTimeout(function() {
            document.getElementById('ph').submit();
          }, 800);
        </script>
      </body>
    </html>
  `);
}

// ---------- POST /api/payhere/notify -----------------
// Called directly by PayHere servers after a customer completes payment.
export async function payhereNotify(req, res) {
  try {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
      custom_1, // cashier_uid
    } = req.body;

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET?.trim();

    // ------ Verify the signature ---------
    const localHash = md5Upper(
      `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${md5Upper(merchantSecret)}`
    );

    if (localHash !== md5sig) {
      console.warn("[PayHere] Notify signature mismatch — possible spoofing");
      return res.status(200).send("OK");
    }

    // ------ Status code 2 = successful payment ------
    if (status_code === "2") {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        await client.query(
          `UPDATE "ORDER" SET or_status = 'pending' WHERE or_id = $1`,
          [order_id]
        );

        const today = new Date().toISOString().split("T")[0];
        await client.query(
          `INSERT INTO "Payment" (pay_method, pay_status, pay_date, pay_amount, or_id)
           VALUES ($1, $2, $3, $4, $5)`,
          ["mobile_pay", "paid", today, parseFloat(payhere_amount), order_id]
        );

        await client.query("COMMIT");

        // ------ Notify the cashier screen via Socket.IO ------
        try {
          const io = getIO();
          const cashierUid = custom_1;
          if (cashierUid) {
            const room = getCashierSocketRoom(cashierUid);
            io.to(room).emit("payhere:payment_confirmed", {
              order_id,
              amount: payhere_amount,
              currency: payhere_currency,
            });
            console.log(`[PayHere] ✓ Payment confirmed — emitted to room: ${room}`);
          }
        } catch (socketErr) {
          console.error("[PayHere] Socket emit error:", socketErr.message);
        }
      } catch (dbErr) {
        await client.query("ROLLBACK");
        console.error("[PayHere] DB error in notify:", dbErr.message);
      } finally {
        client.release();
      }
    } else {
      console.log(
        `[PayHere] Notify status_code=${status_code} for order ${order_id}`
      );
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("[PayHere] Unexpected error in notify:", err.message);
    return res.status(200).send("OK");
  }
}

// ---------- GET /api/payhere/success -----------------
export function payhereSuccess(req, res) {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Payment Successful</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f0fdf4;margin:0;text-align:center;} .box{background:#fff;padding:2rem;border-radius:1rem;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);} h1{color:#16a34a;margin-bottom:0.5rem;} p{color:#475569;}</style></head>
      <body><div class="box">
        <h1>✅ Payment Successful</h1>
        <p>Your payment was processed successfully.</p>
      </div></body>
    </html>
  `);
}

// ---------- GET /api/payhere/cancel -----------------
export function payhereCancel(req, res) {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Payment Cancelled</title>
      <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#fff1f2;margin:0;text-align:center;} .box{background:#fff;padding:2rem;border-radius:1rem;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);} h1{color:#e11d48;margin-bottom:0.5rem;} p{color:#475569;}</style></head>
      <body><div class="box">
        <h1>❌ Payment Cancelled</h1>
        <p>You have cancelled the payment.</p>
        <p>Please ask the cashier if you wish to try again.</p>
      </div></body>
    </html>
  `);
}

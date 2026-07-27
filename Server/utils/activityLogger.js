import pool from "../config/database.js";

const API_PREFIX = "/api/";

const MODULE_MAP = {
  auth: "AUTH",
  users: "USER",
  roles: "ROLE",
  companies: "COMPANY",
  branches: "BRANCH",
  customers: "CUSTOMER",
  tables: "TABLE",
  "table-assignments": "TABLE_ASSIGNMENT",
  reservations: "RESERVATION",
  waiter: "WAITER",
  categories: "CATEGORY",
  products: "PRODUCT",
  branch_products: "BRANCH_PRODUCT",
  recipes: "RECIPE",
  "raw-materials": "RAW_MATERIAL",
  waste: "WASTE",
  suppliers: "SUPPLIER",
  "purchase-orders": "PURCHASE_ORDER",
  "purchase-items": "PURCHASE_ITEM",
  "supplier-payments": "SUPPLIER_PAYMENT",
  orders: "ORDER",
  "order-items": "ORDER_ITEM",
  payments: "PAYMENT",
  discounts: "DISCOUNT",
  deliveries: "DELIVERY",
  terminals: "TERMINAL",
  dashboard: "DASHBOARD",
  stats: "STATS",
  reports: "REPORT",
  payhere: "PAYHERE",
};

function parseJsonBody(value) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function toPositiveInteger(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

const RECORD_ID_KEYS = [
  "id",
  "record_id",
  "u_id",
  "com_id",
  "b_id",
  "B_id",
  "role_id",
  "or_id",
  "order_id",
  "orderItemId",
  "payment_id",
  "discount_id",
  "customer_id",
  "supplier_id",
  "product_id",
  "table_id",
  "terminal_id",
  "reservation_id",
  "delivery_id",
  "purchase_order_id",
  "purchase_item_id",
  "branch_product_id",
  "raw_material_id",
];

function findRecordIdInValue(value, depth = 0) {
  if (value === null || value === undefined || depth > 3) {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findRecordIdInValue(item, depth + 1);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }

  if (typeof value !== "object") {
    return null;
  }

  for (const key of RECORD_ID_KEYS) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const parsed = toPositiveInteger(value[key]);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (!/^(?:[a-z]+_)?id$/i.test(key) && !/_id$/i.test(key)) {
      continue;
    }

    const parsed = toPositiveInteger(nestedValue);
    if (parsed !== null) {
      return parsed;
    }
  }

  for (const nestedValue of Object.values(value)) {
    const found = findRecordIdInValue(nestedValue, depth + 1);
    if (found !== null) {
      return found;
    }
  }

  return null;
}

function extractLastPathSegment(urlPath) {
  const withoutQuery = String(urlPath || "").split("?")[0];
  const segments = withoutQuery.split("/").filter(Boolean);
  return segments[segments.length - 1] || "";
}

function getModuleName(req) {
  const path = String(req.originalUrl || "").split("?")[0];
  if (!path.startsWith(API_PREFIX)) {
    return null;
  }

  const apiPath = path.slice(API_PREFIX.length);
  const rootSegment = apiPath.split("/").filter(Boolean)[0] || "";
  if (!rootSegment) {
    return null;
  }

  return MODULE_MAP[rootSegment] || rootSegment.replace(/[-\s]+/g, "_").toUpperCase();
}

function getActionType(req, moduleName, statusCode) {
  const method = String(req.method || "").toUpperCase();
  const path = String(req.originalUrl || "").split("?")[0];

  if (moduleName === "AUTH" && path === "/api/auth/login") {
    return statusCode >= 400 ? "LOGIN_FAILED" : "LOGIN";
  }

  switch (method) {
    case "GET":
      return "READ";
    case "POST":
      return "CREATE";
    case "PUT":
    case "PATCH":
      return "UPDATE";
    case "DELETE":
      return "DELETE";
    default:
      return method || "ACTION";
  }
}

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || null;
}

function getPrimaryUserContext(req, responseBody) {
  const responseUser = responseBody && typeof responseBody === "object" ? responseBody.user : null;
  const source = req.user || responseUser || responseBody || {};

  return {
    u_id: toPositiveInteger(source.u_id ?? source.uId ?? null),
    com_id: toPositiveInteger(source.com_id ?? source.comId ?? null),
    b_id: toPositiveInteger(source.b_id ?? source.B_id ?? source.bId ?? null),
  };
}

function getRouteRecordId(req, responseBody) {
  if (String(req.originalUrl || "").startsWith("/api/auth/login")) {
    return null;
  }

  const requestBody = req.body && typeof req.body === "object" ? req.body : {};
  const responseObject = responseBody && typeof responseBody === "object" && !Array.isArray(responseBody)
    ? responseBody
    : null;

  const candidateSources = [req.params || {}, requestBody, responseObject || {}];

  for (const source of candidateSources) {
    const found = findRecordIdInValue(source);
    if (found !== null) {
      return found;
    }
  }

  const lastSegment = extractLastPathSegment(req.originalUrl);
  return toPositiveInteger(lastSegment);
}

function buildDescription({ actionType, moduleName, recordId, req, responseBody, statusCode }) {
  if (moduleName === "AUTH" && String(req.originalUrl || "").startsWith("/api/auth/login")) {
    if (statusCode >= 400) {
      const email = req.body?.u_email || req.body?.email || req.body?.uEmail || "unknown user";
      return `Failed login attempt for ${email}`;
    }

    const loggedInUser = responseBody && typeof responseBody === "object" ? responseBody.user : null;
    const email = loggedInUser?.u_email || req.body?.u_email || "unknown user";
    return `Successful login for ${email}`;
  }

  const actionLabel = actionType.toLowerCase();
  const moduleLabel = moduleName.toLowerCase();

  if (recordId !== null) {
    return `${actionLabel} ${moduleLabel} record ${recordId}`;
  }

  return `${actionLabel} ${moduleLabel}`;
}

export function activityLogger(req, res, next) {
  if (!String(req.originalUrl || "").startsWith(API_PREFIX)) {
    return next();
  }

  const method = String(req.method || "").toUpperCase();
  if (method === "OPTIONS" || method === "HEAD") {
    return next();
  }

  let responseBody;
  const originalSend = res.send.bind(res);

  res.send = function sendWithCapture(body) {
    responseBody = parseJsonBody(body);
    return originalSend(body);
  };

  res.on("finish", () => {
    const moduleName = getModuleName(req);
    if (!moduleName) {
      return;
    }

    const actionType = getActionType(req, moduleName, res.statusCode);
    const userContext = getPrimaryUserContext(req, responseBody);
    const recordId = getRouteRecordId(req, responseBody);
    const description = buildDescription({
      actionType,
      moduleName,
      recordId,
      req,
      responseBody,
      statusCode: res.statusCode,
    });

    const ipAddress = getClientIp(req);

    void pool.query(
      `INSERT INTO public.activity_log
        (u_id, com_id, b_id, action_type, module_name, record_id, description, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        userContext.u_id,
        userContext.com_id,
        userContext.b_id,
        actionType,
        moduleName,
        recordId,
        description,
        ipAddress,
      ],
    ).catch((error) => {
      console.error("[ACTIVITY_LOG] Failed to write activity row:", error.message);
    });
  });

  next();
}
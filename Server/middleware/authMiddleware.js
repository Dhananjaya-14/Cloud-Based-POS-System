import jwt from "jsonwebtoken";
import pool from "../config/database.js";

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === "string") {
    if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
    return authHeader;
  }

  // Optional fallback header style
  const headerToken = req.headers["x-access-token"];
  if (typeof headerToken === "string" && headerToken.length > 0) return headerToken;

  // Optional fallback (not recommended for production, but handy for testing)
  if (typeof req.query?.token === "string" && req.query.token.length > 0) {
    return req.query.token;
  }

  return null;
}

export function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ message: "JWT_SECRET is not configured" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach decoded payload for downstream usage if needed.
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export async function requireAdminOnly(req, res, next) {
  try {
    const roleId = req.user?.role_id;
    if (!roleId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const result = await pool.query(
      'SELECT role_name FROM "Role" WHERE role_id = $1',
      [roleId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    const roleName = String(result.rows[0].role_name || "").trim().toLowerCase();
    if (roleName !== "admin") {
      return res.status(403).json({ message: "Only admin can access products CRUD" });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

export async function requireAdminOrBranchAdmin(req, res, next) {
  try {
    const roleId = req.user?.role_id;
    if (!roleId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const result = await pool.query(
      'SELECT role_name FROM "Role" WHERE role_id = $1',
      [roleId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: "Access denied" });
    }

    const roleName = String(result.rows[0].role_name || "").trim().toLowerCase();
    if (roleName !== "admin" && roleName !== "branch admin") {
      return res.status(403).json({ message: "Only admin or branch admin can access branch products CRUD" });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}


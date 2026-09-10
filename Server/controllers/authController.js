import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../config/database.js";
import { ROLES } from "../middleware/authMiddleware.js";

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    //email ekai pw ekai request eken
    const { u_email, u_pw } = req.body;

    //check missed da kiyala
    if (!u_email || !u_pw) {
      res.status(400);
      throw new Error("u_email and u_pw are required");
    }
    //search user from db
    const result = await pool.query(
      'SELECT u_id, u_fname, u_lname, u_email, u_pw, u_connumber, role_id, "B_id", "com_id" FROM "User" WHERE u_email = $1',
      [u_email]
    );

    if (result.rows.length === 0) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    const user = result.rows[0];

    // Primary path: bcrypt hashed password
    //pw comparison ek
    let passwordOk = false;
    try {
      passwordOk = await bcrypt.compare(u_pw, user.u_pw);
    } catch {
      passwordOk = false;
    }


    // (and auto-migrate to bcrypt on successful login)
    if (!passwordOk && user.u_pw === u_pw) {
      passwordOk = true;

      //automaticly bycript kranawa
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(u_pw, salt);
      await pool.query('UPDATE "User" SET u_pw = $1 WHERE u_id = $2', [hashed, user.u_id]);
    }

    if (!passwordOk) {
      res.status(401);
      throw new Error("Invalid email or password");
    }

    if (!process.env.JWT_SECRET) {
      res.status(500);
      throw new Error("JWT_SECRET is not configured");
    }
    let b_id = user.B_id ?? null;
    let com_id = user.com_id ?? null;
    let features = null;
    let companyLanguage = 'en';

    if (user.role_id === ROLES.SUPER_ADMIN) {
      b_id = null;
      com_id = null;
    } else if (!com_id && b_id) {
      const bRes = await pool.query('SELECT com_id FROM "Branch" WHERE "B_id" = $1', [b_id]);
      com_id = bRes.rows[0]?.com_id ?? null;
    }

    // Fetch package features if company is linked to a package
    if (com_id) {
      const featRes = await pool.query(`
        SELECT p.features, c.language_code FROM "Company" c
        JOIN "Package" p ON c.package_id = p.package_id
        WHERE c.com_id = $1
      `, [com_id]);
      features = featRes.rows[0]?.features ?? null;
      companyLanguage = featRes.rows[0]?.language_code ?? 'en';
    }

    //token creation
    const token = signToken({
      u_id: user.u_id,
      role_id: user.role_id,
      language_code: user.language_code || companyLanguage,
      u_email: user.u_email,
      ...(b_id != null ? { b_id } : {}),
      ...(com_id != null ? { com_id } : {}),
    });

    const userPayload = {
      u_id: user.u_id,
      u_fname: user.u_fname,
      u_lname: user.u_lname,
      u_email: user.u_email,
      u_connumber: user.u_connumber,
      role_id: user.role_id,
      language_code: user.language_code || companyLanguage,
      ...(b_id != null ? { b_id } : {}),
      ...(com_id != null ? { com_id } : {}),
      ...(features != null ? { features } : {}),
    };

    //frntend res
    res.json({
      token,
      user: userPayload,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password
export async function forgotPassword(req, res, next) {
  try {
    const u_email = String(req.body?.u_email || "").trim().toLowerCase();
    const genericResponse = {
      message: "If an account exists for that email, a password reset link has been sent.",
    };

    if (!u_email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const result = await pool.query(
      'SELECT u_id, u_email FROM "User" WHERE LOWER(u_email) = $1',
      [u_email]
    );

    if (result.rows.length === 0) {
      return res.json(genericResponse);
    }

    if (!process.env.JWT_SECRET) {
      res.status(500);
      throw new Error("JWT_SECRET is not configured");
    }

    const resetToken = jwt.sign(
      { purpose: "password-reset", u_id: result.rows[0].u_id, u_email: result.rows[0].u_email },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // A mail provider can consume this token later. Until one is configured,
    // expose a testable link only outside production.
    if (process.env.NODE_ENV !== "production") {
      return res.json({
        ...genericResponse,
        resetUrl: `${process.env.CLIENT_URL || "http://localhost:5173"}/forgot-password?token=${encodeURIComponent(resetToken)}`,
      });
    }

    return res.json(genericResponse);
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body || {};
    if (!token || typeof password !== "string" || password.length < 8) {
      res.status(400);
      throw new Error("A reset token and a password of at least 8 characters are required");
    }

    if (!process.env.JWT_SECRET) {
      res.status(500);
      throw new Error("JWT_SECRET is not configured");
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== "password-reset" || !payload.u_id) {
      res.status(400);
      throw new Error("Invalid password reset token");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'UPDATE "User" SET u_pw = $1 WHERE u_id = $2 RETURNING u_id',
      [hashedPassword, payload.u_id]
    );

    if (result.rows.length === 0) {
      res.status(400);
      throw new Error("Invalid password reset token");
    }

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      res.status(400);
      err = new Error("This password reset link is invalid or has expired");
    }
    next(err);
  }
}




import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import pool from "../config/database.js";

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
      'SELECT u_id, u_fname, u_lname, u_email, u_pw, u_connumber, role_id FROM "User" WHERE u_email = $1',
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
    //token creation
    const token = signToken({
      u_id: user.u_id,
      role_id: user.role_id,
      u_email: user.u_email,
    });
    
    //frntend res
    res.json({
      token,
      user: {
        u_id: user.u_id,
        u_fname: user.u_fname,
        u_lname: user.u_lname,
        u_email: user.u_email,
        u_connumber: user.u_connumber,
        role_id: user.role_id,
      },
    });
  } catch (err) {
    next(err);
  }
}


import jwt from "jsonwebtoken";

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === "string") {
    if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
    return authHeader;
  }

  const headerToken = req.headers["x-access-token"];
  if (typeof headerToken === "string" && headerToken.length > 0)
    return headerToken;

  if (typeof req.query?.token === "string" && req.query.token.length > 0)
    return req.query.token;

  return null;
}

export function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      message: "Please log in to continue.",
    });
  }

  if (!process.env.JWT_SECRET) {
    // Log internally, never expose config details to the client
    console.error("[AUTH] JWT_SECRET is not set in environment variables");
    return res.status(500).json({
      message: "Something went wrong on our end. Please try again later.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    const isExpired = err?.name === "TokenExpiredError";
    return res.status(401).json({
      message: isExpired
        ? "Your session has expired. Please log in again."
        : "We couldn't verify your identity. Please log in again.",
    });
  }
}

export const ROLES = {
  SUPER_ADMIN: 6,
};

export function requireSuperAdmin(req, res, next) {
  const roleId = req.user?.role_id;

  if (roleId === undefined || roleId === null) {
    return res.status(403).json({
      message:
        "Your account doesn't have a role assigned yet. Please contact your administrator.",
    });
  }

  if (roleId !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      message:
        "You don't have permission to perform this action. Please contact your Super Admin.",
    });
  }

  return next();
}

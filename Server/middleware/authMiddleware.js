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
    return res.status(401).json({ message: "Please log in to continue." });
  }

  if (!process.env.JWT_SECRET) {
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
  ADMIN: 2,
  BRANCH_ADMIN: 1,
  CASHIER: 3,
  WAITER: 8,
};

function requireRole(allowedRoles, label) {
  return (req, res, next) => {
    const roleId = req.user?.role_id;

    if (roleId === undefined || roleId === null) {
      return res.status(403).json({
        message:
          "Your account doesn't have a role assigned yet. Please contact your administrator.",
      });
    }

    if (!allowedRoles.includes(roleId)) {
      return res.status(403).json({
        message: `You don't have permission to perform this action. ${label} access is required.`,
      });
    }

    return next();
  };
}

// Super Admin only
export const requireSuperAdmin = requireRole(
  [ROLES.SUPER_ADMIN],
  "Super Admin",
);

// Admin only
export const requireAdmin = requireRole([ROLES.ADMIN], "Admin");

// Branch Admin OR Admin
export const requireBranchAdminOrAdmin = requireRole(
  [ROLES.BRANCH_ADMIN, ROLES.ADMIN],
  "Branch Admin or Admin",
);

// Cashier OR Branch Admin OR Admin
export const requireCashierOrAbove = requireRole(
  [ROLES.CASHIER, ROLES.BRANCH_ADMIN, ROLES.ADMIN],
  "Cashier, Branch Admin, or Admin",
);

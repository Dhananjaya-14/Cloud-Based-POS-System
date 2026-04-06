import jwt from "jsonwebtoken";

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === "string") {
    if (authHeader.startsWith("Bearer ")) return authHeader.slice(7);
    return authHeader;
  }

  // Optional fallback header style
  const headerToken = req.headers["x-access-token"];
  if (typeof headerToken === "string" && headerToken.length > 0)
    return headerToken;

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

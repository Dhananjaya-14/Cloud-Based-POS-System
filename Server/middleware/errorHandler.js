// middleware/errorHandler.js

// 404 Not Found middleware
export function notFound(req, res, next) {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
}

// General error handling middleware
export function errorHandler(err, req, res, next) {
  const statusCode =
    res.statusCode && res.statusCode !== 200
      ? res.statusCode
      : err.status || 500;

  res.status(statusCode).json({
    message: err.message || "Server error",
  });
}

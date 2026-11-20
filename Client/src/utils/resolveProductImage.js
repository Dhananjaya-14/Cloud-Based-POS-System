/**
 * resolveProductImage
 *
 * Converts a raw `pro_image` value from the API into a fully-qualified URL
 * that can be used directly in an <img src="..."> tag.
 *
 * Rules:
 *  - null / undefined / empty string → returns ""  (caller should show fallback)
 *  - "N/A" or "n/a"                 → returns ""
 *  - Already a data-URI (base64)     → returned as-is
 *  - Already an absolute URL         → returned as-is
 *  - Anything else                   → treated as a filename served by the
 *                                       backend at  <SERVER_ORIGIN>/images/<filename>
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Strip the "/api" suffix to get just the server origin, e.g. "http://localhost:5000"
const IMAGE_BASE = API_BASE.replace(/\/api\/?$/i, "");

export function resolveProductImage(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.toLowerCase() === "n/a") return "";
  if (/^data:/i.test(trimmed)) return trimmed;              // base64 data-URI
  if (/^(https?:)?\/\//i.test(trimmed)) return trimmed;    // absolute URL
  return `${IMAGE_BASE}/images/${trimmed.replace(/^\/+/, "")}`;
}

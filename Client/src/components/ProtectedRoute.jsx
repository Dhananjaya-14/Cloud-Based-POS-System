import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_DASHBOARDS = {
  1: "/branch-admin/dashboard", // Branch Admin
  2: "/admin/dashboard",        // Company Admin
};

export default function ProtectedRoute({ children, allowedRoles = [], requiredFeature = null }) {
  const { user, features } = useAuth();

  // Not logged in → go to login
  if (!user) return <Navigate to="/login" replace />;

  // Wrong role → go to home
  if (allowedRoles.length && !allowedRoles.map(Number).includes(Number(user.role_id))) {
    return <Navigate to="/" replace />;
  }

  // Feature locked by package → redirect to the user's own dashboard
  if (requiredFeature && Number(user.role_id) !== 6) {
    if (!features || features[requiredFeature] !== true) {
      const fallback = ROLE_DASHBOARDS[Number(user.role_id)] ?? "/";
      return <Navigate to={fallback} replace />;
    }
  }

  return children;
}

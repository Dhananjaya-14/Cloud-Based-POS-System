import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";


export default function ProtectedRoute({ children, allowedRoles = [], requiredFeature = null }) {
  const { user, features } = useAuth();

  // Not logged in → go to login
  if (!user) return <Navigate to="/login" replace />;

  // Wrong role → go to home
  if (allowedRoles.length && !allowedRoles.map(Number).includes(Number(user.role_id))) {
    return <Navigate to="/" replace />;
  }

  // Feature locked by package → go to home
  if (requiredFeature && Number(user.role_id) !== 6) {
    if (!features || features[requiredFeature] !== true) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
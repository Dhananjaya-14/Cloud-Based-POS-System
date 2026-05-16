import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as apiLogin, setAuthToken, getCurrentUser } from "../services/api";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getCurrentUser());
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  useEffect(() => {
    if (token) setAuthToken(token);
  }, [token]);

  const login = async (credentials) => {
    const data = await apiLogin(credentials); // expects { token, user }
    if (!data?.token) throw new Error("No token returned");
    setToken(data.token);
    setAuthToken(data.token);
    setUser(data.user);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("token", data.token);
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

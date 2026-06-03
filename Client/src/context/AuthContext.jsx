import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  login as apiLogin,
  setAuthToken,
  getCurrentUser,
} from "../services/api";
import { connectSocket, disconnectSocket } from "../services/socket";

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(() => getCurrentUser());
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // Set auth token whenever token changes
  useEffect(() => {
    if (token) {
      setAuthToken(token);
    } else {
      setAuthToken(null);
    }
  }, [token]);

  // Handle WebSocket connection
  useEffect(() => {
    if (token) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [token]);

  // Login function
  const login = async (credentials) => {
    try {
      const data = await apiLogin(credentials); // expects { token, user }

      if (!data?.token) {
        throw new Error("No token returned");
      }

      setToken(data.token);
      setUser(data.user);

      setAuthToken(data.token);

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      return data;
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  // Logout function
  const logout = () => {
    setToken(null);
    setUser(null);

    setAuthToken(null);

    disconnectSocket();

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
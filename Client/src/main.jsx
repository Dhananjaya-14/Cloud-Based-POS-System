import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthProvider";
import './index.css';
import i18n from './i18n';

const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
if (storedUser && storedUser.language_code) {
  i18n.changeLanguage(storedUser.language_code);
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);

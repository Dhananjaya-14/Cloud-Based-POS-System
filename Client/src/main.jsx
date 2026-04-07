import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import './index.css';

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);




















// import React from "react";
// import { createRoot } from "react-dom/client";
// import { BrowserRouter } from "react-router-dom";
// import App from "./App";
// import { AuthProvider } from "./context/AuthContext";

// createRoot(document.getElementById("root")).render(
//   <BrowserRouter>
//     <AuthProvider>
//       <App />
//     </AuthProvider>
//   </BrowserRouter>
// );












// // import React from "react";
// // import ReactDOM from "react-dom/client";
// // import App from "./App.jsx";
// // import "./index.css";

// // ReactDOM.createRoot(document.getElementById("root")).render(
// //   <React.StrictMode>
// //     <App />
// //   </React.StrictMode>
// // );

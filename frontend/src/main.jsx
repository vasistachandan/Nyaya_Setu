import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import "./styles.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#1a1d27",
            color: "#e7eaf3",
            border: "1px solid #2a2d3e",
            borderRadius: "12px",
            padding: "12px 14px",
            fontSize: "13px",
          },
          success: { iconTheme: { primary: "#22c55e", secondary: "#0f1117" } },
          error: { iconTheme: { primary: "#ef4444", secondary: "#0f1117" } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);

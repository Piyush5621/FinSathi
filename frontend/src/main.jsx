import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { Toaster } from "react-hot-toast";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    {/* 🌈 Global Toast System */}
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "linear-gradient(to right, #4f46e5, #10b981)",
          color: "#fff",
          borderRadius: "10px",
          padding: "12px 18px",
          fontWeight: "500",
          fontSize: "15px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.25)",
        },
        success: {
          iconTheme: {
            primary: "#10b981",
            secondary: "#fff",
          },
        },
        error: {
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fff",
          },
        },
      }}
    />
  </React.StrictMode>
);

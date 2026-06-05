import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { router } from "./router";
import "./styles/global.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/restocker.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
);

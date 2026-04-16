import { createBrowserRouter } from "react-router-dom";
import { MainLayout } from "../components/MainLayout";
import { CartPage } from "../pages/CartPage";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { SearchPage } from "../pages/SearchPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "home",
        element: <HomePage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "search",
        element: <SearchPage />,
      },
      {
        path: "cart",
        element: <CartPage />,
      },
    ],
  },
]);

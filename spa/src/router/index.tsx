import { createBrowserRouter } from "react-router-dom";
import { App } from "../App";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { CategoryPage } from "../pages/CategoryPage";
import { ProductDetailPage } from "../pages/ProductDetailPage";
import { SearchPage } from "../pages/SearchPage";
import { AccountPage } from "../pages/AccountPage";
import {SubscriptionPage} from "../pages/SubscriptionPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
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
        path: "account",
        element: <AccountPage />,
      },
      {
        path: "categories/:categorySlug",
        element: <CategoryPage />,
      },
      {
        path: "products/:itemId",
        element: <ProductDetailPage />,
      },
      {
        path: "subscription",
        element: <SubscriptionPage />,
      }
    ],
  },
]);

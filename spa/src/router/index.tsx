import { createBrowserRouter } from "react-router-dom";
import { App } from "../App";
import { HomePage } from "../pages/HomePage";
import { LoginPage } from "../pages/LoginPage";
import { CategoryPage } from "../pages/CategoryPage";
import { ProductDetailPage } from "../pages/ProductDetailPage";
import { ProductsPage } from "../pages/ProductsPage";
import { AccountPage } from "../pages/AccountPage";
import {SubscriptionPage} from "../pages/SubscriptionPage";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { RestockerPage } from "../pages/restocker-view/RestockerPage";
import { OrderPage} from "../pages/restocker-view/OrderPage";
import { DeliveryPage } from "../pages/restocker-view/DeliveryPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [

      // Allgemeine Pages
      {
        index: true,
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
      {
        path: "login",
        element: <LoginPage />,
      },

      {
        path: "account",
        element: (
          <ProtectedRoute>
            <AccountPage />
          </ProtectedRoute>
        ),
      },

      // Customer spezifische Pages:
      {
        path: "products",
        element: (
          <ProtectedRoute>
            <ProductsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "categories/:categorySlug",
        element: (
            <ProtectedRoute>
              <CategoryPage/>
            </ProtectedRoute>
        ),
      },
      {
        path: "products/:productId",
        element: (
          <ProtectedRoute>
            <ProductDetailPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "subscription",
        element: (
          <ProtectedRoute>
            <SubscriptionPage />
          </ProtectedRoute>
        ),
      },

      // Restocker spezifische Pages:
      {
        path: "restocker",
        element: (
            <ProtectedRoute>
              <RestockerPage />
            </ProtectedRoute>
        ),
      },
      {
        path: "restocker-orders",
        element: (
            <ProtectedRoute>
              <OrderPage />
            </ProtectedRoute>
        ),
      },
      {
        path: "restocker-deliveries",
        element: (
            <ProtectedRoute>
              <DeliveryPage />
            </ProtectedRoute>
        ),
      }
    ],
  },
]);

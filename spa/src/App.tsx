import { Outlet } from "react-router-dom";
import { AppShell } from "./components/AppShell";

export function App() {
  return (
    <AppShell>
      {({
        isLoggedIn,
        onLogin,
        onAddToSubscription,
        onOpenSubscriptionOverview,
        onEditSubscriptionItem,
        subscriptionItems,
      }) => (
        <Outlet
          context={{
            isLoggedIn,
            onLogin,
            onAddToSubscription,
            onOpenSubscriptionOverview,
            onEditSubscriptionItem,
            subscriptionItems,
          }}
        />
      )}
    </AppShell>
  );
}

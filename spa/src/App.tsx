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
        onLogout,
        theme,
        onToggleTheme,
        onSetTheme,
      }) => (
        <Outlet
          context={{
            isLoggedIn,
            onLogin,
            onAddToSubscription,
            onOpenSubscriptionOverview,
            onEditSubscriptionItem,
            subscriptionItems,
            onLogout,
            theme,
            onToggleTheme,
            onSetTheme,
          }}
        />
      )}
    </AppShell>
  );
}

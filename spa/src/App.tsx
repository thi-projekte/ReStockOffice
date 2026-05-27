import { Outlet } from "react-router-dom";
import { AppShell } from "./components/AppShell";

export function App() {
  return (
    <AppShell>
      {({
        isLoggedIn,
        onAddToSubscription,
        onOpenSubscriptionOverview,
        onEditSubscriptionItem,
        subscriptionItems,
        canModifySubscription,
        subscriptionProfileStatus,
        onSubscriptionProfileUpdated,
        onLogout,
        theme,
        onToggleTheme,
        onSetTheme,
      }) => (
        <Outlet
          context={{
            isLoggedIn,
            onAddToSubscription,
            onOpenSubscriptionOverview,
            onEditSubscriptionItem,
            subscriptionItems,
            canModifySubscription,
            subscriptionProfileStatus,
            onSubscriptionProfileUpdated,
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

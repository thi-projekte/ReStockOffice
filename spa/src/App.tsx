import type { ReactElement } from "react";
import { Outlet } from "react-router-dom";
import { AppShell } from "./components/AppShell";

export function App(): ReactElement {
  return (
    <AppShell>
      {({
        isLoggedIn,
        onAddToSubscription,
        onOpenSubscriptionOverview,
        onEditSubscriptionItem,
        onRemoveSubscriptionItem,
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
            onRemoveSubscriptionItem,
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

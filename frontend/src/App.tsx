import { Outlet } from "react-router-dom";
import { AppShell } from "./components/AppShell";

export function App() {
  return (
      <AppShell>
        {({ isLoggedIn, onLogin }) => (
            <Outlet context={{ isLoggedIn, onLogin }} />
        )}
      </AppShell>
  );
}
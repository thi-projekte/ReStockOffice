import {useAuth} from "../auth/AuthProvider";
import {Navigate} from "react-router-dom";

export function IndexPage() {
  const {isInitializing, hasRole} = useAuth();

  if (isInitializing) {
    return null;
  }

  if (hasRole("Restocker")) {
    return <Navigate to="/restocker" replace/>;
  }

  return <Navigate to="/home" replace/>;
}
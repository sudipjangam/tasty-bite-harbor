
import { Routes as Switch, Route, Navigate } from "react-router-dom";
import { useAuthState } from "@/hooks/useAuthState";
import { AppRoutes } from "./AppRoutes";
import AuthLoader from "./AuthLoader";
import Auth from "@/pages/Auth";

/**
 * Main routing component that handles authentication-based routing
 */
const Routes = () => {
  const { user, loading } = useAuthState();
  
  console.log("Routes: Loading:", loading, "User:", user ? "authenticated" : "not authenticated");
  
  // Show loading spinner while checking auth
  if (loading) {
    console.log("Routes: Still loading, showing AuthLoader");
    return <AuthLoader />;
  }

  // If no user, show auth page for any route
  if (!user) {
    console.log("Routes: No user, redirecting to auth");
    return (
      <Switch>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Switch>
    );
  }

  // User is authenticated, show app routes
  console.log("Routes: User authenticated, showing app routes");
  return (
    <Switch>
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="*" element={<AppRoutes />} />
    </Switch>
  );
};

export default Routes;

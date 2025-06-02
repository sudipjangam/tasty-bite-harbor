
import { Routes as Switch, Route, Navigate } from "react-router-dom";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { SimpleAppRoutes } from "./SimpleAppRoutes";
import Auth from "@/pages/Auth";

const SimpleRoutes = () => {
  const { user, loading } = useSimpleAuth();
  
  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  // If no user, show auth page for any route
  if (!user) {
    return (
      <Switch>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Switch>
    );
  }

  // User is authenticated, show app routes
  return (
    <Switch>
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="*" element={<SimpleAppRoutes />} />
    </Switch>
  );
};

export default SimpleRoutes;

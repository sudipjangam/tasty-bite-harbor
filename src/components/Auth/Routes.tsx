
import { Routes as Switch, Route, Navigate } from "react-router-dom";
import { useAuthState } from "@/hooks/useAuthState";
import { AppRoutes } from "./AppRoutes";
import AuthLoader from "./AuthLoader";

/**
 * Main Routes component that renders all application routes
 * Refactored to improve maintainability and readability
 */
const Routes = () => {
  const { user, loading } = useAuthState();
  
  console.log("Routes component - Loading:", loading, "User:", user ? "authenticated" : "not authenticated");
  
  // If authentication is still loading, show the loader
  if (loading) {
    return <AuthLoader />;
  }

  // If no user is authenticated, redirect to auth page
  if (!user) {
    console.log("No user found, redirecting to /auth");
    return <Navigate to="/auth" replace />;
  }

  // Once authentication check is complete and user exists, render routes
  console.log("User authenticated, rendering app routes");
  return <>{AppRoutes}</>;
};

export default Routes;

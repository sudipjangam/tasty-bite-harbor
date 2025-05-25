
import { Routes as Switch, Route, Navigate } from "react-router-dom";
import { useAuthState } from "@/hooks/useAuthState";
import { AppRoutes } from "./AppRoutes";
import AuthLoader from "./AuthLoader";

/**
 * Main Routes component that renders all application routes
 * Refactored to improve maintainability and readability
 */
const Routes = () => {
  const { loading } = useAuthState();
  
  // If authentication is still loading, show the loader
  if (loading) {
    return <AuthLoader />;
  }

  // Once authentication check is complete, render routes
  return <>{AppRoutes}</>;
};

export default Routes;

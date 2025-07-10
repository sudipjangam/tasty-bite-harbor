import React from "react";
import { Routes as RouterRoutes, Route } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppRoutes } from "./AppRoutes";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

const Routes = () => {
  const { user, loading } = useAuth();

  console.log("Routes: Loading:", loading, "User:", user ? "authenticated" : "not authenticated");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    console.log("Routes: No user, showing auth");
    return (
      <RouterRoutes>
        <Route path="*" element={<Auth />} />
      </RouterRoutes>
    );
  }

  console.log("Routes: User authenticated, showing app routes");
  return (
    <RouterRoutes>
      <Route path="/*" element={<AppRoutes />} />
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
};

export default Routes;
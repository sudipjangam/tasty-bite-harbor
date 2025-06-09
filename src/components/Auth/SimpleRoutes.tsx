
import React from "react";
import { Routes, Route } from "react-router-dom";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { SimpleAppRoutes } from "./SimpleAppRoutes";
import Auth from "@/pages/Auth";
import NotFound from "@/pages/NotFound";

const SimpleRoutes = () => {
  const { user, loading } = useSimpleAuth();

  console.log("SimpleRoutes: Loading:", loading, "User:", user ? "authenticated" : "not authenticated");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    console.log("SimpleRoutes: No user, showing auth");
    return (
      <Routes>
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  console.log("SimpleRoutes: User authenticated, showing app routes");
  return (
    <Routes>
      <Route path="/*" element={<SimpleAppRoutes />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default SimpleRoutes;

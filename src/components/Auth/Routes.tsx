import React from "react";
import { Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppRoutes } from "./AppRoutes";
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";
import LandingWebsite from "@/pages/LandingWebsite";
import PublicEnrollmentPage from "@/pages/PublicEnrollmentPage";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import DeleteAccount from "@/pages/DeleteAccount";
import CustomerOrder from "@/pages/CustomerOrder";
import PublicBillPage from "@/pages/PublicBillPage";

const Routes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <RouterRoutes>
        <Route path="/" element={<LandingWebsite />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/enroll/:slug" element={<PublicEnrollmentPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/delete-account" element={<DeleteAccount />} />
        <Route path="/order/:encodedData" element={<CustomerOrder />} />
        <Route path="/bill/:encodedData" element={<PublicBillPage />} />
        <Route path="*" element={<LandingWebsite />} />
      </RouterRoutes>
    );
  }

  return (
    <RouterRoutes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/auth" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/website" element={<LandingWebsite />} />
      <Route path="/enroll/:slug" element={<PublicEnrollmentPage />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/delete-account" element={<DeleteAccount />} />
      <Route path="/order/:encodedData" element={<CustomerOrder />} />
      <Route path="/bill/:encodedData" element={<PublicBillPage />} />
      <Route path="/dashboard/*" element={<AppRoutes />} />
      <Route path="/*" element={<AppRoutes />} />
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
};

export default Routes;

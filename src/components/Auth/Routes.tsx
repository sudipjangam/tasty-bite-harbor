import React, { Suspense, lazy } from "react";
import { Routes as RouterRoutes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { AppRoutes } from "./AppRoutes";
import SubscriptionGate from "./SubscriptionGate";
import Auth from "@/pages/Auth";
import AuthCallback from "@/pages/AuthCallback";
import NotFound from "@/pages/NotFound";
import LandingWebsite from "@/pages/LandingWebsite";
import PublicEnrollmentPage from "@/pages/PublicEnrollmentPage";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsAndConditions from "@/pages/TermsAndConditions";
import RefundPolicy from "@/pages/RefundPolicy";
import ReturnPolicy from "@/pages/ReturnPolicy";
import ShippingPolicy from "@/pages/ShippingPolicy";
import DeleteAccount from "@/pages/DeleteAccount";
import CustomerOrder from "@/pages/CustomerOrder";
import PublicBillPage from "@/pages/PublicBillPage";
import PublicTruckPage from "@/pages/PublicTruckPage";
import BlogZomatoSwiggyIntegration from "@/pages/BlogZomatoSwiggyIntegration";
import { PageLoader } from "@/components/ui/page-loader";

// Public invoice viewer (accessible without login)
const InvoicePage = lazy(() => import("@/pages/InvoicePage"));
const OrderStatusPage = lazy(() => import("@/pages/OrderStatusPage"));
const KitchenTV = lazy(() => import("@/pages/KitchenTV"));

// Standalone subscription page (outside dashboard layout — no sidebar)
const SubscriptionPage = lazy(
  () => import("@/components/Subscription/SubscriptionPage"),
);

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
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/refund" element={<RefundPolicy />} />
        <Route path="/return" element={<ReturnPolicy />} />
        <Route path="/shipping" element={<ShippingPolicy />} />
        <Route path="/delete-account" element={<DeleteAccount />} />
        <Route path="/order/:encodedData" element={<CustomerOrder />} />
        <Route path="/bill/:encodedData" element={<PublicBillPage />} />
        <Route path="/truck/:slug" element={<PublicTruckPage />} />
        <Route path="/blog/zomato-swiggy-integration" element={<BlogZomatoSwiggyIntegration />} />
        <Route path="/reset-password" element={<Auth />} />
        <Route path="/invoice/*" element={<Suspense fallback={<PageLoader />}><InvoicePage /></Suspense>} />
        <Route path="/order-status/*" element={<Suspense fallback={<PageLoader />}><OrderStatusPage /></Suspense>} />
        <Route path="/kitchen-tv" element={<Suspense fallback={<PageLoader />}><KitchenTV /></Suspense>} />
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
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/refund" element={<RefundPolicy />} />
      <Route path="/return" element={<ReturnPolicy />} />
      <Route path="/shipping" element={<ShippingPolicy />} />
      <Route path="/delete-account" element={<DeleteAccount />} />
      <Route path="/order/:encodedData" element={<CustomerOrder />} />
      <Route path="/bill/:encodedData" element={<PublicBillPage />} />
      <Route path="/truck/:slug" element={<PublicTruckPage />} />
      <Route path="/blog/zomato-swiggy-integration" element={<BlogZomatoSwiggyIntegration />} />
      <Route path="/invoice/*" element={<Suspense fallback={<PageLoader />}><InvoicePage /></Suspense>} />
      <Route path="/order-status/*" element={<Suspense fallback={<PageLoader />}><OrderStatusPage /></Suspense>} />
      <Route path="/kitchen-tv" element={<Suspense fallback={<PageLoader />}><KitchenTV /></Suspense>} />

      {/* Standalone subscription page — NO sidebar, NO subscription gate */}
      <Route
        path="/subscription"
        element={
          <Suspense fallback={<PageLoader />}>
            <SubscriptionPage />
          </Suspense>
        }
      />

      {/* Dashboard routes — wrapped with SubscriptionGate */}
      <Route
        path="/dashboard/*"
        element={
          <SubscriptionGate>
            <AppRoutes />
          </SubscriptionGate>
        }
      />
      <Route
        path="/*"
        element={
          <SubscriptionGate>
            <AppRoutes />
          </SubscriptionGate>
        }
      />
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
};

export default Routes;

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";

export const SubscriptionSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [subDetails, setSubDetails] = useState<any>(null);

  useEffect(() => {
    const razorpay_payment_id = searchParams.get("razorpay_payment_id");
    const razorpay_payment_link_id =
      searchParams.get("razorpay_payment_link_id") || searchParams.get("link_id");
    const razorpay_payment_link_reference_id = searchParams.get(
      "razorpay_payment_link_reference_id"
    );
    const razorpay_payment_link_status =
      searchParams.get("razorpay_payment_link_status") || "paid";
    const razorpay_signature = searchParams.get("razorpay_signature");

    if (!razorpay_payment_id || !razorpay_signature) {
      setStatus("error");
      setErrorMessage("Missing payment verification details from payment gateway.");
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        const { data, error } = await supabase.functions.invoke("verify-razorpay-payment", {
          body: {
            razorpay_payment_id,
            razorpay_payment_link_id,
            razorpay_payment_link_reference_id,
            razorpay_payment_link_status,
            razorpay_signature,
          },
        });

        if (!isMounted) return;

        if (error) {
          throw new Error(error.message || "Payment verification failed");
        }

        if (!data?.success) {
          throw new Error(data?.error || data?.message || "Verification failed");
        }

        setSubDetails(data.subscription);
        setStatus("success");
      } catch (err: any) {
        if (!isMounted) return;
        setStatus("error");
        setErrorMessage(err.message || "Failed to verify and activate subscription.");
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {status === "loading" && (
          <div className="py-8 space-y-4">
            <Loader2 className="w-12 h-12 text-[#2E4FA3] animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Verifying Your Payment...
            </h2>
            <p className="text-sm text-slate-500">
              Please wait while we automatically activate your subscription.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-5">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-950/50 rounded-full flex items-center justify-center mx-auto text-green-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                Subscription Activated! 🚀
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Your payment was received and your subscription has been successfully updated.
              </p>
            </div>

            {subDetails?.current_period_end && (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-left text-xs space-y-1.5">
                <div className="flex justify-between text-slate-500">
                  <span>Status:</span>
                  <span className="font-semibold text-green-600 capitalize">
                    {subDetails.status || "Active"}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Valid Until:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(subDetails.current_period_end).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={() => navigate("/dashboard")}
              className="w-full bg-[#F26522] hover:bg-[#d95516] text-white font-bold h-11 gap-2"
            >
              Continue to Dashboard <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-5">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center mx-auto text-red-600">
              <AlertCircle className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Payment Verification Issue
              </h2>
              <p className="text-xs text-red-500 mt-2 bg-red-50 dark:bg-red-950/40 p-3 rounded-lg border border-red-200 dark:border-red-800">
                {errorMessage}
              </p>
              <p className="text-xs text-slate-500 mt-3">
                If payment was deducted from your account, please share screenshot / UTR to{" "}
                <strong>+91 83295 40398</strong> for immediate support.
              </p>
            </div>

            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full"
            >
              Back to Home
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SubscriptionSuccess;

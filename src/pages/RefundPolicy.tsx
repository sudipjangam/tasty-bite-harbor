import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const RefundPolicy = () => {
  useEffect(() => {
    document.title = "Refund and Cancellation Policy — Swadeshi Solutions";
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/" aria-label="Back to home">
            <Button variant="ghost" size="icon" aria-label="Back to home">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <RefreshCcw className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Refund & Cancellation
            </span>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Refund & Cancellation Policy</h1>
            <p className="text-gray-600 dark:text-gray-400"><strong>Last Updated:</strong> June 6, 2026</p>
          </div>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Cancellations</h2>
            <p className="text-gray-700 dark:text-gray-300">You can cancel your subscription at any time. Cancellation takes effect at the end of the current billing cycle.</p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Refunds</h2>
            <p className="text-gray-700 dark:text-gray-300">We offer a 7-day money-back guarantee for new subscriptions. After 7 days, subscription fees are non-refundable.</p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Process</h2>
            <p className="text-gray-700 dark:text-gray-300">To request a refund or cancel, email <strong>inquiry@swadeshisolutions.co.in</strong>. Refunds will be processed within 5-7 business days to the original payment method.</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default RefundPolicy;

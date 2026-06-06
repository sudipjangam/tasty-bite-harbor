import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

const TermsAndConditions = () => {
  useEffect(() => {
    document.title = "Terms and Conditions — Swadeshi Solutions";
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
            <FileText className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              Terms and Conditions
            </span>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Terms and Conditions</h1>
            <p className="text-gray-600 dark:text-gray-400"><strong>Last Updated:</strong> June 6, 2026</p>
          </div>
          <section className="space-y-4">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Welcome to Swadeshi Solutions. By using our services, you agree to these terms.
            </p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">1. Service Use</h2>
            <p className="text-gray-700 dark:text-gray-300">We provide B2B SaaS for restaurant management. You must use our platform legally and responsibly.</p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">2. Account Responsibility</h2>
            <p className="text-gray-700 dark:text-gray-300">You are responsible for maintaining the security of your account credentials.</p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">3. Payments</h2>
            <p className="text-gray-700 dark:text-gray-300">Subscription fees are billed in advance. Failure to pay may result in service suspension.</p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">4. Termination</h2>
            <p className="text-gray-700 dark:text-gray-300">We reserve the right to terminate accounts violating these terms.</p>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">5. Contact</h2>
            <p className="text-gray-700 dark:text-gray-300">For inquiries, contact us at <strong>inquiry@swadeshisolutions.co.in</strong>.</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default TermsAndConditions;

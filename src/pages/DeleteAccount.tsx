import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Mail,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

const DeleteAccount = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !confirmed) {
      toast({
        title: "Missing Information",
        description: "Please enter your email and confirm your understanding.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    // Simulate API call - In production, this would call your backend
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setLoading(false);
    setSubmitted(true);

    toast({
      title: "Request Submitted",
      description: "We've received your account deletion request.",
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-red-600" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Delete Account
              </h1>
            </div>
          </div>
        </header>

        {/* Success Message */}
        <main className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Request Submitted Successfully
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              We've received your account deletion request. Our team will
              process it within
              <strong> 30 days</strong>. You'll receive a confirmation email at{" "}
              <strong>{email}</strong>.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-left">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                What happens next?
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• You'll receive a confirmation email within 24 hours</li>
                <li>• Your data will be permanently deleted within 30 days</li>
                <li>
                  • Financial records will be retained for 7 years (legal
                  requirement)
                </li>
                <li>
                  • You can continue using the service until deletion is
                  complete
                </li>
              </ul>
            </div>
            <Link to="/">
              <Button className="mt-4">Return to Home</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Trash2 className="h-6 w-6 text-red-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Delete Account
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 space-y-8">
          {/* Warning Banner */}
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-red-800 dark:text-red-300">
                  Warning: This action is irreversible
                </h2>
                <p className="text-red-700 dark:text-red-400 mt-1">
                  Deleting your account will permanently remove all your data,
                  including orders, menu items, customer records, and settings.
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Header Section */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Request Account Deletion
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Submit a request to permanently delete your Swadeshi Solutions
              account and all associated data.
            </p>
          </div>

          {/* What Gets Deleted */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              What will be deleted:
            </h3>
            <div className="grid gap-3 text-sm text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Your restaurant profile and settings</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>All menu items and categories</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Order history and analytics</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Customer data and preferences</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Staff accounts and roles</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Inventory and supplier records</span>
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                What will be retained (legal requirement):
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                GST invoices and financial records will be retained for 7 years
                as required by Indian tax laws.
              </p>
            </div>
          </div>

          {/* Deletion Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Registered Email Address *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for leaving (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Help us improve by sharing why you're leaving..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              />
              <Label
                htmlFor="confirm"
                className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
              >
                I understand that this action is permanent and irreversible. All
                my data will be permanently deleted within 30 days, and I will
                no longer be able to access my account.
              </Label>
            </div>

            <Button
              type="submit"
              variant="destructive"
              className="w-full"
              disabled={!confirmed || !email || loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Submit Deletion Request
                </>
              )}
            </Button>
          </form>

          {/* Alternative Options */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Before you go...
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              If you're having issues with our service, we'd love to help!
              Contact our support team:
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="mailto:support@swadeshisolutions.in"
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                <Mail className="h-4 w-4" />
                support@swadeshisolutions.in
              </a>
              <Link
                to="/privacy"
                className="flex items-center gap-2 text-blue-600 hover:underline"
              >
                <Shield className="h-4 w-4" />
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} Swadeshi Solutions. All rights
              reserved.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeleteAccount;

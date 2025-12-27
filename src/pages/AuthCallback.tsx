import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle } from "lucide-react";

/**
 * OAuth callback handler page.
 * This page handles the redirect from OAuth providers (like Google)
 * and processes the authentication session.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">(
    "processing"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from URL hash (Supabase stores tokens there after OAuth)
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          setError(error.message);
          setStatus("error");
          return;
        }

        if (data?.session) {
          setStatus("success");
          // Small delay to show success state
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 1000);
        } else {
          // No session yet, wait for auth state change
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === "SIGNED_IN" && session) {
              setStatus("success");
              setTimeout(() => {
                navigate("/", { replace: true });
              }, 1000);
              subscription.unsubscribe();
            }
          });

          // Timeout after 10 seconds
          setTimeout(() => {
            if (status === "processing") {
              setError("Authentication timed out. Please try again.");
              setStatus("error");
              subscription.unsubscribe();
            }
          }, 10000);
        }
      } catch (err: any) {
        console.error("Auth callback exception:", err);
        setError(err.message || "An unexpected error occurred");
        setStatus("error");
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950">
      <div className="text-center space-y-6 p-8">
        {status === "processing" && (
          <>
            <Loader2 className="h-16 w-16 animate-spin text-indigo-600 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Signing you in...
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Please wait while we complete your sign-in
              </p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Welcome!
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Redirecting to your dashboard...
              </p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-3xl">⚠️</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Authentication Failed
              </h2>
              <p className="text-red-500">
                {error || "Something went wrong. Please try again."}
              </p>
              <button
                onClick={() => navigate("/auth", { replace: true })}
                className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Back to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;


import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Navigate } from "react-router-dom";
import BrandingSection from "@/components/Auth/BrandingSection";
import AuthForm from "@/components/Auth/AuthForm";

const Auth = () => {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setSessionChecked(true);
      } catch (error) {
        console.error("Error checking session:", error);
        setSessionChecked(true);
      }
    };

    checkSession();
  }, []);

  // Redirect to dashboard if already authenticated
  if (sessionChecked && session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Left side - branding and info */}
      <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center">
        <BrandingSection />
      </div>

      {/* Right side - auth form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12">
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">
              {authMode === "signin" ? "Welcome back" : "Create an account"}
            </CardTitle>
            <CardDescription>
              {authMode === "signin" 
                ? "Enter your credentials to access your account" 
                : "Fill in the details below to create your account"}
            </CardDescription>
          </CardHeader>
          <AuthForm authMode={authMode} setAuthMode={setAuthMode} />
        </Card>
      </div>
    </div>
  );
};

export default Auth;


import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [session, setSession] = useState<any>(null);
  const navigate = useNavigate();

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

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        toast({
          title: "Account created",
          description: "Please check your email to confirm your registration.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication error",
        description: error.message || "An error occurred during authentication",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Redirect to dashboard if already authenticated
  if (sessionChecked && session) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Left side - branding and info */}
      <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <img 
              src="/logo.svg" 
              alt="Swadeshi Solutions Logo" 
              className="h-16 mb-6"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder.svg";
              }}
            />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-deep-blue to-brand-success-green bg-clip-text text-transparent mb-4">
              Swadeshi Solutions
            </h1>
            <p className="text-lg text-muted-foreground mb-6">
              Efficiently manage your restaurant operations with our comprehensive restaurant management system. From table reservations to inventory tracking, we've got you covered.
            </p>
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-brand-success-green/10 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-success-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Complete restaurant management</span>
              </div>
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-brand-warm-orange/10 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-warm-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Real-time analytics and reports</span>
              </div>
              <div className="flex items-center">
                <div className="p-2 rounded-full bg-brand-deep-blue/10 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-deep-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Inventory and staff management</span>
              </div>
            </div>
            <Button 
              variant="link" 
              className="mt-8 p-0 text-brand-deep-blue hover:text-brand-deep-blue/90"
              onClick={() => window.open("https://swadeshisolutions.teleporthq.app", "_blank")}
            >
              Visit our website →
            </Button>
          </div>
        </div>
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
          <form onSubmit={handleAuth}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col">
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {authMode === "signin" ? "Signing in..." : "Signing up..."}
                  </>
                ) : (
                  authMode === "signin" ? "Sign in" : "Sign up"
                )}
              </Button>
              <div className="mt-4 text-center text-sm">
                {authMode === "signin" ? (
                  <p>
                    Don't have an account?{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => setAuthMode("signup")}
                    >
                      Sign up
                    </Button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{" "}
                    <Button
                      variant="link"
                      className="p-0 h-auto"
                      onClick={() => setAuthMode("signin")}
                    >
                      Sign in
                    </Button>
                  </p>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Auth;

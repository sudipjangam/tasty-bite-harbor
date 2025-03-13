
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, StoreIcon, Mail, Lock } from "lucide-react";
import { checkSubscriptionStatus } from "@/utils/subscriptionUtils";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/ThemeToggle";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPlans, setShowPlans] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantType, setRestaurantType] = useState("");

  useEffect(() => {
    const handleAuthChange = async () => {
      try {
        const { data: authData } = await supabase.auth.getSession();
        
        // Handle OAuth redirections and hash fragments from Google auth
        if (window.location.hash && window.location.hash.includes('access_token')) {
          // We have a hash with auth tokens, likely from Google OAuth
          console.log("Detected OAuth redirect with hash");
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // If we have a session either from the hash or already established
          if (authData?.session) {
            await processSuccessfulAuth(authData.session.user.id);
          }
        } else if (authData?.session) {
          // Normal session check without hash
          await processSuccessfulAuth(authData.session.user.id);
        }
      } catch (error) {
        console.error("Auth change error:", error);
        toast({
          title: "Error",
          description: "Failed to process authentication",
          variant: "destructive",
        });
      }
    };

    handleAuthChange();
  }, [navigate, toast]);

  // Extract the authentication success logic to a reusable function
  const processSuccessfulAuth = async (userId) => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("restaurant_id")
        .eq("id", userId)
        .single();

      if (profile?.restaurant_id) {
        const hasActiveSubscription = await checkSubscriptionStatus(profile.restaurant_id);
        
        if (!hasActiveSubscription) {
          setShowPlans(true);
          toast({
            title: "Subscription Required",
            description: "Your subscription is not active. Please choose a plan to continue.",
            variant: "destructive",
          });
          return;
        }
      }
      
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
      navigate("/");
    } catch (error) {
      console.error("Profile fetch error:", error);
      toast({
        title: "Error",
        description: "Failed to fetch user profile",
        variant: "destructive",
      });
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (isLogin) {
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        await processSuccessfulAuth(user?.id);
      } else {
        const { data: { user }, error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        
        if (user) {
          const { data: restaurant, error: restaurantError } = await supabase
            .from("restaurants")
            .insert([
              { name: restaurantName || email.split('@')[0] + "'s Restaurant" }
            ])
            .select()
            .single();
            
          if (restaurantError) throw restaurantError;
          
          const { error: profileError } = await supabase
            .from("profiles")
            .update({
              restaurant_id: restaurant.id,
              first_name: email.split('@')[0],
            })
            .eq("id", user.id);
            
          if (profileError) throw profileError;
          
          setShowPlans(true);
          toast({
            title: "Account Created",
            description: "Please select a subscription plan to continue.",
          });
        } else {
          toast({
            title: "Success",
            description: "Please check your email to verify your account",
          });
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setGoogleLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        }
      });
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Google auth error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Google authentication failed",
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  if (showPlans) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-7xl">
          <SubscriptionPlans />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-brand-deep-blue dark:text-white mb-1 font-playfair relative inline-block">
          <span className="relative z-10">Swadeshi Solutions</span>
          <span className="absolute bottom-0 left-0 w-full h-2 bg-brand-success-green opacity-30 rounded"></span>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mt-2 text-lg">Restaurant Management System</p>
      </div>
      
      <Card className="w-full max-w-md p-8 shadow-xl border-t-4 border-t-brand-success-green animate-fade-in bg-white dark:bg-gray-800 dark:border-brand-success-green dark:text-white">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-brand-deep-blue to-brand-success-green dark:from-brand-success-green dark:to-brand-deep-blue rounded-full flex items-center justify-center mb-4 shadow-lg">
            <StoreIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-brand-deep-blue dark:text-white">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mt-1">
            {isLogin 
              ? "Sign in to manage your restaurant" 
              : "Set up your restaurant management account"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-700 dark:text-slate-200">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                required
              />
              <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-700 dark:text-slate-200">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                required
              />
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
          </div>
          
          {!isLogin && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="restaurantName" className="text-slate-700 dark:text-slate-200">Restaurant Name</Label>
                <Input
                  id="restaurantName"
                  placeholder="Your Restaurant Name"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  className="bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="restaurantType" className="text-slate-700 dark:text-slate-200">Restaurant Type</Label>
                <Select 
                  value={restaurantType} 
                  onValueChange={setRestaurantType}
                >
                  <SelectTrigger id="restaurantType" className="dark:bg-gray-700 dark:text-white dark:border-gray-600">
                    <SelectValue placeholder="Select restaurant type" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:text-white">
                    <SelectItem value="cafe">Café / Restaurant</SelectItem>
                    <SelectItem value="hotel">Hotel / Accommodation</SelectItem>
                    <SelectItem value="all-in-one">All-in-One (Restaurant & Hotel)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This helps us recommend the best subscription plan for your business
                </p>
              </div>
            </div>
          )}
          
          <Button
            type="submit"
            className="w-full bg-brand-deep-blue hover:bg-brand-deep-blue/90 dark:bg-brand-success-green dark:hover:bg-brand-success-green/90 dark:text-brand-deep-blue font-medium"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full dark:bg-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background dark:bg-gray-800 px-2 text-slate-500 dark:text-slate-400">
                Or continue with
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full mt-4 flex items-center justify-center border-slate-300 dark:border-slate-600 dark:text-white hover:bg-slate-50 dark:hover:bg-gray-700"
            onClick={handleGoogleAuth}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
            )}
            Sign {isLogin ? "in" : "up"} with Google
          </Button>
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-brand-deep-blue dark:text-brand-success-green hover:text-brand-success-green dark:hover:text-brand-success-green/80"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </Button>
        </div>
      </Card>
      
      <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
        &copy; {new Date().getFullYear()} Swadeshi Solutions. All rights reserved.
      </div>
    </div>
  );
};

export default Auth;

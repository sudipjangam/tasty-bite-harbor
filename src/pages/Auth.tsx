
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, StoreIcon } from "lucide-react";
import { checkSubscriptionStatus } from "@/utils/subscriptionUtils";
import SubscriptionPlans from "@/components/SubscriptionPlans";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPlans, setShowPlans] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantType, setRestaurantType] = useState("");

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

        // Get user's profile to get restaurant_id
        const { data: profile } = await supabase
          .from("profiles")
          .select("restaurant_id")
          .eq("id", user?.id)
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
      } else {
        // Sign up new user
        const { data: { user }, error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) throw error;
        
        if (user) {
          // Create restaurant
          const { data: restaurant, error: restaurantError } = await supabase
            .from("restaurants")
            .insert([
              { name: restaurantName || email.split('@')[0] + "'s Restaurant" }
            ])
            .select()
            .single();
            
          if (restaurantError) throw restaurantError;
          
          // Update user profile with restaurant_id
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-4">
            <StoreIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">
            {isLogin ? "Login" : "Create Account"}
          </h1>
          {!isLogin && (
            <p className="text-muted-foreground mt-1">
              Set up your restaurant management account
            </p>
          )}
        </div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {!isLogin && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="restaurantName">Restaurant Name</Label>
                <Input
                  id="restaurantName"
                  placeholder="Restaurant Name"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="restaurantType">Restaurant Type</Label>
                <Select 
                  value={restaurantType} 
                  onValueChange={setRestaurantType}
                >
                  <SelectTrigger id="restaurantType">
                    <SelectValue placeholder="Select restaurant type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cafe">Café / Restaurant</SelectItem>
                    <SelectItem value="hotel">Hotel / Accommodation</SelectItem>
                    <SelectItem value="all-in-one">All-in-One (Restaurant & Hotel)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This helps us recommend the best subscription plan for your business
                </p>
              </div>
            </div>
          )}
          
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            {isLogin ? "Login" : "Create Account"}
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Button
            variant="link"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm"
          >
            {isLogin
              ? "Don't have an account? Sign up"
              : "Already have an account? Login"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default Auth;

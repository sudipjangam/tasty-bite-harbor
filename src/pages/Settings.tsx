
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { LogOut, User, Building, Clock, Shield, CreditCard, Loader2, Mail, Phone, MapPin, CalendarClock, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  // Fetch user and profile data
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    },
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user?.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch restaurant data
  const { data: restaurant, isLoading: restaurantLoading } = useQuery({
    queryKey: ['restaurant', profile?.restaurant_id],
    enabled: !!profile?.restaurant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', profile?.restaurant_id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch subscription data
  const { data: subscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['subscription', profile?.restaurant_id],
    enabled: !!profile?.restaurant_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('restaurant_id', profile?.restaurant_id)
        .eq('status', 'active')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // Ignore 'no rows returned' error
      return data;
    },
  });

  // Handle logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear all queries from the cache on logout
      queryClient.clear();
      
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      navigate("/auth");
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading || restaurantLoading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8 bg-gradient-to-br from-purple-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account, restaurant, and subscription settings
          </p>
        </div>
        <Button 
          variant="destructive" 
          onClick={handleLogout}
          className="flex items-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4 mr-2" />
          )}
          Logout
        </Button>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="account" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Account</span>
          </TabsTrigger>
          <TabsTrigger value="restaurant" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span>Restaurant</span>
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Subscription</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium">Account Information</CardTitle>
                  <CardDescription>Your personal account details</CardDescription>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </p>
                    <p className="font-medium text-lg">{session?.user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Role
                    </p>
                    <Badge variant="outline" className="text-md capitalize font-medium px-3 py-1 bg-purple-50 text-purple-700 border-purple-200">
                      {profile?.role || 'N/A'}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      First Name
                    </p>
                    <p className="font-medium text-lg">{profile?.first_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Last Name
                    </p>
                    <p className="font-medium text-lg">{profile?.last_name || 'N/A'}</p>
                  </div>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  Account Created
                </p>
                <p className="font-medium">
                  {session?.user?.created_at
                    ? format(new Date(session.user.created_at), 'PPP')
                    : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="restaurant">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium">Restaurant Information</CardTitle>
                  <CardDescription>Your restaurant details</CardDescription>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-teal-500 flex items-center justify-center">
                  <Building className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Restaurant Name
                    </p>
                    <p className="font-medium text-lg">{restaurant?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Address
                    </p>
                    <p className="font-medium">{restaurant?.address || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </p>
                    <p className="font-medium">
                      {restaurant?.phone 
                        ? <a href={`tel:${restaurant.phone}`} className="text-blue-600 hover:underline">{restaurant.phone}</a>
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </p>
                    <p className="font-medium">
                      {restaurant?.email 
                        ? <a href={`mailto:${restaurant.email}`} className="text-blue-600 hover:underline">{restaurant.email}</a>
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <div>
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <CalendarClock className="h-4 w-4" />
                  Created On
                </p>
                <p className="font-medium">
                  {restaurant?.created_at
                    ? format(new Date(restaurant.created_at), 'PPP')
                    : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="subscription">
          <Card className="shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-medium">Subscription Details</CardTitle>
                  <CardDescription>Your current plan and billing information</CardDescription>
                </div>
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {subscription ? (
                <>
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-100">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">Current Plan</p>
                        <h3 className="text-xl font-bold text-primary mt-1">
                          {subscription.subscription_plans?.name || 'Standard Plan'}
                        </h3>
                        <Badge className="mt-2 bg-green-100 hover:bg-green-100 text-green-800 border-green-200">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Active
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Monthly Price</p>
                        <p className="text-xl font-bold mt-1">
                          ₹{subscription.subscription_plans?.price || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        Current Period Start
                      </p>
                      <p className="font-medium mt-1">
                        {subscription?.current_period_start
                          ? format(new Date(subscription.current_period_start), 'PP')
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <CalendarClock className="h-4 w-4" />
                        Current Period End
                      </p>
                      <p className="font-medium mt-1">
                        {subscription?.current_period_end
                          ? format(new Date(subscription.current_period_end), 'PP')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  {subscription.subscription_plans?.features && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-3">Plan Features:</p>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Array.isArray(subscription.subscription_plans.features) && 
                          subscription.subscription_plans.features.map((feature: string, index: number) => (
                            <li key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span>{feature}</span>
                            </li>
                          ))
                        }
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">No active subscription found.</p>
                  <Button 
                    onClick={() => navigate('/')} 
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
                  >
                    View Plans
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/30 border-t flex justify-between">
              <p className="text-sm text-muted-foreground">
                Need help with your subscription?
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-sm hover:bg-purple-50 hover:text-purple-700"
                onClick={() => window.open('mailto:support@swadeshi.solutions', '_blank')}
              >
                Contact Support
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;

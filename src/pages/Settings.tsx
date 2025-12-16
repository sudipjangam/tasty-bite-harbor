import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { LogOut, User, Building, Clock, Shield, CreditCard, Loader2, Mail, Phone, MapPin, CalendarClock, CheckCircle2, Sparkles, Star, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import PaymentSettingsTab from "@/components/Settings/PaymentSettingsTab";
import { SystemConfigurationTab } from "@/components/Settings/SystemConfigurationTab";
import { AuditLogTab } from "@/components/Settings/AuditLogTab";

const Settings = () => {
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Fetch user and profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
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
      // Clear all queries from the cache on logout
      queryClient.clear();
      
      await signOut();
      
      // Redirect to auth page after sign out
      navigate('/auth');
      
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
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
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
          <p className="text-gray-600 font-medium">Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-slate-900 dark:to-purple-950 p-4 md:p-6">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl p-6 md:p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                  Manage your account, restaurant, and subscription settings
                </p>
              </div>
            </div>
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all duration-300"
              disabled={loading}
              size="lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <LogOut className="w-5 h-5" />
              )}
              <span className="font-semibold">Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="account" className="w-full">
          <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-2xl p-2 mb-8 shadow-lg">
            <TabsList className="w-full bg-transparent grid grid-cols-6 gap-2">
              <TabsTrigger 
                value="account" 
                className="flex items-center gap-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-lg rounded-xl py-4 px-6 transition-all duration-300"
              >
                <User className="h-5 w-5" />
                <span className="font-semibold">Account</span>
              </TabsTrigger>
              <TabsTrigger 
                value="restaurant" 
                className="flex items-center gap-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-lg rounded-xl py-4 px-6 transition-all duration-300"
              >
                <Building className="h-5 w-5" />
                <span className="font-semibold">Restaurant</span>
              </TabsTrigger>
              <TabsTrigger 
                value="subscription" 
                className="flex items-center gap-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-lg rounded-xl py-4 px-6 transition-all duration-300"
              >
                <CreditCard className="h-5 w-5" />
                <span className="font-semibold">Subscription</span>
              </TabsTrigger>
              <TabsTrigger 
                value="payments" 
                className="flex items-center gap-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-lg rounded-xl py-4 px-6 transition-all duration-300"
              >
                <Smartphone className="h-5 w-5" />
                <span className="font-semibold">Payments</span>
              </TabsTrigger>
              <TabsTrigger 
                value="system" 
                className="flex items-center gap-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-lg rounded-xl py-4 px-6 transition-all duration-300"
              >
                <Shield className="h-5 w-5" />
                <span className="font-semibold">System</span>
              </TabsTrigger>
              <TabsTrigger 
                value="audit" 
                className="flex items-center gap-3 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-lg rounded-xl py-4 px-6 transition-all duration-300"
              >
                <Clock className="h-5 w-5" />
                <span className="font-semibold">Audit</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="account">
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500">
              <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                        <User className="h-6 w-6 text-white" />
                      </div>
                      Account Information
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                      Your personal account details and preferences
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl border border-blue-100 dark:border-blue-800">
                      <p className="text-sm font-semibold text-blue-600 flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4" />
                        Email Address
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">{user?.email}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl border border-purple-100 dark:border-purple-800">
                      <p className="text-sm font-semibold text-purple-600 flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4" />
                        Account Role
                      </p>
                      <Badge className="text-lg font-bold px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg capitalize">
                        {profile?.role || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl border border-green-100 dark:border-green-800">
                      <p className="text-sm font-semibold text-green-600 flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        First Name
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">{profile?.first_name || 'Not Set'}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 rounded-2xl border border-orange-100 dark:border-orange-800">
                      <p className="text-sm font-semibold text-orange-600 flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        Last Name
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">{profile?.last_name || 'Not Set'}</p>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-8" />
                
                <div className="p-6 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-700/50 dark:to-slate-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    Account Created
                  </p>
                  <p className="font-bold text-xl text-gray-900 dark:text-white">
                    {user?.created_at
                      ? format(new Date(user.created_at), 'PPPP')
                      : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="restaurant">
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500">
              <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-r from-blue-500 to-teal-500 rounded-xl shadow-lg">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                      Restaurant Information
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                      Your restaurant details and contact information
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {/* Basic Information */}
                <div className="mb-10">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl border border-blue-100 dark:border-blue-800">
                      <p className="text-sm font-semibold text-blue-600 flex items-center gap-2 mb-2">
                        <Building className="h-4 w-4" />
                        Restaurant Name
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">{restaurant?.name || 'Not Set'}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl border border-purple-100 dark:border-purple-800">
                      <p className="text-sm font-semibold text-purple-600 flex items-center gap-2 mb-2">
                        <MapPin className="h-4 w-4" />
                        Address
                      </p>
                      <p className="font-medium text-lg text-gray-900 dark:text-white">{restaurant?.address || 'Not Set'}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl border border-green-100 dark:border-green-800">
                      <p className="text-sm font-semibold text-green-600 flex items-center gap-2 mb-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">
                        {restaurant?.phone 
                          ? <a href={`tel:${restaurant.phone}`} className="text-blue-600 hover:text-blue-800 transition-colors duration-200">{restaurant.phone}</a>
                          : 'Not Set'}
                      </p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/30 rounded-2xl border border-orange-100 dark:border-orange-800">
                      <p className="text-sm font-semibold text-orange-600 flex items-center gap-2 mb-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">
                        {restaurant?.email 
                          ? <a href={`mailto:${restaurant.email}`} className="text-blue-600 hover:text-blue-800 transition-colors duration-200">{restaurant.email}</a>
                          : 'Not Set'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Business Details */}
                <div className="mb-10">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-purple-600" />
                    Business Details
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                      <p className="text-sm font-semibold text-indigo-600 flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4" />
                        GST Number
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">{restaurant?.gstin || 'Not Set'}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 rounded-2xl border border-teal-100 dark:border-teal-800">
                      <p className="text-sm font-semibold text-teal-600 flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4" />
                        Website
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">
                        {restaurant?.website 
                          ? <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 transition-colors duration-200">{restaurant.website}</a>
                          : 'Not Set'}
                      </p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/30 dark:to-rose-900/30 rounded-2xl border border-pink-100 dark:border-pink-800">
                      <p className="text-sm font-semibold text-pink-600 flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4" />
                        Registration Number
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">{restaurant?.registration_number || 'Not Set'}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 rounded-2xl border border-yellow-100 dark:border-yellow-800">
                      <p className="text-sm font-semibold text-yellow-600 flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4" />
                        License Number
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">{restaurant?.license_number || 'Not Set'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div className="mb-10">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <User className="h-5 w-5 text-green-600" />
                    Additional Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                      <p className="text-sm font-semibold text-emerald-600 flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        Owner Name
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">{restaurant?.owner_name || 'Not Set'}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30 rounded-2xl border border-violet-100 dark:border-violet-800">
                      <p className="text-sm font-semibold text-violet-600 flex items-center gap-2 mb-2">
                        <CalendarClock className="h-4 w-4" />
                        Established Date
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">
                        {restaurant?.established_date 
                          ? format(new Date(restaurant.established_date), 'PPPP')
                          : 'Not Set'}
                      </p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-900/30 dark:to-sky-900/30 rounded-2xl border border-cyan-100 dark:border-cyan-800">
                      <p className="text-sm font-semibold text-cyan-600 flex items-center gap-2 mb-2">
                        <User className="h-4 w-4" />
                        Seating Capacity
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">{restaurant?.seating_capacity || 'Not Set'}</p>
                    </div>
                    <div className="p-6 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-700/50 dark:to-gray-700/50 rounded-2xl border border-slate-100 dark:border-slate-600">
                      <p className="text-sm font-semibold text-slate-600 flex items-center gap-2 mb-2">
                        <Star className="h-4 w-4" />
                        Rating
                      </p>
                      <p className="font-bold text-xl text-gray-900 dark:text-white">
                        {restaurant?.rating ? `${restaurant.rating}/5.0` : 'Not Rated'}
                        {restaurant?.total_reviews > 0 && (
                          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({restaurant.total_reviews} reviews)</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                {restaurant?.description && (
                  <div className="mb-10">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Description</h3>
                    <div className="p-6 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-700/50 dark:to-slate-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
                      <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">{restaurant.description}</p>
                    </div>
                  </div>
                )}
                
                <Separator className="my-8" />
                
                <div className="p-6 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-700/50 dark:to-slate-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 flex items-center gap-2 mb-2">
                    <CalendarClock className="h-4 w-4" />
                    Restaurant Created
                  </p>
                  <p className="font-bold text-xl text-gray-900 dark:text-white">
                    {restaurant?.created_at
                      ? format(new Date(restaurant.created_at), 'PPPP')
                      : 'N/A'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="subscription">
            <Card className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg border border-white/30 dark:border-gray-700/30 rounded-3xl shadow-2xl hover:shadow-3xl transition-all duration-500">
              <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
                        <CreditCard className="h-6 w-6 text-white" />
                      </div>
                      Subscription Details
                    </CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                      Your current plan and billing information
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8">
                {subscription ? (
                  <>
                    <div className="bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 p-8 rounded-3xl text-white mb-8 shadow-2xl">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-4">
                            <Star className="h-8 w-8 text-yellow-300" />
                            <p className="text-white/80 text-lg font-medium">Current Plan</p>
                          </div>
                          <h3 className="text-3xl font-bold mb-4">
                            {subscription.subscription_plans?.name || 'Standard Plan'}
                          </h3>
                          <Badge className="bg-green-500 hover:bg-green-500 text-white border-0 text-lg font-bold px-4 py-2 shadow-lg">
                            <CheckCircle2 className="mr-2 h-5 w-5" /> Active
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-white/80 text-lg font-medium mb-2">Monthly Price</p>
                          <p className="text-4xl font-bold">
                            ₹{subscription.subscription_plans?.price || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 rounded-2xl border border-blue-100 dark:border-blue-800">
                        <p className="text-sm font-semibold text-blue-600 flex items-center gap-2 mb-2">
                          <CalendarClock className="h-4 w-4" />
                          Current Period Start
                        </p>
                        <p className="font-bold text-xl text-gray-900 dark:text-white">
                          {subscription?.current_period_start
                            ? format(new Date(subscription.current_period_start), 'PPP')
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl border border-purple-100 dark:border-purple-800">
                        <p className="text-sm font-semibold text-purple-600 flex items-center gap-2 mb-2">
                          <CalendarClock className="h-4 w-4" />
                          Current Period End
                        </p>
                        <p className="font-bold text-xl text-gray-900 dark:text-white">
                          {subscription?.current_period_end
                            ? format(new Date(subscription.current_period_end), 'PPP')
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    {subscription.subscription_plans?.features && (
                      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl border border-green-100 dark:border-green-800">
                        <p className="text-lg font-bold text-green-700 mb-4 flex items-center gap-2">
                          <Sparkles className="h-5 w-5" />
                          Plan Features
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Array.isArray(subscription.subscription_plans.features) && 
                            subscription.subscription_plans.features.map((feature: string, index: number) => (
                              <div key={index} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-700 rounded-xl shadow-sm">
                                <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                                <span className="font-medium text-gray-900 dark:text-white">{feature}</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                      <div className="p-6 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-700/50 dark:to-slate-700/50 rounded-3xl border border-gray-200 dark:border-gray-600 max-w-md mx-auto">
                      <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Active Subscription</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-6">Choose a plan to unlock all features</p>
                      <Button 
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                        size="lg"
                      >
                        View Plans
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-700/50 dark:to-slate-700/50 border-t border-gray-100 dark:border-gray-700 rounded-b-3xl p-6">
                <div className="flex justify-between items-center w-full">
                  <p className="text-gray-600 dark:text-gray-400 font-medium">
                    Need help with your subscription?
                  </p>
                  <Button 
                    variant="outline" 
                    className="bg-white dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-700 dark:hover:text-indigo-300 border-indigo-200 dark:border-indigo-700 dark:text-white font-semibold px-6 py-2 rounded-xl shadow-md hover:shadow-lg transition-all duration-300"
                    onClick={() => window.open('mailto:support@swadeshi.solutions', '_blank')}
                  >
                    Contact Support
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="payments">
            <PaymentSettingsTab />
          </TabsContent>
          
          <TabsContent value="system">
            <SystemConfigurationTab />
          </TabsContent>
          
          <TabsContent value="audit">
            <AuditLogTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;

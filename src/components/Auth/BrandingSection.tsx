
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, BarChart3, Users, Package } from "lucide-react";

const BrandingSection: React.FC = () => {
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  
  useEffect(() => {
    // Try to get the restaurant from the last login if available
    const getLastRestaurant = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("restaurant_id")
          .eq("id", data.session.user.id)
          .single();
          
        if (profile?.restaurant_id) {
          const { data: restaurant } = await supabase
            .from("restaurants")
            .select("name")
            .eq("id", profile.restaurant_id)
            .single();
            
          if (restaurant?.name) {
            setRestaurantName(restaurant.name);
          }
        }
      }
    };
    
    getLastRestaurant();
  }, []);

  // Format the display name
  const displayName = restaurantName ? `${restaurantName} Management` : "RMS Pro";

  const features = [
    {
      icon: <CheckCircle className="h-6 w-6" />,
      title: "Complete restaurant management",
      description: "End-to-end solution for all your restaurant needs",
      color: "text-brand-success-green",
      bgColor: "bg-brand-success-green/10"
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Real-time analytics and reports",
      description: "Make data-driven decisions with powerful insights",
      color: "text-brand-warm-orange",
      bgColor: "bg-brand-warm-orange/10"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Staff management & scheduling",
      description: "Efficiently manage your team and schedules",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: <Package className="h-6 w-6" />,
      title: "Inventory tracking",
      description: "Keep track of stock levels and automate ordering",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  return (
    <div className="max-w-2xl mx-auto lg:mx-0">
      <div className="mb-12">
        {/* Logo and App Name */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-gradient-to-r from-brand-deep-blue to-brand-success-green rounded-xl flex items-center justify-center shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 11V3a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v18a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-8"></path>
              <path d="m12 12 4 4"></path>
              <path d="M20 12h-8"></path>
            </svg>
          </div>
          <div>
            <span className="text-2xl font-bold text-foreground">{displayName}</span>
            <p className="text-sm text-muted-foreground">Restaurant Management System</p>
          </div>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
          <span className="bg-gradient-to-r from-brand-deep-blue via-purple-600 to-brand-success-green bg-clip-text text-transparent">
            Swadeshi Solutions
          </span>
        </h1>
        
        <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
          Transform your restaurant operations with our comprehensive management platform. 
          Streamline everything from orders and inventory to staff scheduling and customer analytics.
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-4 rounded-xl bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-white/20 dark:border-slate-700/20 hover:shadow-lg transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start space-x-4">
                <div className={`p-2 rounded-lg ${feature.bgColor} ${feature.color} group-hover:scale-110 transition-transform duration-200`}>
                  {feature.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <Button 
            variant="outline" 
            className="group border-brand-deep-blue/20 text-brand-deep-blue hover:bg-brand-deep-blue hover:text-white transition-all duration-200"
            onClick={() => window.open("https://swadeshisolutions.teleporthq.app", "_blank")}
          >
            <span>Visit our website</span>
            <svg className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Button>
          
          <div className="text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Trusted by 500+ restaurants
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingSection;

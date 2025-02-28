
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchSubscriptionPlans } from "@/utils/subscriptionUtils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface SubscriptionPlansProps {
  restaurantId?: string | null;
}

const SubscriptionPlans = ({ restaurantId }: SubscriptionPlansProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: plans = [] } = useQuery({
    queryKey: ["subscriptionPlans"],
    queryFn: fetchSubscriptionPlans,
  });
  
  const subscribeMutation = useMutation({
    mutationFn: async ({ planId, restaurantId }: { planId: string; restaurantId: string }) => {
      // Calculate dates for subscription period
      const now = new Date();
      const monthLater = new Date(now);
      monthLater.setMonth(monthLater.getMonth() + 1);
      
      const { error } = await supabase
        .from("restaurant_subscriptions")
        .insert([
          {
            restaurant_id: restaurantId,
            plan_id: planId,
            status: "active",
            current_period_start: now.toISOString(),
            current_period_end: monthLater.toISOString(),
            cancel_at_period_end: false,
          }
        ]);
        
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription activated successfully",
      });
      queryClient.invalidateQueries();
      navigate("/");
    },
    onError: (error) => {
      console.error("Subscription error:", error);
      toast({
        title: "Error",
        description: "Failed to activate subscription. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleSubscribe = (planId: string) => {
    if (!restaurantId) {
      toast({
        title: "Error",
        description: "No restaurant ID found. Please log in again.",
        variant: "destructive",
      });
      return;
    }
    
    subscribeMutation.mutate({ planId, restaurantId });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/50 to-background p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/auth')}
          className="flex items-center gap-2 mb-6 hover:bg-secondary/80"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Button>

        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-primary 
            [text-shadow:_2px_2px_2px_rgb(0_0_0_/_20%)]">
            Swadeshi Solutions
          </h1>
          <h2 className="text-2xl font-bold text-primary/90">Choose Your Plan</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Select a subscription plan that best fits your needs. All plans include our core features with different levels of access and support.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className="p-6 flex flex-col hover:shadow-lg transition-shadow duration-300 relative overflow-hidden"
            >
              {plan.name.toLowerCase().includes('pro') && (
                <div className="absolute -right-12 top-6 rotate-45 bg-accent text-accent-foreground px-12 py-1 text-sm">
                  Popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-primary">{plan.name}</h3>
                <p className="text-3xl font-bold mt-4">
                  ₹{plan.price} <span className="text-sm text-muted-foreground">/{plan.interval}</span>
                </p>
                <p className="text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <div className="flex-grow">
                {plan.features && Array.isArray(plan.features) && (
                  <ul className="space-y-3">
                    {plan.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button 
                className="mt-6 w-full bg-primary hover:bg-primary/90"
                size="lg"
                onClick={() => handleSubscribe(plan.id)}
                disabled={subscribeMutation.isPending}
              >
                {subscribeMutation.isPending ? "Processing..." : `Select ${plan.name}`}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlans;

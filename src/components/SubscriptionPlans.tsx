
import { useQuery } from "@tanstack/react-query";
import { fetchSubscriptionPlans } from "@/utils/subscriptionUtils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const SubscriptionPlans = () => {
  const { data: plans = [] } = useQuery({
    queryKey: ["subscriptionPlans"],
    queryFn: fetchSubscriptionPlans,
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">Choose a Plan</h2>
      <p className="text-center text-muted-foreground">
        Your subscription is not active. Please choose a plan to continue.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-6 flex flex-col">
            <h3 className="text-xl font-bold">{plan.name}</h3>
            <p className="text-2xl font-bold mt-2">
              ${plan.price} <span className="text-sm">/{plan.interval}</span>
            </p>
            <p className="text-muted-foreground mt-2">{plan.description}</p>
            <div className="flex-grow mt-4">
              {plan.features && Array.isArray(plan.features) && (
                <ul className="space-y-2">
                  {plan.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center">
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Button className="mt-4 w-full">Select Plan</Button>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPlans;

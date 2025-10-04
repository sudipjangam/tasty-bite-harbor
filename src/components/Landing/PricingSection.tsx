import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Check, Star, Crown, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const PricingSection = () => {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Starter",
      icon: <Zap className="w-6 h-6" />,
      price: "₹2,999",
      period: "/month",
      description: "Perfect for small restaurants and cafes",
      features: [
        "Up to 2 users",
        "Basic POS system",
        "Inventory management",
        "Daily reports",
        "Email support",
        "1 location",
        "Basic analytics",
        "Cloud storage (5GB)"
      ],
      popular: false,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      name: "Professional",
      icon: <Star className="w-6 h-6" />,
      price: "₹7,999",
      period: "/month",
      description: "Most popular for growing restaurants",
      features: [
        "Up to 10 users",
        "Advanced POS with QSR",
        "Full inventory & purchasing",
        "Staff management & payroll",
        "CRM & loyalty programs",
        "WhatsApp integration",
        "Advanced analytics & AI",
        "Priority support (24/7)",
        "Up to 3 locations",
        "Cloud storage (50GB)",
        "Custom reports",
        "Channel management"
      ],
      popular: true,
      gradient: "from-purple-500 to-pink-500"
    },
    {
      name: "Enterprise",
      icon: <Crown className="w-6 h-6" />,
      price: "Custom",
      period: "pricing",
      description: "For large chains and franchises",
      features: [
        "Unlimited users",
        "Everything in Professional",
        "Multi-location management",
        "Advanced revenue management",
        "Custom integrations",
        "Dedicated account manager",
        "On-premise option available",
        "Custom training",
        "API access",
        "White-label options",
        "Unlimited storage",
        "SLA guarantee (99.9%)"
      ],
      popular: false,
      gradient: "from-indigo-500 to-purple-500"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent{" "}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Pricing
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Choose the perfect plan for your business. All plans include 14-day free trial.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative overflow-hidden ${
                plan.popular
                  ? "border-2 border-purple-500 shadow-2xl scale-105 lg:scale-110"
                  : "border-gray-200 dark:border-slate-700"
              } transition-all duration-300 hover:shadow-xl`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center py-2 text-sm font-semibold">
                  MOST POPULAR
                </div>
              )}
              
              <CardHeader className={`${plan.popular ? "pt-12" : "pt-6"} pb-6`}>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${plan.gradient} flex items-center justify-center text-white mb-4`}>
                  {plan.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                  {plan.description}
                </p>
                <div className="mt-6">
                  <span className="text-5xl font-bold text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">
                    {plan.period}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="pb-8">
                <Button
                  className={`w-full mb-6 ${
                    plan.popular
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                  }`}
                  size="lg"
                  onClick={() => navigate('/auth')}
                >
                  {plan.price === "Custom" ? "Contact Sales" : "Start Free Trial"}
                </Button>

                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional info */}
        <div className="text-center mt-16 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              All Plans Include
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600 dark:text-gray-300">
              <div>
                <div className="font-semibold text-gray-900 dark:text-white mb-2">
                  ✓ Free Updates
                </div>
                <p>Get all new features automatically</p>
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white mb-2">
                  ✓ Data Security
                </div>
                <p>Bank-grade encryption & backups</p>
              </div>
              <div>
                <div className="font-semibold text-gray-900 dark:text-white mb-2">
                  ✓ No Lock-in
                </div>
                <p>Cancel anytime, no questions asked</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

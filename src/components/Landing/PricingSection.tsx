import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Check,
  Star,
  Crown,
  Zap,
  Building2,
  Hotel,
  X,
  Gift,
  TrendingUp,
  Shield,
  Flame,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isYearly, setIsYearly] = useState(true);
  const [planType, setPlanType] = useState<"restaurant" | "hotel">(
    "restaurant",
  );
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const restaurantPlans = [
    {
      name: "Starter",
      icon: <Zap className="w-6 h-6" />,
      monthlyPrice: 999,
      yearlyPrice: 7999,
      description: "Perfect for small restaurants & cafes",
      competitorPrice: "₹833/mo on Petpooja",
      features: [
        "Your entire small team covered (2 users)",
        "Take orders in seconds, not minutes",
        "Never lose a table booking again",
        "Never run out of stock unexpectedly",
        "See your profits at a glance — daily",
        "Help when you need it — email support",
        "Everything in one location, managed",
        "Your data safe in the cloud (5GB)",
        "GST-ready billing — zero hassle",
        "Instant WhatsApp order alerts",
      ],
      notIncluded: [
        "Multi-location management",
        "AI-powered growth insights",
        "Automated staff scheduling",
      ],
      popular: false,
      color: "#2D3A5F",
      savings: "Save ₹4,000/year",
      savingsPercent: 33,
      freeBonuses: ["Free Setup", "Free Training"],
    },
    {
      name: "Growth",
      icon: <Star className="w-6 h-6" />,
      monthlyPrice: 2499,
      yearlyPrice: 19999,
      description: "9 out of 10 restaurants choose this plan",
      competitorPrice: "₹2,083/mo on Restroworks",
      features: [
        "Your whole team empowered (up to 10 users)",
        "QSR & dine-in — all modes, one system",
        "Auto-track inventory & purchasing",
        "Staff schedules that write themselves",
        "Build loyalty — customers keep coming back",
        "Customers stay updated via WhatsApp",
        "AI tells you what's working & what's not",
        "Priority support — we're always here (24/7)",
        "Expand to 3 locations seamlessly",
        "Generous cloud storage (50GB)",
        "Custom reports tailored to your goals",
        "Zomato & Swiggy orders sync automatically",
        "Kitchen Display — no more lost orders",
      ],
      notIncluded: [
        "White-label branding",
        "API access for custom integrations",
      ],
      popular: true,
      color: "#FF6B6B",
      savings: "Save ₹10,000/year",
      savingsPercent: 33,
      freeBonuses: ["Free Setup", "Free Training", "Free Migration"],
    },
    {
      name: "Professional",
      icon: <Crown className="w-6 h-6" />,
      monthlyPrice: 4999,
      yearlyPrice: 39999,
      description: "For chains & franchises that dominate",
      competitorPrice: "₹4,000/mo on Square",
      features: [
        "Unlimited team members — no limits",
        "Everything in Growth, and much more",
        "Unlimited locations — scale fearlessly",
        "Revenue management that maximizes profit",
        "Integrate with any system you use",
        "Your own dedicated account manager",
        "WhatsApp marketing that drives repeat orders",
        "AI forecasting — predict demand accurately",
        "Full API access — build what you need",
        "Your brand, your way — white-label",
        "Unlimited cloud storage — never worry",
        "99.9% uptime — guaranteed by SLA",
        "Hands-on training at your location",
        "ONDC-ready — future-proof your business",
      ],
      notIncluded: [],
      popular: false,
      color: "#6BCB77",
      savings: "Save ₹20,000/year",
      savingsPercent: 33,
      freeBonuses: [
        "Free Setup",
        "Free Training",
        "Free Migration",
        "Free 1st Month",
      ],
    },
  ];

  const hotelPlans = [
    {
      name: "Essential",
      icon: <Building2 className="w-6 h-6" />,
      monthlyPrice: 1999,
      yearlyPrice: 15999,
      description: "For small hotels & lodges",
      competitorPrice: "₹3,000+/mo elsewhere",
      features: [
        "Manage up to 50 rooms effortlessly",
        "Front desk that runs itself",
        "Bookings & reservations — never double-book",
        "Smooth check-in/check-out in seconds",
        "Housekeeping stays on track automatically",
        "Restaurant POS included — no extra cost",
        "Daily revenue insights at your fingertips",
        "Support via email & live chat",
        "Safe cloud storage (10GB)",
        "GST-compliant billing — automatic",
        "WhatsApp booking confirmations — instant",
      ],
      notIncluded: ["Channel manager (OTAs)", "Revenue optimization AI"],
      popular: false,
      color: "#2D3A5F",
      savings: "Save ₹8,000/year",
      savingsPercent: 33,
      freeBonuses: ["Free Setup", "Free Training"],
    },
    {
      name: "Business",
      icon: <Hotel className="w-6 h-6" />,
      monthlyPrice: 4999,
      yearlyPrice: 39999,
      description: "8 out of 10 hotels choose this plan",
      competitorPrice: "₹8,000+/mo elsewhere",
      features: [
        "Up to 150 rooms — all managed",
        "Everything in Essential, plus more",
        "Full restaurant management included",
        "OTA channels synced automatically",
        "Revenue optimization — maximize ADR",
        "Staff & payroll — one dashboard",
        "Multi-property overview at a glance",
        "AI predicts occupancy — plan smarter",
        "Engage guests via WhatsApp",
        "Priority 24/7 support — always available",
        "Generous cloud storage (100GB)",
        "Banquet & event management built-in",
        "Spa & amenities booking included",
      ],
      notIncluded: ["White-label solution"],
      popular: true,
      color: "#FF6B6B",
      savings: "Save ₹20,000/year",
      savingsPercent: 33,
      freeBonuses: ["Free Setup", "Free Training", "Free Migration"],
    },
    {
      name: "Enterprise",
      icon: <Crown className="w-6 h-6" />,
      monthlyPrice: 9999,
      yearlyPrice: 79999,
      description: "For hotel chains & resorts",
      competitorPrice: "₹15,000+/mo elsewhere",
      features: [
        "Unlimited rooms & properties",
        "Everything in Business, and beyond",
        "Central reservation system — unified",
        "Corporate booking portal for partners",
        "Advanced analytics & business intelligence",
        "Custom integrations — anything you need",
        "Dedicated account manager — personal touch",
        "Full API access — limitless possibilities",
        "White-label — your brand, everywhere",
        "Unlimited storage — never worry",
        "99.9% uptime — guaranteed by SLA",
        "On-site implementation & handholding",
        "Custom development for your unique needs",
      ],
      notIncluded: [],
      popular: false,
      color: "#6BCB77",
      savings: "Save ₹40,000/year",
      savingsPercent: 33,
      freeBonuses: [
        "Free Setup",
        "Free Training",
        "Free Migration",
        "Free 1st Month",
      ],
    },
  ];

  const plans = planType === "restaurant" ? restaurantPlans : hotelPlans;

  // Calculate per-day cost
  const getPerDayPrice = (plan: (typeof restaurantPlans)[0]) => {
    if (isYearly) {
      return Math.round(plan.yearlyPrice / 365);
    }
    return Math.round((plan.monthlyPrice * 12) / 365);
  };

  // Get displayed price (monthly equivalent)
  const getDisplayPrice = (plan: (typeof restaurantPlans)[0]) => {
    return isYearly ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
  };

  return (
    <section
      id="pricing"
      ref={sectionRef}
      className="py-24 bg-gradient-to-b from-[#FFF8F0] to-white dark:from-[#2D3A5F]/30 dark:to-[#1A1A2E] relative overflow-hidden"
    >
      {/* Background decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF6B6B]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#6BCB77]/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-4 ${isVisible ? "animate-fade-in-up" : "opacity-0"}`}
        >
          <span className="inline-block px-4 py-2 bg-[#6BCB77]/10 text-[#6BCB77] text-sm font-semibold rounded-full mb-4">
            SIMPLE, TRANSPARENT PRICING
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#2D3A5F] dark:text-white mb-4">
            <span className="landing-gradient-text">Save 50%+</span> Compared to
            Others
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            Pick from our top 3 best-selling plans — no confusing options.
          </p>
          <p className="text-sm text-[#FF6B6B] font-medium">
            Compare: Petpooja ₹10,000/yr • Restroworks ₹25,000+/yr • Square
            ₹48,000/yr
          </p>
        </div>

        {/* Urgency Banner — Scarcity */}
        <div
          className={`flex justify-center mb-6 ${isVisible ? "animate-fade-in-up animation-delay-100" : "opacity-0"}`}
        >
          <div className="landing-urgency-pulse inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#e85555] text-white rounded-full text-sm font-semibold shadow-lg">
            <Flame className="w-4 h-4" />
            <span>
              🎉 Launch Offer: First month FREE on yearly plans — Limited spots!
            </span>
            <Flame className="w-4 h-4" />
          </div>
        </div>

        {/* Social Proof Counter */}
        <div
          className={`flex justify-center mb-6 ${isVisible ? "animate-fade-in-up animation-delay-100" : "opacity-0"}`}
        >
          <div className="landing-social-proof-counter inline-flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm border border-gray-200 dark:border-gray-700 text-sm">
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-[#6BCB77] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6BCB77]"></span>
            </span>
            <Users className="w-4 h-4 text-[#FF6B6B]" />
            <span className="text-[#2D3A5F] dark:text-gray-200 font-medium">
              <span className="font-bold text-[#FF6B6B]">243 restaurants</span>{" "}
              signed up this month
            </span>
          </div>
        </div>

        {/* Plan Type Toggle */}
        <div
          className={`flex justify-center mb-6 ${isVisible ? "animate-fade-in-up animation-delay-200" : "opacity-0"}`}
        >
          <div className="inline-flex items-center bg-white dark:bg-[#2D3A5F]/50 rounded-full p-1.5 shadow-lg border border-gray-200 dark:border-gray-700">
            <button
              className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                planType === "restaurant"
                  ? "bg-[#2D3A5F] text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:text-[#2D3A5F]"
              }`}
              onClick={() => setPlanType("restaurant")}
            >
              <Zap className="w-4 h-4" />
              Restaurant
            </button>
            <button
              className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                planType === "hotel"
                  ? "bg-[#2D3A5F] text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:text-[#2D3A5F]"
              }`}
              onClick={() => setPlanType("hotel")}
            >
              <Hotel className="w-4 h-4" />
              Restaurant + Hotel
            </button>
          </div>
        </div>

        {/* Billing Toggle */}
        <div
          className={`flex justify-center mb-12 ${isVisible ? "animate-fade-in-up animation-delay-300" : "opacity-0"}`}
        >
          <div className="inline-flex items-center gap-4 bg-white dark:bg-[#2D3A5F]/50 rounded-full p-2 shadow-lg border border-gray-200 dark:border-gray-700">
            <button
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                !isYearly
                  ? "bg-[#FF6B6B] text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:text-[#FF6B6B]"
              }`}
              onClick={() => setIsYearly(false)}
            >
              Monthly
            </button>
            <button
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                isYearly
                  ? "bg-[#FF6B6B] text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:text-[#FF6B6B]"
              }`}
              onClick={() => setIsYearly(true)}
            >
              Yearly
              <span className="landing-savings-badge">Save 33%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative ${isVisible ? "animate-fade-in-up" : "opacity-0"} ${
                plan.popular ? "landing-popular-card-glow lg:-my-4" : ""
              }`}
              style={{ animationDelay: `${index * 150 + 300}ms` }}
            >
              {/* Popular badge + Recommended ribbon */}
              {plan.popular && (
                <>
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20">
                    <span className="px-5 py-2 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white text-sm font-bold rounded-full shadow-lg flex items-center gap-2">
                      <Star className="w-4 h-4 fill-white" />
                      BEST VALUE — Most Popular
                    </span>
                  </div>
                  <div className="landing-recommended-ribbon">
                    <span>Recommended</span>
                  </div>
                </>
              )}

              <div
                className={`h-full bg-white dark:bg-[#2D3A5F]/50 rounded-3xl p-8 border-2 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${
                  plan.popular
                    ? "border-[#FF6B6B] shadow-xl shadow-[#FF6B6B]/10"
                    : "border-gray-200 dark:border-gray-700"
                }`}
              >
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                    }}
                  >
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-[#2D3A5F] dark:text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {plan.description}
                  </p>
                </div>

                {/* Price — Anchoring Bias */}
                <div className="text-center mb-2">
                  {/* Show crossed-out monthly price when on yearly (Anchoring) */}
                  {isYearly && (
                    <div className="mb-1">
                      <span className="landing-price-original text-lg">
                        ₹{plan.monthlyPrice.toLocaleString()}/mo
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-medium text-gray-500">
                      ₹
                    </span>
                    <span className="text-5xl font-bold text-[#2D3A5F] dark:text-white">
                      {getDisplayPrice(plan).toLocaleString()}
                    </span>
                    <span className="text-gray-500">/mo</span>
                  </div>

                  {/* Yearly details with savings */}
                  {isYearly ? (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-gray-500">
                        Billed ₹{plan.yearlyPrice.toLocaleString()}/year
                      </p>
                      <p className="text-sm font-semibold text-[#6BCB77]">
                        {plan.savings} — that's {plan.savingsPercent}% off!
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2">Billed monthly</p>
                  )}

                  {/* Affordability Illusion — Per-day cost */}
                  <div className="mt-2">
                    <span className="landing-perday-price">
                      That's just ₹{getPerDayPrice(plan)}/day — less than a chai
                      ☕
                    </span>
                  </div>

                  {/* Contrast Effect — Competitor pricing */}
                  <div className="mt-2">
                    <span className="text-xs text-gray-400 italic">
                      Others charge {plan.competitorPrice}
                    </span>
                  </div>
                </div>

                {/* CTA Button — Endowment Effect */}
                <div className="mb-6">
                  <Button
                    className={`w-full py-6 rounded-xl font-semibold text-lg transition-all duration-300 ${
                      plan.popular
                        ? "landing-btn-primary"
                        : "bg-[#2D3A5F] hover:bg-[#3d4d7a] text-white"
                    }`}
                    onClick={() => navigate("/auth")}
                  >
                    {plan.popular
                      ? "🚀 Start Your Free Trial Now"
                      : "Start Your Free Trial"}
                  </Button>
                  <p className="text-xs text-center text-gray-400 mt-2">
                    No credit card required • Cancel anytime
                  </p>
                </div>

                {/* Features List — Selling Benefits */}
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    What you'll get:
                  </p>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${plan.color}20` }}
                      >
                        <Check
                          className="w-3 h-3"
                          style={{ color: plan.color }}
                        />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm">
                        {feature}
                      </span>
                    </div>
                  ))}

                  {/* Not included */}
                  {plan.notIncluded.length > 0 && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-4" />
                      {plan.notIncluded.map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 opacity-50"
                        >
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-200 dark:bg-gray-700">
                            <X className="w-3 h-3 text-gray-400" />
                          </div>
                          <span className="text-gray-500 dark:text-gray-500 text-sm line-through">
                            {feature}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* FREE Bonuses — Power of Free */}
                <div className="mt-6 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-semibold text-[#6BCB77] uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5" />
                    FREE Bonuses Included:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {plan.freeBonuses.map((bonus, idx) => (
                      <span
                        key={idx}
                        className="landing-free-badge"
                        style={{ animationDelay: `${idx * 100}ms` }}
                      >
                        ✓ {bonus}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* IKEA Effect — Customization CTA */}
        <div
          className={`mt-12 text-center ${isVisible ? "animate-fade-in-up animation-delay-700" : "opacity-0"}`}
        >
          <div className="inline-flex flex-col items-center gap-3 px-8 py-6 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
            <p className="text-lg font-bold text-[#2D3A5F] dark:text-white">
              Need something custom?{" "}
              <span className="landing-gradient-text">Build Your Own Plan</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mix & match features to create a plan that fits your unique
              restaurant perfectly.
            </p>
            <Button
              variant="outline"
              className="border-2 border-[#2D3A5F] text-[#2D3A5F] hover:bg-[#2D3A5F] hover:text-white dark:border-gray-300 dark:text-gray-200 rounded-xl px-6 py-3 font-semibold"
              onClick={() => navigate("/auth")}
            >
              Contact Sales — Get a Custom Quote
            </Button>
          </div>
        </div>

        {/* Trust Badges */}
        <div
          className={`mt-10 text-center ${isVisible ? "animate-fade-in-up animation-delay-700" : "opacity-0"}`}
        >
          <div className="inline-flex flex-wrap justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm">
              <Shield className="w-5 h-5 text-[#6BCB77]" />
              No Credit Card Required
            </span>
            <span className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm">
              <Check className="w-5 h-5 text-[#6BCB77]" />
              14-Day Free Trial
            </span>
            <span className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm">
              <Check className="w-5 h-5 text-[#6BCB77]" />
              Cancel Anytime — No Questions Asked
            </span>
            <span className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm">
              <Gift className="w-5 h-5 text-[#6BCB77]" />
              Free Setup, Training & Migration
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

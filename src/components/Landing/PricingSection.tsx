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

export type CommitmentTerm = "3m" | "6m" | "12m";

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<CommitmentTerm>("12m");
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
      heroTag: undefined,
      description: "Perfect for small cafes, food trucks & quick-serve counters",
      outlets: "1 Outlet",
      users: "2 Users",
      devices: "1 Device",
      prices: {
        "3m": { total: 799, monthlyEquiv: 266, note: "Billed ₹799 for 3 months" },
        "6m": { total: 1499, monthlyEquiv: 250, note: "Billed ₹1,499 for 6 months", discount: "Save 16%" },
        "12m": { total: 2499, monthlyEquiv: 208, note: "Billed ₹2,499/year", discount: "Save 30%", savings: "Save ₹1,089 vs 3M rate" },
      },
      competitorPrice: "Petpooja charges ₹10,000+/yr",
      features: [
        "1 Outlet • 2 Users • 1 Android Device",
        "Fast POS Billing & GST Invoicing",
        "Digital KOT & Kitchen Display (KDS)",
        "Basic Table & Counter Order Management",
        "Sales Summary & Daily Dashboard",
        "Thermal Printer & Cash Drawer Support",
        "WhatsApp Bill Receipts (Fair-use)",
        "Android Mobile App & Cloud Web App",
        "Standard Email & Chat Support",
      ],
      notIncluded: [
        "Inventory & Stock Alerts",
        "Recipe Costing & Wastage Tracking",
        "WhatsApp Marketing Campaigns",
        "AI Reports & Chat Insights",
        "Multi-Outlet Dashboard",
      ],
      popular: false,
      color: "#2D3A5F",
      freeBonuses: ["Free Menu Upload", "Free Remote Setup"],
    },
    {
      name: "Professional",
      icon: <Star className="w-6 h-6" />,
      heroTag: "⭐ HERO PLAN — BEST VALUE",
      description: "Complete operational control for full-service restaurants & diners",
      outlets: "1 Outlet",
      users: "5 Users",
      devices: "2 Devices",
      prices: {
        "3m": { total: 1299, monthlyEquiv: 433, note: "Billed ₹1,299 for 3 months" },
        "6m": { total: 2499, monthlyEquiv: 416, note: "Billed ₹2,499 for 6 months", discount: "Save 16%" },
        "12m": { total: 4499, monthlyEquiv: 375, note: "Billed ₹4,499/year", discount: "Save 25%", savings: "Save ₹1,489 vs 3M rate" },
      },
      competitorPrice: "RestroSoft / Restroworks charge ₹18,000–₹25,000+/yr",
      features: [
        "Everything in Starter, plus:",
        "1 Outlet • 5 Users • 2 Android Devices",
        "Real-Time Inventory & Low-Stock Alerts",
        "Recipe Management & Automatic Recipe Costing",
        "Kitchen Wastage Tracking (Stops 4-7% leak)",
        "Staff Shift Management & Permissions",
        "Expense Tracker & Profit/Loss Analytics",
        "Full Table Management & Floor Layout",
        "Automated WhatsApp Digital Invoices",
        "WhatsApp Marketing & Customer Loyalty (Limited)",
        "AI Reports & Interactive Chat Insights (Limited)",
        "Priority 24/7 Phone & WhatsApp Support",
      ],
      notIncluded: [
        "Central Multi-Outlet Dashboard",
        "Franchise Royalty Engine",
      ],
      popular: true,
      color: "#FF6B6B",
      freeBonuses: [
        "Free Data Migration from RestroSoft",
        "Live Staff Training",
        "Priority Onboarding",
      ],
    },
    {
      name: "Business",
      icon: <Building2 className="w-6 h-6" />,
      heroTag: undefined,
      description: "For multi-branch restaurant brands managing multiple outlets",
      outlets: "Up to 3 Outlets",
      users: "10 Users",
      devices: "5 Devices",
      prices: {
        "3m": { total: 2099, monthlyEquiv: 700, note: "Billed ₹2,099 for 3 months" },
        "6m": { total: 3999, monthlyEquiv: 666, note: "Billed ₹3,999 for 6 months", discount: "Save 17%" },
        "12m": { total: 6999, monthlyEquiv: 583, note: "Billed ₹6,999/year", discount: "Save 27%", savings: "Save ₹2,589 vs 3M rate" },
      },
      competitorPrice: "Competitors charge ₹25,000+ per outlet",
      features: [
        "Everything in Professional, plus:",
        "Up to 3 Outlets • 10 Users • 5 Android Devices",
        "Central Multi-Outlet HQ Dashboard",
        "Live Branch-by-Branch Comparison & P&L",
        "Inter-Branch Stock Transfers & Requisitions",
        "Higher WhatsApp Marketing Fair-Use Allowance",
        "Higher AI Query & Report Allowance",
        "Custom Reports & Data Export Center",
        "Optional Hotel Room Management Module",
        "Priority Multi-Store Support",
      ],
      notIncluded: [
        "Franchise Royalty & Compliance Engine",
      ],
      popular: false,
      color: "#2E3192",
      freeBonuses: [
        "Free Multi-Store Setup",
        "Menu Sync Across Outlets",
        "Dedicated Account Rep",
      ],
    },
    {
      name: "Franchise",
      icon: <Crown className="w-6 h-6" />,
      heroTag: undefined,
      description: "For expanding franchise networks requiring central governance",
      outlets: "Up to 5 Outlets",
      users: "20 Users",
      devices: "10 Devices",
      prices: {
        "3m": { total: 2499, monthlyEquiv: 833, note: "Billed ₹2,499 for 3 months" },
        "6m": { total: 4799, monthlyEquiv: 800, note: "Billed ₹4,799 for 6 months", discount: "Save 20%" },
        "12m": { total: 8999, monthlyEquiv: 750, note: "Billed ₹8,999/year", discount: "Save 25%", savings: "Save ₹2,989 vs 3M rate" },
      },
      competitorPrice: "Enterprise POS starts at ₹80,000–₹1,50,000+",
      features: [
        "Everything in Business, plus:",
        "Up to 5 Outlets • 20 Users • 10 Android Devices",
        "Franchise Master Dashboard & Central Menu Lock",
        "Automated Franchise Royalty & Revenue Reports",
        "Franchisee Performance Audits & Compliance",
        "Highest Fair-Use Quotas for WhatsApp & AI",
        "Dedicated Senior Account Manager",
        "Guaranteed 99.9% Cloud Uptime SLA",
        "Optional Hotel PMS Suite Compatible",
      ],
      notIncluded: [],
      popular: false,
      color: "#10B981",
      freeBonuses: [
        "Dedicated Account Manager",
        "Custom Franchise SLA",
        "On-Demand Staff Training",
      ],
    },
  ];

  const hotelPlans = [
    {
      name: "Hotel Starter",
      icon: <Building2 className="w-6 h-6" />,
      heroTag: undefined,
      description: "For small hotels, lodges & guest houses with restaurant",
      outlets: "1 Property (up to 25 rooms)",
      users: "4 Users",
      devices: "2 Devices",
      prices: {
        "3m": { total: 1499, monthlyEquiv: 500, note: "Billed ₹1,499 for 3 months" },
        "6m": { total: 2799, monthlyEquiv: 466, note: "Billed ₹2,799 for 6 months", discount: "Save 15%" },
        "12m": { total: 4999, monthlyEquiv: 416, note: "Billed ₹4,999/year", discount: "Save 25%", savings: "Save ₹1,500 vs 3M rate" },
      },
      competitorPrice: "Others charge ₹3,000+/mo for hotel software",
      features: [
        "Manage up to 25 Rooms & Restaurant POS",
        "Front Desk Check-in / Check-out",
        "Housekeeping & Room Status Tracker",
        "GST-Compliant Invoicing & Room Folios",
        "Instant WhatsApp Booking Confirmations",
        "Daily Revenue Insights & Occupancy Rates",
        "Standard Support",
      ],
      notIncluded: ["OTA Channel Manager Sync", "Multi-Property Central Dashboard"],
      popular: false,
      color: "#2D3A5F",
      freeBonuses: ["Free Room Setup", "Staff Training"],
    },
    {
      name: "Hotel Suite Pro",
      icon: <Hotel className="w-6 h-6" />,
      heroTag: "⭐ BEST FOR BOUTIQUE HOTELS",
      description: "Complete PMS + Restaurant POS for hotels up to 75 rooms",
      outlets: "1 Property (up to 75 rooms)",
      users: "10 Users",
      devices: "5 Devices",
      prices: {
        "3m": { total: 2499, monthlyEquiv: 833, note: "Billed ₹2,499 for 3 months" },
        "6m": { total: 4799, monthlyEquiv: 800, note: "Billed ₹4,799 for 6 months", discount: "Save 16%" },
        "12m": { total: 8499, monthlyEquiv: 708, note: "Billed ₹8,499/year", discount: "Save 25%", savings: "Save ₹2,500 vs 3M rate" },
      },
      competitorPrice: "Others charge ₹8,000+/mo for hotel + POS",
      features: [
        "Up to 75 Rooms + Full Restaurant Management",
        "Complete Inventory, Recipe Costing & Stock Tracking",
        "Banquet, Event & Room Service Management",
        "Staff Shift & Attendance Management",
        "WhatsApp Guest Engagement & Digital Bills",
        "AI Occupancy & Revenue Forecasting",
        "Priority 24/7 Phone & WhatsApp Support",
      ],
      notIncluded: ["Multi-Property Central HQ"],
      popular: true,
      color: "#FF6B6B",
      freeBonuses: ["Free Data Setup", "Live Staff Training", "Priority Onboarding"],
    },
    {
      name: "Resort Enterprise",
      icon: <Crown className="w-6 h-6" />,
      heroTag: undefined,
      description: "For hotel chains, resorts & multi-property groups",
      outlets: "Multi-Property (150+ rooms)",
      users: "Unlimited",
      devices: "15 Devices",
      prices: {
        "3m": { total: 4499, monthlyEquiv: 1500, note: "Billed ₹4,499 for 3 months" },
        "6m": { total: 8499, monthlyEquiv: 1416, note: "Billed ₹8,499 for 6 months", discount: "Save 15%" },
        "12m": { total: 14999, monthlyEquiv: 1250, note: "Billed ₹14,999/year", discount: "Save 25%", savings: "Save ₹4,500 vs 3M rate" },
      },
      competitorPrice: "Enterprise hotel software costs ₹50,000+/yr",
      features: [
        "Multi-Property Overview & Central Reservation HQ",
        "Unlimited Rooms & Multiple Restaurant Outlets",
        "Advanced Analytics & Corporate Booking Portal",
        "Custom API Integrations & Export Automation",
        "Dedicated Account Manager & 99.9% Uptime SLA",
        "On-Site Training & Implementation Assistance",
      ],
      notIncluded: [],
      popular: false,
      color: "#10B981",
      freeBonuses: ["Dedicated Account Manager", "Custom Integration", "Executive SLA"],
    },
  ];

  const plans = planType === "restaurant" ? restaurantPlans : hotelPlans;

  // Calculate per-day cost
  const getPerDayPrice = (plan: (typeof restaurantPlans)[0]) => {
    const daysInTerm = selectedTerm === "12m" ? 365 : selectedTerm === "6m" ? 180 : 90;
    return Math.round(plan.prices[selectedTerm].total / daysInTerm);
  };

  // Get displayed price (monthly equivalent)
  const getDisplayPrice = (plan: (typeof restaurantPlans)[0]) => {
    return plan.prices[selectedTerm].monthlyEquiv;
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
            TRANSPARENT COMMERCIAL PRICING
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#2D3A5F] dark:text-white mb-4">
            Starting at Just <span className="landing-gradient-text">₹208/Month</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            No hidden annual maintenance charges (AMC). 30 days free trial on all plans.
          </p>
          <p className="text-sm text-[#FF6B6B] font-medium">
            Compare: Petpooja ₹10,000+/yr • RestroSoft ₹8,000-15,000/yr + AMC • Restroworks ₹25,000+/yr
          </p>
        </div>

        {/* Urgency Banner */}
        <div
          className={`flex justify-center mb-6 ${isVisible ? "animate-fade-in-up animation-delay-100" : "opacity-0"}`}
        >
          <div className="landing-urgency-pulse inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#FF6B6B] to-[#e85555] text-white rounded-full text-sm font-semibold shadow-lg">
            <Flame className="w-4 h-4" />
            <span>
              🎉 Commercial Launch Offer: Full 30-day trial with free menu migration!
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
              <span className="font-bold text-[#FF6B6B]">500+ restaurants</span>{" "}
              trust Swadeshi Solutions across India
            </span>
          </div>
        </div>

        {/* Category Toggle: Restaurant vs Hotel */}
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
              Restaurant Plans
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
              Restaurant + Hotel PMS
            </button>
          </div>
        </div>

        {/* Commitment Term Toggle (3M / 6M / 12M) */}
        <div
          className={`flex flex-col items-center mb-12 ${isVisible ? "animate-fade-in-up animation-delay-300" : "opacity-0"}`}
        >
          <div className="inline-flex items-center gap-2 bg-white dark:bg-[#2D3A5F]/50 rounded-full p-1.5 shadow-lg border border-gray-200 dark:border-gray-700">
            <button
              className={`px-5 py-2 rounded-full font-medium text-sm transition-all duration-300 ${
                selectedTerm === "3m"
                  ? "bg-[#2D3A5F] text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:text-[#2D3A5F]"
              }`}
              onClick={() => setSelectedTerm("3m")}
            >
              3 Months
            </button>
            <button
              className={`px-5 py-2 rounded-full font-medium text-sm transition-all duration-300 flex items-center gap-1.5 ${
                selectedTerm === "6m"
                  ? "bg-[#2D3A5F] text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:text-[#2D3A5F]"
              }`}
              onClick={() => setSelectedTerm("6m")}
            >
              6 Months
              <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                Save ~16%
              </span>
            </button>
            <button
              className={`px-5 py-2 rounded-full font-medium text-sm transition-all duration-300 flex items-center gap-1.5 ${
                selectedTerm === "12m"
                  ? "bg-[#FF6B6B] text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:text-[#FF6B6B]"
              }`}
              onClick={() => setSelectedTerm("12m")}
            >
              Annual (12 Months)
              <span className="landing-savings-badge">
                Save up to 30% ⭐
              </span>
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2.5">
            💡 Choose your term after 30-day free trial • Minimum paid commitment 3 months • Zero AMC lock-in
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${plans.length > 3 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-6 max-w-7xl mx-auto items-stretch`}>
          {plans.map((plan, index) => {
            const currentPricing = plan.prices[selectedTerm];
            const base3mMonthly = plan.prices["3m"].monthlyEquiv;

            return (
              <div
                key={index}
                className={`relative flex flex-col ${isVisible ? "animate-fade-in-up" : "opacity-0"} ${
                  plan.popular ? "landing-popular-card-glow lg:-my-2" : ""
                }`}
                style={{ animationDelay: `${index * 120 + 250}ms` }}
              >
                {/* Hero Badge */}
                {plan.heroTag && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap">
                    <span className="px-4 py-1.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-white" />
                      {plan.heroTag}
                    </span>
                  </div>
                )}

                <div
                  className={`h-full flex flex-col justify-between bg-white dark:bg-[#2D3A5F]/50 rounded-3xl p-6 sm:p-7 border-2 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${
                    plan.popular
                      ? "border-[#FF6B6B] shadow-xl shadow-[#FF6B6B]/10"
                      : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {/* Header */}
                  <div>
                    <div className="text-center mb-5">
                      <div
                        className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white shadow-md"
                        style={{
                          background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                        }}
                      >
                        {plan.icon}
                      </div>
                      <h3 className="text-2xl font-bold text-[#2D3A5F] dark:text-white mb-1">
                        {plan.name}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 text-xs min-h-[32px]">
                        {plan.description}
                      </p>
                    </div>

                    {/* Scope Pills */}
                    <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                        {plan.outlets}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {plan.users}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {plan.devices}
                      </span>
                    </div>

                    {/* Price Section */}
                    <div className="text-center mb-5 p-3 rounded-2xl bg-gray-50/80 dark:bg-black/20 border border-gray-100 dark:border-gray-800">
                      {selectedTerm !== "3m" && (
                        <div className="mb-0.5">
                          <span className="landing-price-original text-xs line-through text-gray-400">
                            ₹{base3mMonthly}/mo
                          </span>
                        </div>
                      )}
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-xl font-medium text-gray-500">
                          ₹
                        </span>
                        <span className="text-4xl font-extrabold text-[#2D3A5F] dark:text-white">
                          {getDisplayPrice(plan).toLocaleString()}
                        </span>
                        <span className="text-gray-500 text-xs font-semibold">/mo</span>
                      </div>

                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {currentPricing.note}
                        </p>
                        {"discount" in currentPricing && (
                          <p className="text-xs font-bold text-[#6BCB77]">
                            {currentPricing.discount} off vs baseline!
                          </p>
                        )}
                      </div>

                      <div className="mt-2 pt-2 border-t border-gray-200/60 dark:border-gray-700/60">
                        <span className="landing-perday-price text-[11px]">
                          ≈ ₹{getPerDayPrice(plan)}/day — less than a chai ☕
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="text-[10px] text-gray-400 italic block">
                          {plan.competitorPrice}
                        </span>
                      </div>
                    </div>

                    {/* CTA Button */}
                    <div className="mb-5">
                      <Button
                        className={`w-full py-5 rounded-xl font-semibold text-sm transition-all duration-300 shadow-md ${
                          plan.popular
                            ? "landing-btn-primary"
                            : "bg-[#2D3A5F] hover:bg-[#3d4d7a] text-white"
                        }`}
                        onClick={() => navigate("/auth")}
                      >
                        {plan.popular
                          ? "🚀 Start 30-Day Free Trial"
                          : "Start 30-Day Free Trial"}
                      </Button>
                      <p className="text-[10px] text-center text-gray-400 mt-1.5">
                        No credit card • 1-click menu setup
                      </p>
                    </div>

                    {/* Features List */}
                    <div className="space-y-2 text-left">
                      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Included Features:
                      </p>
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ backgroundColor: `${plan.color}20` }}
                          >
                            <Check
                              className="w-2.5 h-2.5"
                              style={{ color: plan.color }}
                            />
                          </div>
                          <span className="text-gray-700 dark:text-gray-300 text-xs leading-tight">
                            {feature}
                          </span>
                        </div>
                      ))}

                      {/* Not Included */}
                      {plan.notIncluded.length > 0 && (
                        <>
                          <div className="border-t border-gray-200 dark:border-gray-700 my-3" />
                          {plan.notIncluded.map((feature, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 opacity-50"
                            >
                              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-200 dark:bg-gray-700">
                                <X className="w-2.5 h-2.5 text-gray-400" />
                              </div>
                              <span className="text-gray-400 dark:text-gray-500 text-xs line-through leading-tight">
                                {feature}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Free Bonuses */}
                  <div className="mt-5 pt-3 border-t border-dashed border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] font-bold text-[#6BCB77] uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Gift className="w-3 h-3" />
                      Free Bonuses:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.freeBonuses.map((bonus, idx) => (
                        <span
                          key={idx}
                          className="landing-free-badge text-[10px] py-0.5 px-2"
                        >
                          ✓ {bonus}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Franchise / Multi-Location Quote CTA */}
        <div
          className={`mt-14 text-center ${isVisible ? "animate-fade-in-up animation-delay-700" : "opacity-0"}`}
        >
          <div className="inline-flex flex-col items-center gap-3 px-8 py-6 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">
            <p className="text-lg font-bold text-[#2D3A5F] dark:text-white">
              Running More Than 5 Outlets or Need a Custom Franchise Package?
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We provide tailored solutions with custom API integrations, enterprise SLAs, and on-site training.
            </p>
            <Button
              variant="outline"
              className="border-2 border-[#2D3A5F] text-[#2D3A5F] hover:bg-[#2D3A5F] hover:text-white dark:border-gray-300 dark:text-gray-200 rounded-xl px-6 py-3 font-semibold text-sm"
              onClick={() => navigate("/auth")}
            >
              Contact Enterprise Sales — Custom Franchise Quote
            </Button>
          </div>
        </div>

        {/* Trust Badges */}
        <div
          className={`mt-10 text-center ${isVisible ? "animate-fade-in-up animation-delay-700" : "opacity-0"}`}
        >
          <div className="inline-flex flex-wrap justify-center gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm">
              <Shield className="w-4 h-4 text-[#6BCB77]" />
              No Credit Card Required
            </span>
            <span className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm">
              <Check className="w-4 h-4 text-[#6BCB77]" />
              30-Day Full Free Trial
            </span>
            <span className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm">
              <Check className="w-4 h-4 text-[#6BCB77]" />
              Cancel Anytime — Zero AMC Lock-in
            </span>
            <span className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm">
              <Gift className="w-4 h-4 text-[#6BCB77]" />
              Free Menu Migration from RestroSoft
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};


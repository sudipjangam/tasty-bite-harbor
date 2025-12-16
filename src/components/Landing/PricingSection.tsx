import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Check, Star, Crown, Zap, Building2, Hotel, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isYearly, setIsYearly] = useState(true); // Default to yearly for better value
  const [planType, setPlanType] = useState<'restaurant' | 'hotel'>('restaurant');
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const restaurantPlans = [
    {
      name: 'Starter',
      icon: <Zap className="w-6 h-6" />,
      monthlyPrice: 999,
      yearlyPrice: 7999,
      description: 'Perfect for small restaurants & cafes',
      features: [
        'Up to 2 users',
        'Basic POS system',
        'Table management',
        'Inventory tracking',
        'Daily reports & analytics',
        'Email support',
        '1 location',
        'Cloud storage (5GB)',
        'GST-compliant billing',
        'Basic WhatsApp notifications',
      ],
      notIncluded: [
        'Multi-location',
        'AI analytics',
        'Staff management',
      ],
      popular: false,
      color: '#2D3A5F',
      savings: 'Save ₹4,000/year',
    },
    {
      name: 'Growth',
      icon: <Star className="w-6 h-6" />,
      monthlyPrice: 2499,
      yearlyPrice: 19999,
      description: 'Best for growing restaurants',
      features: [
        'Up to 10 users',
        'Advanced POS with QSR mode',
        'Full inventory & purchasing',
        'Staff scheduling & attendance',
        'CRM & loyalty programs',
        'WhatsApp order updates',
        'AI-powered analytics',
        'Priority support (24/7)',
        'Up to 3 locations',
        'Cloud storage (50GB)',
        'Custom reports',
        'Zomato/Swiggy integration',
        'Kitchen Display System (KDS)',
      ],
      notIncluded: [
        'White-label',
        'API access',
      ],
      popular: true,
      color: '#FF6B6B',
      savings: 'Save ₹10,000/year',
    },
    {
      name: 'Professional',
      icon: <Crown className="w-6 h-6" />,
      monthlyPrice: 4999,
      yearlyPrice: 39999,
      description: 'For chains & franchises',
      features: [
        'Unlimited users',
        'Everything in Growth',
        'Unlimited locations',
        'Advanced revenue management',
        'Custom integrations',
        'Dedicated account manager',
        'WhatsApp marketing campaigns',
        'Advanced AI insights & forecasting',
        'API access',
        'White-label options',
        'Unlimited storage',
        'SLA guarantee (99.9%)',
        'On-site training',
        'ONDC integration',
      ],
      notIncluded: [],
      popular: false,
      color: '#6BCB77',
      savings: 'Save ₹20,000/year',
    },
  ];

  const hotelPlans = [
    {
      name: 'Essential',
      icon: <Building2 className="w-6 h-6" />,
      monthlyPrice: 1999,
      yearlyPrice: 15999,
      description: 'For small hotels & lodges',
      features: [
        'Up to 50 rooms',
        'Front desk management',
        'Room booking & reservations',
        'Guest check-in/check-out',
        'Housekeeping management',
        'Basic restaurant POS',
        'Daily reports',
        'Email & chat support',
        'Cloud storage (10GB)',
        'GST-compliant billing',
        'WhatsApp booking confirmations',
      ],
      notIncluded: [
        'Channel manager',
        'Revenue management',
      ],
      popular: false,
      color: '#2D3A5F',
      savings: 'Save ₹8,000/year',
    },
    {
      name: 'Business',
      icon: <Hotel className="w-6 h-6" />,
      monthlyPrice: 4999,
      yearlyPrice: 39999,
      description: 'Most popular for hotels',
      features: [
        'Up to 150 rooms',
        'Everything in Essential',
        'Full restaurant management',
        'Channel manager (OTAs)',
        'Revenue management',
        'Staff & payroll management',
        'Multi-property dashboard',
        'AI occupancy forecasting',
        'WhatsApp guest engagement',
        'Priority support (24/7)',
        'Cloud storage (100GB)',
        'Banquet & event management',
        'Spa & amenities booking',
      ],
      notIncluded: [
        'White-label',
      ],
      popular: true,
      color: '#FF6B6B',
      savings: 'Save ₹20,000/year',
    },
    {
      name: 'Enterprise',
      icon: <Crown className="w-6 h-6" />,
      monthlyPrice: 9999,
      yearlyPrice: 79999,
      description: 'For hotel chains & resorts',
      features: [
        'Unlimited rooms & properties',
        'Everything in Business',
        'Central reservation system',
        'Corporate booking portal',
        'Advanced analytics & BI',
        'Custom integrations',
        'Dedicated account manager',
        'API access',
        'White-label solution',
        'Unlimited storage',
        'SLA guarantee (99.9%)',
        'On-site implementation',
        'Custom development',
      ],
      notIncluded: [],
      popular: false,
      color: '#6BCB77',
      savings: 'Save ₹40,000/year',
    },
  ];

  const plans = planType === 'restaurant' ? restaurantPlans : hotelPlans;

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
        <div className={`text-center max-w-3xl mx-auto mb-8 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="inline-block px-4 py-2 bg-[#6BCB77]/10 text-[#6BCB77] text-sm font-semibold rounded-full mb-4">
            AFFORDABLE PRICING
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#2D3A5F] dark:text-white mb-4">
            <span className="landing-gradient-text">50% Cheaper</span> Than Competitors
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            Premium features at prices that make sense for Indian businesses
          </p>
          <p className="text-sm text-[#FF6B6B] font-medium">
            Compare: Petpooja ₹10,000/yr • Restroworks ₹25,000+/yr • Square ₹48,000/yr
          </p>
        </div>

        {/* Plan Type Toggle */}
        <div className={`flex justify-center mb-6 ${isVisible ? 'animate-fade-in-up animation-delay-100' : 'opacity-0'}`}>
          <div className="inline-flex items-center bg-white dark:bg-[#2D3A5F]/50 rounded-full p-1.5 shadow-lg border border-gray-200 dark:border-gray-700">
            <button
              className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                planType === 'restaurant' 
                  ? 'bg-[#2D3A5F] text-white shadow-md' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-[#2D3A5F]'
              }`}
              onClick={() => setPlanType('restaurant')}
            >
              <Zap className="w-4 h-4" />
              Restaurant
            </button>
            <button
              className={`px-6 py-2.5 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                planType === 'hotel' 
                  ? 'bg-[#2D3A5F] text-white shadow-md' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-[#2D3A5F]'
              }`}
              onClick={() => setPlanType('hotel')}
            >
              <Hotel className="w-4 h-4" />
              Restaurant + Hotel
            </button>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className={`flex justify-center mb-12 ${isVisible ? 'animate-fade-in-up animation-delay-200' : 'opacity-0'}`}>
          <div className="inline-flex items-center gap-4 bg-white dark:bg-[#2D3A5F]/50 rounded-full p-2 shadow-lg border border-gray-200 dark:border-gray-700">
            <button
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                !isYearly 
                  ? 'bg-[#FF6B6B] text-white shadow-md' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-[#FF6B6B]'
              }`}
              onClick={() => setIsYearly(false)}
            >
              Monthly
            </button>
            <button
              className={`px-6 py-2 rounded-full font-medium transition-all duration-300 flex items-center gap-2 ${
                isYearly 
                  ? 'bg-[#FF6B6B] text-white shadow-md' 
                  : 'text-gray-600 dark:text-gray-300 hover:text-[#FF6B6B]'
              }`}
              onClick={() => setIsYearly(true)}
            >
              Yearly
              <span className="px-2 py-0.5 bg-[#6BCB77] text-white text-xs rounded-full">Best Value</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
              style={{ animationDelay: `${index * 150 + 300}ms` }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <span className="px-4 py-1.5 bg-gradient-to-r from-[#FF6B6B] to-[#FF8E8E] text-white text-sm font-semibold rounded-full shadow-lg flex items-center gap-1">
                    <Star className="w-4 h-4 fill-white" />
                    Most Popular
                  </span>
                </div>
              )}

              <div 
                className={`h-full bg-white dark:bg-[#2D3A5F]/50 rounded-3xl p-8 border-2 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${
                  plan.popular 
                    ? 'border-[#FF6B6B] shadow-xl shadow-[#FF6B6B]/10' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Plan Header */}
                <div className="text-center mb-6">
                  <div 
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)` }}
                  >
                    {plan.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-[#2D3A5F] dark:text-white mb-1">{plan.name}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-2xl font-medium text-gray-500">₹</span>
                    <span className="text-5xl font-bold text-[#2D3A5F] dark:text-white">
                      {isYearly 
                        ? Math.round(plan.yearlyPrice / 12).toLocaleString()
                        : plan.monthlyPrice.toLocaleString()
                      }
                    </span>
                    <span className="text-gray-500">/mo</span>
                  </div>
                  {isYearly ? (
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Billed ₹{plan.yearlyPrice.toLocaleString()}/year
                      </p>
                      <p className="text-sm font-semibold text-[#6BCB77]">
                        {plan.savings}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-2">Billed monthly</p>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  className={`w-full py-6 rounded-xl font-semibold text-lg mb-6 transition-all duration-300 ${
                    plan.popular
                      ? 'landing-btn-primary'
                      : 'bg-[#2D3A5F] hover:bg-[#3d4d7a] text-white'
                  }`}
                  onClick={() => navigate('/auth')}
                >
                  Start 14-Day Free Trial
                </Button>

                {/* Features List */}
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What's included:</p>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: `${plan.color}20` }}
                      >
                        <Check className="w-3 h-3" style={{ color: plan.color }} />
                      </div>
                      <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                    </div>
                  ))}
                  
                  {/* Not included */}
                  {plan.notIncluded.length > 0 && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-4" />
                      {plan.notIncluded.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 opacity-50">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-200 dark:bg-gray-700">
                            <X className="w-3 h-3 text-gray-400" />
                          </div>
                          <span className="text-gray-500 dark:text-gray-500 text-sm line-through">{feature}</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Badges */}
        <div className={`mt-16 text-center ${isVisible ? 'animate-fade-in-up animation-delay-700' : 'opacity-0'}`}>
          <div className="inline-flex flex-wrap justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm">
              <Check className="w-5 h-5 text-[#6BCB77]" />
              No Credit Card Required
            </span>
            <span className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm">
              <Check className="w-5 h-5 text-[#6BCB77]" />
              14-Day Free Trial
            </span>
            <span className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm">
              <Check className="w-5 h-5 text-[#6BCB77]" />
              Cancel Anytime
            </span>
            <span className="flex items-center gap-2 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/50 rounded-full shadow-sm">
              <Check className="w-5 h-5 text-[#6BCB77]" />
              Free Setup & Training
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

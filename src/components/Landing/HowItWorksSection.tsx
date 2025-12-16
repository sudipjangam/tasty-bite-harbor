import React, { useEffect, useRef, useState } from 'react';
import { UserPlus, Settings, ShoppingCart, TrendingUp } from 'lucide-react';

export const HowItWorksSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      icon: <UserPlus className="w-8 h-8" />,
      number: '01',
      title: 'Sign Up in Minutes',
      description: 'Create your account and set up your restaurant profile. No credit card required for the free trial.',
      color: '#FF6B6B',
    },
    {
      icon: <Settings className="w-8 h-8" />,
      number: '02',
      title: 'Configure Your Menu',
      description: 'Add your menu items, set prices, and customize categories. Our smart importer makes it easy.',
      color: '#2D3A5F',
    },
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      number: '03',
      title: 'Start Taking Orders',
      description: 'Accept orders from dine-in, takeaway, and delivery channels through a unified interface.',
      color: '#6BCB77',
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      number: '04',
      title: 'Grow Your Business',
      description: 'Use AI-powered analytics to optimize operations, reduce waste, and increase profitability.',
      color: '#FFD93D',
    },
  ];

  return (
    <section ref={sectionRef} className="py-24 bg-white dark:bg-[#1A1A2E] relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#FF6B6B]/5 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-[#6BCB77]/5 to-transparent rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="inline-block px-4 py-2 bg-[#FF6B6B]/10 text-[#FF6B6B] text-sm font-semibold rounded-full mb-4">
            HOW IT WORKS
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#2D3A5F] dark:text-white mb-6">
            Get Started in <span className="landing-gradient-text">4 Simple Steps</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            From signup to your first order in under 30 minutes. We've made it incredibly simple.
          </p>
        </div>

        {/* Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connecting Line */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B6B] via-[#2D3A5F] via-50% to-[#6BCB77]" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`relative ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}
                style={{ animationDelay: `${index * 150}ms` }}
              >
                {/* Step Card */}
                <div className="bg-white dark:bg-[#2D3A5F]/50 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100 dark:border-gray-700 h-full">
                  {/* Icon Container */}
                  <div className="relative mb-6">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg mx-auto lg:mx-0"
                      style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}dd)` }}
                    >
                      {step.icon}
                    </div>
                    {/* Step Number */}
                    <div 
                      className="absolute -top-2 -right-2 lg:right-auto lg:-left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ backgroundColor: step.color }}
                    >
                      {step.number.slice(-1)}
                    </div>
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-[#2D3A5F] dark:text-white mb-3 text-center lg:text-left">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-center lg:text-left leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-20 -right-4 z-10">
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path 
                        d="M8 16H24M24 16L18 10M24 16L18 22" 
                        stroke={step.color}
                        strokeWidth="2.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

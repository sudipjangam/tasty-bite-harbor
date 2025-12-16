import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, CheckCircle, Star, Utensils, ChefHat, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Stats with animated counting
  const stats = [
    { number: '500+', label: 'Happy Restaurants', delay: 0 },
    { number: '1M+', label: 'Orders Processed', delay: 100 },
    { number: '99.9%', label: 'Uptime Guarantee', delay: 200 },
    { number: '4.9★', label: 'Customer Rating', delay: 300 },
  ];

  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Animated Background */}
      <div className="absolute inset-0 landing-hero-bg">
        {/* Decorative blobs */}
        <div className="absolute top-20 right-10 w-72 h-72 landing-blob-1 rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-20 left-10 w-96 h-96 landing-blob-2 rounded-full blur-3xl opacity-50" />
        <div className="absolute top-1/2 left-1/3 w-64 h-64 landing-blob-3 rounded-full blur-3xl opacity-40" />
        
        {/* Floating decorative elements */}
        <div className="absolute top-32 left-20 animate-float-slow animation-delay-500">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF6B6B] to-[#FF8E8E] flex items-center justify-center shadow-lg">
            <Utensils className="w-8 h-8 text-white" />
          </div>
        </div>
        <div className="absolute top-40 right-32 animate-float animation-delay-1000">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#6BCB77] to-[#4CAF50] flex items-center justify-center shadow-lg">
            <ChefHat className="w-7 h-7 text-white" />
          </div>
        </div>
        <div className="absolute bottom-40 right-20 animate-float-slow animation-delay-1500">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#FFD93D] to-[#FFC107] flex items-center justify-center shadow-lg">
            <Receipt className="w-6 h-6 text-[#2D3A5F]" />
          </div>
        </div>
        <div className="absolute bottom-60 left-32 animate-float animation-delay-2000">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2D3A5F] to-[#3d4d7a] flex items-center justify-center shadow-lg">
            <Star className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className={`space-y-8 ${isVisible ? 'animate-fade-in-left' : 'opacity-0'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/80 dark:bg-[#2D3A5F]/80 backdrop-blur-sm rounded-full shadow-md border border-[#FF6B6B]/20">
              <span className="flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-[#6BCB77] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#6BCB77]"></span>
              </span>
              <span className="text-sm font-semibold text-[#2D3A5F] dark:text-gray-200">
                #1 Restaurant Management Platform in India
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                <span className="text-[#2D3A5F] dark:text-white">Run Your</span>
                <br />
                <span className="landing-gradient-text">Restaurant</span>
                <br />
                <span className="text-[#2D3A5F] dark:text-white">Like a Pro</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-lg leading-relaxed">
                All-in-one platform to manage orders, inventory, staff, and analytics. 
                Trusted by <span className="font-semibold text-[#FF6B6B]">500+ restaurants</span> across India.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="landing-btn-primary text-lg px-8 py-6 rounded-2xl font-semibold group"
                onClick={() => navigate('/auth')}
              >
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 rounded-2xl font-semibold border-2 border-[#2D3A5F] text-[#2D3A5F] hover:bg-[#2D3A5F] hover:text-white dark:border-gray-300 dark:text-gray-200 dark:hover:bg-gray-200 dark:hover:text-[#2D3A5F] group"
              >
                <Play className="mr-2 w-5 h-5 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap gap-6 pt-4">
              {['No credit card required', '14-day free trial', 'Cancel anytime'].map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-5 h-5 text-[#6BCB77]" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className={`relative ${isVisible ? 'animate-fade-in-right animation-delay-300' : 'opacity-0'}`}>
            {/* Dashboard Mockup */}
            <div className="relative">
              {/* Main Dashboard Card */}
              <div className="landing-glass-card rounded-3xl p-6 shadow-2xl">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl landing-coral-gradient flex items-center justify-center">
                      <Utensils className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#2D3A5F] dark:text-white">RMS Pro Dashboard</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Real-time Overview</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#FF6B6B]" />
                    <div className="w-3 h-3 rounded-full bg-[#FFD93D]" />
                    <div className="w-3 h-3 rounded-full bg-[#6BCB77]" />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[
                    { label: "Today's Sales", value: '₹45,230', change: '+12%', color: '#6BCB77' },
                    { label: 'Active Orders', value: '24', change: 'Live', color: '#FF6B6B' },
                    { label: 'Tables Occupied', value: '18/25', change: '72%', color: '#FFD93D' },
                    { label: 'Staff Online', value: '12', change: 'Active', color: '#2D3A5F' },
                  ].map((stat, index) => (
                    <div 
                      key={index}
                      className="bg-white/60 dark:bg-[#2D3A5F]/40 rounded-xl p-4 border border-gray-100 dark:border-gray-700"
                    >
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-[#2D3A5F] dark:text-white">{stat.value}</p>
                      <span 
                        className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
                      >
                        {stat.change}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Mini Chart Placeholder */}
                <div className="bg-gradient-to-r from-[#FF6B6B]/10 to-[#6BCB77]/10 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-[#2D3A5F] dark:text-gray-200">Revenue Trend</span>
                    <span className="text-xs text-[#6BCB77] font-medium">↑ 23% this week</span>
                  </div>
                  <div className="flex items-end gap-2 h-16">
                    {[40, 65, 45, 80, 55, 90, 75].map((height, i) => (
                      <div 
                        key={i}
                        className="flex-1 rounded-t-md landing-coral-gradient opacity-80 hover:opacity-100 transition-opacity"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating Notification Cards */}
              <div className="absolute -right-6 top-20 animate-float-slow animation-delay-700">
                <div className="bg-white dark:bg-[#2D3A5F] rounded-xl p-3 shadow-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#6BCB77]/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-[#6BCB77]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#2D3A5F] dark:text-white">New Order #1234</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">Just now</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -left-6 bottom-24 animate-float animation-delay-1000">
                <div className="bg-white dark:bg-[#2D3A5F] rounded-xl p-3 shadow-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#FFD93D]/20 flex items-center justify-center">
                      <Star className="w-4 h-4 text-[#FFD93D]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#2D3A5F] dark:text-white">5-star Review!</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">From Table 7</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className={`mt-20 ${isVisible ? 'animate-fade-in-up animation-delay-500' : 'opacity-0'}`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div 
                key={index}
                className="text-center p-6 landing-glass-card rounded-2xl landing-card-hover"
                style={{ animationDelay: `${stat.delay}ms` }}
              >
                <div className="text-4xl font-bold landing-stat-number mb-2">{stat.number}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wave Divider */}
      <div className="landing-wave-divider">
        <svg 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none"
          className="fill-white dark:fill-[#1A1A2E]"
        >
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C57.1,118.92,156.63,69.08,321.39,56.44Z"></path>
        </svg>
      </div>
    </section>
  );
};

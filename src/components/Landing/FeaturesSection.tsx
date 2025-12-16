import React, { useEffect, useRef, useState } from 'react';
import { 
  ShoppingCart, 
  Users, 
  BarChart3, 
  Package, 
  CalendarDays, 
  DollarSign,
  Sparkles,
  Smartphone,
  Shield,
  Zap,
  Cloud,
  HeartHandshake
} from 'lucide-react';

export const FeaturesSection: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
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

  const features = [
    {
      icon: <ShoppingCart className="w-7 h-7" />,
      title: 'Multi-Channel POS',
      description: 'Unified POS for dine-in, QSR, delivery, and takeaway with seamless order management.',
      color: '#FF6B6B',
      size: 'large',
    },
    {
      icon: <BarChart3 className="w-7 h-7" />,
      title: 'AI-Powered Analytics',
      description: 'Real-time insights and predictive analytics for data-driven decisions.',
      color: '#2D3A5F',
      size: 'normal',
    },
    {
      icon: <Package className="w-7 h-7" />,
      title: 'Smart Inventory',
      description: 'Automated stock tracking, low-stock alerts, and intelligent reordering.',
      color: '#6BCB77',
      size: 'normal',
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: 'Staff Management',
      description: 'Complete HR solution with time tracking, scheduling, and payroll.',
      color: '#FFD93D',
      size: 'large',
    },
    {
      icon: <DollarSign className="w-7 h-7" />,
      title: 'Financial Suite',
      description: 'Invoicing, expense tracking, P&L statements, and GST reporting.',
      color: '#FF6B6B',
      size: 'normal',
    },
    {
      icon: <CalendarDays className="w-7 h-7" />,
      title: 'Reservations & CRM',
      description: 'Table bookings, guest profiles, and loyalty programs.',
      color: '#2D3A5F',
      size: 'normal',
    },
    {
      icon: <Sparkles className="w-7 h-7" />,
      title: 'Marketing Automation',
      description: 'WhatsApp campaigns, customer segmentation, and promotional tools.',
      color: '#6BCB77',
      size: 'large',
    },
    {
      icon: <Smartphone className="w-7 h-7" />,
      title: 'Mobile & Web Access',
      description: 'Access from anywhere with responsive design.',
      color: '#FF6B6B',
      size: 'normal',
    },
    {
      icon: <Shield className="w-7 h-7" />,
      title: 'Enterprise Security',
      description: 'Bank-grade encryption and role-based access control.',
      color: '#2D3A5F',
      size: 'normal',
    },
    {
      icon: <Zap className="w-7 h-7" />,
      title: 'Lightning Fast',
      description: 'Optimized performance with sub-second response times.',
      color: '#FFD93D',
      size: 'normal',
    },
    {
      icon: <Cloud className="w-7 h-7" />,
      title: 'Cloud-Based',
      description: 'No servers to manage. 99.9% uptime guaranteed.',
      color: '#6BCB77',
      size: 'normal',
    },
    {
      icon: <HeartHandshake className="w-7 h-7" />,
      title: '24/7 Support',
      description: 'Dedicated support team available round-the-clock.',
      color: '#FF6B6B',
      size: 'normal',
    },
  ];

  return (
    <section 
      id="features" 
      ref={sectionRef}
      className="py-24 bg-gradient-to-b from-white via-[#FFF8F0]/50 to-white dark:from-[#1A1A2E] dark:via-[#2D3A5F]/20 dark:to-[#1A1A2E] relative overflow-hidden"
    >
      {/* Background Decorations */}
      <div className="absolute top-1/4 left-0 w-72 h-72 bg-[#FF6B6B]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-0 w-72 h-72 bg-[#6BCB77]/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className={`text-center max-w-3xl mx-auto mb-16 ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}`}>
          <span className="inline-block px-4 py-2 bg-[#2D3A5F]/10 dark:bg-[#2D3A5F]/30 text-[#2D3A5F] dark:text-white text-sm font-semibold rounded-full mb-4">
            POWERFUL FEATURES
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-[#2D3A5F] dark:text-white mb-6">
            Everything You Need to <span className="landing-gradient-text">Succeed</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            A comprehensive platform built specifically for Indian restaurants and hotels
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`
                ${feature.size === 'large' ? 'md:col-span-2' : ''}
                ${isVisible ? 'animate-fade-in-up' : 'opacity-0'}
              `}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div 
                className="group h-full bg-white dark:bg-[#2D3A5F]/30 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 
                          hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 cursor-pointer
                          relative overflow-hidden"
              >
                {/* Hover gradient overlay */}
                <div 
                  className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-500"
                  style={{ background: `linear-gradient(135deg, ${feature.color}, transparent)` }}
                />

                <div className="relative z-10 flex flex-col h-full">
                  {/* Icon */}
                  <div 
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-white mb-4 
                              group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${feature.color}, ${feature.color}cc)` }}
                  >
                    {feature.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-[#2D3A5F] dark:text-white mb-2 group-hover:text-[#FF6B6B] transition-colors duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed flex-grow">
                    {feature.description}
                  </p>

                  {/* Learn more link */}
                  <div className="mt-4 flex items-center gap-2 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ color: feature.color }}>
                    <span>Learn more</span>
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Features List */}
        <div className={`text-center mt-16 ${isVisible ? 'animate-fade-in-up animation-delay-500' : 'opacity-0'}`}>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            And many more features to help you grow
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {['Kitchen Display System', 'QR Code Menus', 'UPI Payments', 'Channel Management', 'Recipe Costing', 'Multi-location Support'].map((item, index) => (
              <span 
                key={index}
                className="px-4 py-2 bg-white dark:bg-[#2D3A5F]/30 rounded-full border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#FF6B6B] hover:text-[#FF6B6B] transition-colors cursor-pointer"
              >
                ✓ {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
